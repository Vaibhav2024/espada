import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folders, folderMembers } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ folderId: string }>;
}

/**
 * GET /api/folders/:folderId — Get a single folder's details.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { folderId } = await params;

  const [folder] = await db
    .select()
    .from(folders)
    .where(eq(folders.id, folderId))
    .limit(1);

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  // Check access: owner or member
  if (folder.ownerId !== userId) {
    const [membership] = await db
      .select()
      .from(folderMembers)
      .where(
        and(
          eq(folderMembers.folderId, folderId),
          eq(folderMembers.userId, userId)
        )
      )
      .limit(1);

    if (!membership && !folder.isPublic) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  return NextResponse.json(folder);
}

/**
 * PATCH /api/folders/:folderId — Update folder settings.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { folderId } = await params;

  // Only owner can update
  const [folder] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.ownerId, userId)))
    .limit(1);

  if (!folder) {
    return NextResponse.json(
      { error: "Folder not found or access denied" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { name, themeName, themeColor, iconName, isPublic, joinPreference } =
    body;

  const [updated] = await db
    .update(folders)
    .set({
      ...(name !== undefined && { name }),
      ...(themeName !== undefined && { themeName }),
      ...(themeColor !== undefined && { themeColor }),
      ...(iconName !== undefined && { iconName }),
      ...(isPublic !== undefined && { isPublic }),
      ...(joinPreference !== undefined && { joinPreference }),
      updatedAt: new Date(),
    })
    .where(eq(folders.id, folderId))
    .returning();

  return NextResponse.json(updated);
}

/**
 * DELETE /api/folders/:folderId — Delete a folder (owner only).
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { folderId } = await params;

  const [folder] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.ownerId, userId)))
    .limit(1);

  if (!folder) {
    return NextResponse.json(
      { error: "Folder not found or access denied" },
      { status: 404 }
    );
  }

  await db.delete(folders).where(eq(folders.id, folderId));

  return NextResponse.json({ deleted: true });
}
