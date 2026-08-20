import { db } from "@/db";
import { folders, folderMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateInviteCode } from "@/lib/invite-code";

/**
 * Resolves a folderId from the URL.
 * If "default", finds the user's "My folder" if it exists.
 * Only auto-creates a default folder if the user has NO folders at all.
 * Returns the real UUID folder ID, or null if no folder should be used.
 */
export async function resolveFolder(
  folderId: string,
  userId: string
): Promise<string | null> {
  if (folderId !== "default") return folderId;

  // Check if user already has a "My folder"
  const [existing] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.ownerId, userId), eq(folders.name, "My folder")))
    .limit(1);

  if (existing) return existing.id;

  // Check if user has ANY folders at all
  const [anyFolder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(eq(folders.ownerId, userId))
    .limit(1);

  // If user has other folders, don't auto-create "My folder"
  if (anyFolder) return null;

  // User has no folders at all — create the default one
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
      inviteCode: generateInviteCode(),
    })
    .returning();

  await db.insert(folderMembers).values({
    folderId: folder.id,
    userId,
    role: "owner",
  });

  return folder.id;
}
