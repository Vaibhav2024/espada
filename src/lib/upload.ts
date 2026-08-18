import { db } from "@/db";
import { assets, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";

/**
 * Server-side file upload helper.
 * Writes file to disk and creates an asset record in the database.
 */
export async function uploadAsset(userId: string, file: File) {
  // Create storage path: YYYY/MM/randomId.ext
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const ext = file.name.split(".").pop() ?? "bin";
  const fileId = crypto.randomUUID();
  const storageKey = `${year}/${month}/${fileId}.${ext}`;
  const fullPath = join(UPLOADS_DIR, storageKey);

  // Write file to disk
  const dir = join(UPLOADS_DIR, year, month);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  // Create asset record
  const [asset] = await db
    .insert(assets)
    .values({
      uploaderId: userId,
      type: "file",
      name: file.name,
      storageKey,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      status: "queued",
    })
    .returning();

  // Update user storage usage
  const [user] = await db
    .select({ storageUsedBytes: users.storageUsedBytes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  await db
    .update(users)
    .set({ storageUsedBytes: (user?.storageUsedBytes ?? 0) + file.size })
    .where(eq(users.id, userId));

  return asset;
}
