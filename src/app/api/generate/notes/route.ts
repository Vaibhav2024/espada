import { NextRequest } from "next/server";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { streamTextWithFallback } from "@/lib/ai";
import { resolveFolder } from "@/lib/resolve-folder";
import { db } from "@/db";
import { spaceResources, assetChunks, knowledgeItems } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * POST /api/generate/notes — Generate structured notes from space resources.
 * Body: { spaceId: string, folderId?: string }
 */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const plan = await getUserPlan(userId);

  const quotaResult = await consumeQuota(userId, "ai_msgs", plan);
  if (!quotaResult.allowed) {
    return new Response(
      JSON.stringify({ error: "Daily AI limit reached", limit: quotaResult.limit }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { spaceId, folderId, assetIds } = await req.json();
  if (!spaceId) {
    return new Response(
      JSON.stringify({ error: "spaceId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let context = "";

  // Priority 1: Use specific asset IDs if provided (user selected specific documents)
  if (assetIds && assetIds.length > 0) {
    context = await getAssetContext(assetIds);
  }

  // Priority 2: Try space resources
  if (!context) {
    context = await getSpaceContext(spaceId);
  }

  // Priority 3: Fall back to folder's knowledge items (only if no explicit assetIds were provided)
  if (!context && folderId && (!assetIds || assetIds.length === 0)) {
    const realFolderId = await resolveFolder(folderId, userId);
    if (realFolderId) {
      context = await getFolderContext(realFolderId);
    }
  }

  if (!context) {
    return new Response(
      JSON.stringify({ error: "No content available to generate notes from. Please add resources to your knowledge base first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const systemPrompt = `You generate comprehensive, well-structured study notes for students based on the provided source material. Use markdown formatting to structure your output:
- Use # for main title
- Use ## for section headings
- Use ### for sub-section headings
- Use - for bullet points
- Use 1. for numbered lists
- Use > for important quotes or key definitions
- Use regular paragraphs for explanations

Write clearly and thoroughly. ONLY use information from the provided source material — do not add external information.`;

  const userPrompt = `Generate detailed study notes based on the following source material:\n\n${context}\n\nCreate well-organized notes covering all key concepts, definitions, and important details from this material. Only include information that is present in the source material above.`;

  const { stream } = await streamTextWithFallback({
    system: systemPrompt,
    prompt: userPrompt,
  });

  return stream.toTextStreamResponse();
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
    .limit(20);

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
