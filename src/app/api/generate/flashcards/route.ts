import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/db";
import { flashcards, assetChunks, spaceResources, knowledgeItems } from "@/db/schema";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { resolveFolder } from "@/lib/resolve-folder";
import { eq, inArray } from "drizzle-orm";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/generate/flashcards — Generate flashcards from space/folder resources.
 * Body: { spaceId, folderId?, count?, topic? }
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

  const { spaceId, folderId, count = 10, topic, assetIds } = await req.json();
  if (!spaceId) {
    return NextResponse.json({ error: "spaceId is required" }, { status: 400 });
  }

  // Cap at 100 flashcards
  const cardCount = Math.min(Number(count) || 10, 100);

  let context = "";

  // Priority 1: Use explicit asset IDs if provided
  if (assetIds && assetIds.length > 0) {
    context = await getAssetContext(assetIds);
  }

  // Priority 2: Try space resources
  if (!context) {
    context = await getSpaceContext(spaceId);
  }

  // Priority 3: Fallback to folder knowledge (only if no explicit assetIds)
  if (!context && folderId && (!assetIds || assetIds.length === 0)) {
    const realFolderId = await resolveFolder(folderId, userId);
    if (realFolderId) {
      context = await getFolderContext(realFolderId);
    }
  }

  if (!context) {
    return NextResponse.json(
      { error: "No content available to generate flashcards from" },
      { status: 400 }
    );
  }

  const topicInstruction = topic
    ? `Focus specifically on this topic: ${topic}`
    : "Cover the main concepts from the material.";

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You generate study flashcards. Output ONLY a valid JSON array. No markdown, no explanation, no code fences.`,
    prompt: `Generate exactly ${cardCount} flashcards from this study material.
${topicInstruction}

Material:
${context}

Output format (JSON array):
[{"front": "Question or term on the front of the card", "back": "Answer or definition on the back"}]

Rules:
- Each flashcard should test ONE concept
- Front should be a clear question or key term
- Back should be a concise but complete answer (1-3 sentences)
- Generate exactly ${cardCount} flashcards
- Cover different aspects of the material, don't repeat`,
  });

  let cards: { front: string; back: string }[];
  try {
    cards = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      cards = JSON.parse(match[0]);
    } else {
      return NextResponse.json(
        { error: "Failed to parse generated flashcards" },
        { status: 500 }
      );
    }
  }

  // Cap results
  cards = cards.slice(0, cardCount);

  const inserted = await db
    .insert(flashcards)
    .values(
      cards.map((card, index) => ({
        spaceId,
        front: card.front,
        back: card.back,
        orderIndex: index,
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
