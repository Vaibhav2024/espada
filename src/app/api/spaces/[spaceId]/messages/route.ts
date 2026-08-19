import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { authorizeSpaceAccess } from "@/lib/authorize-space";
import { eq, asc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ spaceId: string }>;
}

/**
 * GET /api/spaces/:spaceId/messages — Fetch chat history for a space.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { spaceId } = await params;

  const auth = await authorizeSpaceAccess(spaceId, userId, "read");
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.reason || "Access denied" }, { status: 403 });
  }

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.spaceId, spaceId))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json(history);
}
