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

/**
 * PUT /api/spaces/:spaceId/lines — Replace all doc_lines for a space (auto-save).
 * Body: { lines: Array<{ type, text, tableData? }> }
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  await requireAuth();
  const { spaceId } = await params;

  const { lines } = await req.json();

  if (!Array.isArray(lines)) {
    return NextResponse.json(
      { error: "lines must be an array" },
      { status: 400 }
    );
  }

  // Delete existing lines and insert new ones in a transaction
  await db.transaction(async (tx) => {
    await tx.delete(docLines).where(eq(docLines.spaceId, spaceId));

    if (lines.length > 0) {
      await tx.insert(docLines).values(
        lines.map((line: { type: string; text: string; tableData?: unknown }, idx: number) => ({
          spaceId,
          orderIndex: idx,
          type: line.type,
          text: line.text || "",
          tableData: line.tableData ?? null,
        }))
      );
    }
  });

  return NextResponse.json({ saved: true });
}
