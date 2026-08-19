import { db } from "@/db";
import { spaces, folders, folderMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Shared authorization check for space access.
 * Enforces visibility rules:
 *   - "me": only the creator can view or edit
 *   - "members": any folderMembers row for that folder can view and edit
 *   - "public": any authenticated user can view; only the creator can edit
 *
 * Returns { allowed, space } or throws nothing — caller checks `allowed`.
 */
export async function authorizeSpaceAccess(
  spaceId: string,
  userId: string,
  mode: "read" | "write"
): Promise<{ allowed: boolean; reason?: string }> {
  const [space] = await db
    .select()
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);

  if (!space) {
    return { allowed: false, reason: "Space not found" };
  }

  const visibility = space.visibility;

  // Creator always has full access
  if (space.createdBy === userId) {
    return { allowed: true };
  }

  switch (visibility) {
    case "me":
      // Only creator — already checked above
      return { allowed: false, reason: "Access denied" };

    case "members": {
      // Check if user is a member of the folder
      const [membership] = await db
        .select()
        .from(folderMembers)
        .where(
          and(
            eq(folderMembers.folderId, space.folderId),
            eq(folderMembers.userId, userId)
          )
        )
        .limit(1);

      if (membership) {
        return { allowed: true };
      }
      return { allowed: false, reason: "Access denied" };
    }

    case "public": {
      if (mode === "read") {
        return { allowed: true };
      }
      // Write is only for creator (already checked above)
      return { allowed: false, reason: "Only the creator can edit this space" };
    }

    default:
      return { allowed: false, reason: "Unknown visibility" };
  }
}
