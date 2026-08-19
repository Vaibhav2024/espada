import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { flashcards } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ spaceId: string }>;
}

/**
 * GET /api/spaces/:spaceId/flashcards — Fetch existing flashcards for a space.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  await requireAuth();
  const { spaceId } = await params;

  const cards = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.spaceId, spaceId))
    .orderBy(asc(flashcards.orderIndex));

  return NextResponse.json(cards);
}
