import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { docLines } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ spaceId: string }>;
}

/**
 * GET /api/spaces/:spaceId/lines — Fetch all doc_lines for a space.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  await requireAuth();
  const { spaceId } = await params;

  const lines = await db
    .select()
    .from(docLines)
    .where(eq(docLines.spaceId, spaceId))
    .orderBy(asc(docLines.orderIndex));

  return NextResponse.json(lines);
}
