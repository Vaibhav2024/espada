import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folders, folderMembers } from "@/db/schema";
import { requireAuth, getUserPlan, AuthError } from "@/lib/auth";
import { consumeQuota } from "@/lib/quota";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * GET /api/folders — List all folders the user owns or is a member of.
 */
export async function GET() {
  let userId: string;
  try {
    userId = await requireAuth();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  const ownedFolders = await db
    .select()
    .from(folders)
    .where(eq(folders.ownerId, userId));

  const memberFolders = await db
    .select({ folder: folders })
    .from(folderMembers)
    .innerJoin(folders, eq(folderMembers.folderId, folders.id))
    .where(eq(folderMembers.userId, userId));

  // Merge and deduplicate
  const allFolders = [
    ...ownedFolders,
    ...memberFolders.map((r) => r.folder),
  ];
  const unique = Array.from(
    new Map(allFolders.map((f) => [f.id, f])).values()
  );

  return NextResponse.json(unique);
}

/**
 * POST /api/folders — Create a new folder.
 * Subject to daily quota for free-tier users (1 space/day — spaces in the UI
 * map to folders in the backend as per the architecture).
 */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const plan = await getUserPlan(userId);

  // Enforce daily space-creation quota
  const quotaResult = await consumeQuota(userId, "spaces", plan);
  if (!quotaResult.allowed) {
    return NextResponse.json(
      {
        error: "Daily folder creation limit reached",
        limit: quotaResult.limit,
      },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { name, themeName, themeColor, iconName, isPublic, joinPreference } =
    body;

  if (!name || !themeName || !themeColor || !iconName) {
    return NextResponse.json(
      { error: "Missing required fields: name, themeName, themeColor, iconName" },
      { status: 400 }
    );
  }

  const inviteCode = nanoid(6);

  const [folder] = await db
    .insert(folders)
    .values({
      name,
      themeName,
      themeColor,
      iconName,
      isPublic: isPublic ?? true,
      joinPreference: joinPreference ?? "link",
      ownerId: userId,
      inviteCode,
    })
    .returning();

  // Add the owner as a member with "owner" role
  await db.insert(folderMembers).values({
    folderId: folder.id,
    userId,
    role: "owner",
  });

  return NextResponse.json(folder, { status: 201 });
}
