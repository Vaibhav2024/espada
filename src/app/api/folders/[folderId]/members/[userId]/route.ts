import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folders, folderMembers } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ folderId: string; userId: string }>;
}

/**
 * DELETE /api/folders/:folderId/members/:userId — Remove a member from a folder.
 * Only the folder owner can remove members.
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const currentUserId = await requireAuth();
  const { folderId, userId: targetUserId } = await params;

  // Verify the current user is the folder owner
  const [folder] = await db
    .select({ ownerId: folders.ownerId })
    .from(folders)
    .where(eq(folders.id, folderId))
    .limit(1);

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  if (folder.ownerId !== currentUserId) {
    return NextResponse.json({ error: "Only the folder owner can remove members" }, { status: 403 });
  }

  // Cannot remove yourself (the owner)
  if (targetUserId === currentUserId) {
    return NextResponse.json({ error: "Cannot remove yourself from the folder" }, { status: 400 });
  }

  // Remove the member
  await db
    .delete(folderMembers)
    .where(
      and(
        eq(folderMembers.folderId, folderId),
        eq(folderMembers.userId, targetUserId)
      )
    );

  return NextResponse.json({ removed: true });
}
