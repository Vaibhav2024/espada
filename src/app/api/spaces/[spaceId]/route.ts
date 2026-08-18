import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spaces } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ spaceId: string }>;
}

/**
 * GET /api/spaces/:spaceId — Get a single space.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  await requireAuth();
  const { spaceId } = await params;

  const [space] = await db
    .select()
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);

  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  return NextResponse.json(space);
}

/**
 * PATCH /api/spaces/:spaceId — Update a space.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { spaceId } = await params;

  const [space] = await db
    .select()
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);

  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  if (space.createdBy !== userId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await req.json();
  const { name, category, visibility, isConfigured } = body;

  const [updated] = await db
    .update(spaces)
    .set({
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(visibility !== undefined && { visibility }),
      ...(isConfigured !== undefined && { isConfigured }),
      updatedAt: new Date(),
    })
    .where(eq(spaces.id, spaceId))
    .returning();

  return NextResponse.json(updated);
}

/**
 * DELETE /api/spaces/:spaceId — Delete a space.
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { spaceId } = await params;

  const [space] = await db
    .select()
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);

  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  if (space.createdBy !== userId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  await db.delete(spaces).where(eq(spaces.id, spaceId));

  return NextResponse.json({ deleted: true });
}
