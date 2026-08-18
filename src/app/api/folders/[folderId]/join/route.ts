import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folders, folderMembers } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ folderId: string }>;
}

/**
 * POST /api/folders/:folderId/join — Join a folder via invite code.
 * Body: { inviteCode: string }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { folderId } = await params;
  const { inviteCode } = await req.json();

  if (!inviteCode) {
    return NextResponse.json(
      { error: "inviteCode is required" },
      { status: 400 }
    );
  }

  // Verify the folder exists and invite code matches
  const [folder] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.inviteCode, inviteCode)))
    .limit(1);

  if (!folder) {
    return NextResponse.json(
      { error: "Invalid folder or invite code" },
      { status: 404 }
    );
  }

  // Check if already a member
  const [existing] = await db
    .select()
    .from(folderMembers)
    .where(
      and(
        eq(folderMembers.folderId, folderId),
        eq(folderMembers.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ message: "Already a member" });
  }

  await db.insert(folderMembers).values({
    folderId,
    userId,
    role: "member",
  });

  return NextResponse.json({ message: "Joined successfully" }, { status: 201 });
}
