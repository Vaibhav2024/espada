import { db } from "@/db";
import { folders, folderMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Resolves a folderId from the URL.
 * If "default", ensures a real default folder exists for the user in the DB.
 * Returns the real UUID folder ID.
 */
export async function resolveFolder(
  folderId: string,
  userId: string
): Promise<string> {
  if (folderId !== "default") return folderId;

  // Check if user already has a default folder
  const [existing] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.ownerId, userId), eq(folders.name, "My folder")))
    .limit(1);

  if (existing) return existing.id;

  // Create a real default folder
  const [folder] = await db
    .insert(folders)
    .values({
      name: "My folder",
      themeName: "Zinc",
      themeColor: "#a1a1aa",
      iconName: "Folder",
      isPublic: true,
      joinPreference: "link",
      ownerId: userId,
      inviteCode: nanoid(6),
    })
    .returning();

  await db.insert(folderMembers).values({
    folderId: folder.id,
    userId,
    role: "owner",
  });

  return folder.id;
}
