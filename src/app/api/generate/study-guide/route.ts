import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/db";
import { docLines, assetChunks, spaceResources, knowledgeItems } from "@/db/schema";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { resolveFolder } from "@/lib/resolve-folder";
import { eq, inArray } from "drizzle-orm";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/generate/study-guide — Generate a structured study guide from resources.
 * Body: { spaceId: string, topic?: string }
 */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const plan = await getUserPlan(userId);

  const quotaResult = await consumeQuota(userId, "ai_msgs", plan);
  if (!quotaResult.allowed) {
    return NextResponse.json(
      { error: "Daily AI limit reached", limit: quotaResult.limit },
      { status: 429 }
    );
  }

  const { spaceId, topic, folderId, assetIds } = await req.json();
  if (!spaceId) {
    return NextResponse.json(
      { error: "spaceId is required" },
      { status: 400 }
    );
  }

  let context = "";

  // Priority 1: Use explicit asset IDs if provided (user selected specific docs)
  if (assetIds && assetIds.length > 0) {
    context = await getAssetContext(assetIds);
  }

  // Priority 2: Try space resources
  if (!context) {
    context = await getSpaceContext(spaceId);
  }

  // Priority 3: Fallback to folder knowledge (only if no explicit selection)
  if (!context && folderId && (!assetIds || assetIds.length === 0)) {
    const realFolderId = await resolveFolder(folderId, userId);
    context = await getFolderContext(realFolderId);
  }

  if (!context) {
    return NextResponse.json(
      { error: "No content available to generate study guide from" },
      { status: 400 }
    );
  }

  const topicInstruction = topic
    ? `Focus specifically on: ${topic}`
    : "Cover the main topics comprehensively.";

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You create structured study guides from educational material. Output ONLY a valid JSON array of line objects. No markdown code fences, no explanation — just the raw JSON array.`,
    prompt: `Create a comprehensive study guide from this material. ${topicInstruction}

Material:
${context}

Output a JSON array with this exact format:
[
  {"type": "h1", "text": "Main Topic Title"},
  {"type": "h2", "text": "Subtopic"},
  {"type": "bullet", "text": "Key point or definition"},
  {"type": "plain", "text": "Explanation paragraph with details"},
  {"type": "h2", "text": "Another Subtopic"},
  {"type": "bullet", "text": "Important fact"},
  ...
]

Valid types: h1, h2, h3, bullet, number, quote, plain. Include at least 15-25 items covering the material thoroughly.`,
  });

  let lines: { type: string; text: string }[];
  try {
    lines = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      lines = JSON.parse(match[0]);
    } else {
      return NextResponse.json(
        { error: "Failed to parse study guide" },
        { status: 500 }
      );
    }
  }

  const validTypes = ["h1", "h2", "h3", "bullet", "number", "quote", "plain", "table"];
  const inserted = await db
    .insert(docLines)
    .values(
      lines
        .filter((l) => validTypes.includes(l.type))
        .map((line, index) => ({
          spaceId,
          orderIndex: index,
          type: line.type as "h1" | "h2" | "h3" | "bullet" | "number" | "quote" | "plain" | "table",
          text: line.text,
        }))
    )
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}

async function getAssetContext(assetIds: string[]): Promise<string> {
  if (assetIds.length === 0) return "";

  const chunks = await db
    .select({ content: assetChunks.content })
    .from(assetChunks)
    .where(inArray(assetChunks.assetId, assetIds))
    .limit(20);

  return chunks.map((c) => c.content).join("\n\n");
}

async function getSpaceContext(spaceId: string): Promise<string> {
  const resources = await db
    .select({ assetId: spaceResources.assetId })
    .from(spaceResources)
    .where(eq(spaceResources.spaceId, spaceId));

  const assetIds = resources.map((r) => r.assetId);
  if (assetIds.length === 0) return "";

  const chunks = await db
    .select({ content: assetChunks.content })
    .from(assetChunks)
    .where(inArray(assetChunks.assetId, assetIds))
    .limit(15);

  return chunks.map((c) => c.content).join("\n\n");
}

async function getFolderContext(folderId: string): Promise<string> {
  const items = await db
    .select({ assetId: knowledgeItems.assetId })
    .from(knowledgeItems)
    .where(eq(knowledgeItems.folderId, folderId));

  const assetIds = items.map((i) => i.assetId);
  if (assetIds.length === 0) return "";

  const chunks = await db
    .select({ content: assetChunks.content })
    .from(assetChunks)
    .where(inArray(assetChunks.assetId, assetIds))
    .limit(20);

  return chunks.map((c) => c.content).join("\n\n");
}
