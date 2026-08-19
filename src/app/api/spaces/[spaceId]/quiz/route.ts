import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quizQuestions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { authorizeSpaceAccess } from "@/lib/authorize-space";
import { eq, asc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ spaceId: string }>;
}

/**
 * GET /api/spaces/:spaceId/quiz — Fetch existing quiz questions for a space.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { spaceId } = await params;

  const auth = await authorizeSpaceAccess(spaceId, userId, "read");
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.reason || "Access denied" }, { status: 403 });
  }

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.spaceId, spaceId))
    .orderBy(asc(quizQuestions.orderIndex));

  return NextResponse.json(questions);
}
