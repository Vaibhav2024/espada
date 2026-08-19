import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { solveProblems } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { authorizeSpaceAccess } from "@/lib/authorize-space";
import { eq, asc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ spaceId: string }>;
}

/**
 * GET /api/spaces/:spaceId/problems — Fetch existing solve problems for a space.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { spaceId } = await params;

  const auth = await authorizeSpaceAccess(spaceId, userId, "read");
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.reason || "Access denied" }, { status: 403 });
  }

  const problems = await db
    .select()
    .from(solveProblems)
    .where(eq(solveProblems.spaceId, spaceId))
    .orderBy(asc(solveProblems.orderIndex));

  return NextResponse.json(problems);
}
