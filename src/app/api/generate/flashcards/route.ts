import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { flashcards, assetChunks, spaceResources } from "@/db/schema";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { generateTextWithFallback } from "@/lib/ai";
import { eq, inArray } from "drizzle-orm";

/**
 * POST /api/generate/flashcards — Generate flashcards from space resources.
 * Body: { spaceId: string, count?: number }
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

  const { spaceId, count = 10 } = await req.json();
  if (!spaceId) {
    return NextResponse.json(
      { error: "spaceId is required" },
      { status: 400 }
    );
  }

  const context = await getSpaceContext(spaceId);
  if (!context) {
    return NextResponse.json(
      { error: "No content available to generate flashcards from" },
      { status: 400 }
    );
  }

  const { text } = await generateTextWithFallback({
    system: `You generate study flashcards. Output ONLY a JSON array of objects with "front" and "back" fields. No markdown, no explanation.`,
    prompt: `Generate ${count} flashcards from this study material:\n\n${context}\n\nOutput format: [{"front": "question", "back": "answer"}]`,
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
    .limit(10);

  return chunks.map((c) => c.content).join("\n\n");
}
