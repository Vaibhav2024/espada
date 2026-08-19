import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folderMembers, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ folderId: string }>;
}

/**
 * GET /api/folders/:folderId/members — List all members of a folder.
 * Returns user info (name, email, avatar) joined with membership data.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  await requireAuth();
  const { folderId } = await params;

  const members = await db
    .select({
      userId: folderMembers.userId,
      role: folderMembers.role,
      joinedAt: folderMembers.joinedAt,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(folderMembers)
    .innerJoin(users, eq(folderMembers.userId, users.id))
    .where(eq(folderMembers.folderId, folderId))
    .orderBy(asc(folderMembers.joinedAt));

  return NextResponse.json(members);
}
