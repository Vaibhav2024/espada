import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spaces, folderMembers, folders } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { resolveFolder } from "@/lib/resolve-folder";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ folderId: string }>;
}

/**
 * GET /api/folders/:folderId/spaces — List spaces within a folder.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { folderId } = await params;
  const realFolderId = await resolveFolder(folderId, userId);

  const folderSpaces = await db
    .select()
    .from(spaces)
    .where(eq(spaces.folderId, realFolderId));

  return NextResponse.json(folderSpaces);
}

/**
 * POST /api/folders/:folderId/spaces — Create a new space within a folder.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { folderId } = await params;
  const realFolderId = await resolveFolder(folderId, userId);

  const body = await req.json();
  const { name, type, category, visibility } = body;

  if (!name || !type) {
    return NextResponse.json(
      { error: "Missing required fields: name, type" },
      { status: 400 }
    );
  }

  const validTypes = [
    "study-guide",
    "quiz",
    "flashcards",
    "solve",
    "write",
    "recording",
    "notes",
    "chat",
    "default",
  ];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const [space] = await db
    .insert(spaces)
    .values({
      name,
      folderId: realFolderId,
      type,
      category: category ?? "shared",
      visibility: visibility ?? "public",
      createdBy: userId,
    })
    .returning();

  return NextResponse.json(space, { status: 201 });
}
