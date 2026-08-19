import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folders, folderMembers } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/folders/join — Join a folder by invite code only (no folder ID needed).
 * Body: { code: string }
 * Returns: { folderId: string } on success.
 */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const { code } = await req.json();

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json(
      { error: "Invite code is required" },
      { status: 400 }
    );
  }

  // Look up the folder by invite code
  const [folder] = await db
    .select({ id: folders.id, inviteCode: folders.inviteCode })
    .from(folders)
    .where(eq(folders.inviteCode, code.trim()))
    .limit(1);

  if (!folder) {
    return NextResponse.json(
      { error: "Invalid code" },
      { status: 404 }
    );
  }

  // Check if already a member
  const [existing] = await db
    .select()
    .from(folderMembers)
    .where(
      and(
        eq(folderMembers.folderId, folder.id),
        eq(folderMembers.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    // Already a member — still return success with the folder ID
    return NextResponse.json({ folderId: folder.id });
  }

  // Add as member
  await db.insert(folderMembers).values({
    folderId: folder.id,
    userId,
    role: "member",
  });

  return NextResponse.json({ folderId: folder.id }, { status: 201 });
}
