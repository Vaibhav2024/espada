import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assets, users } from "@/db/schema";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { enqueueAssetProcessing } from "@/lib/queue";
import { PLAN_LIMITS } from "@/lib/quota";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";

/**
 * POST /api/assets/upload — Upload a file and enqueue it for processing.
 * Accepts multipart/form-data with a "file" field.
 */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const plan = await getUserPlan(userId);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Check file size against plan limit
  const maxSizeBytes = PLAN_LIMITS[plan].uploadSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return NextResponse.json(
      {
        error: `File too large. Max ${PLAN_LIMITS[plan].uploadSizeMB}MB for ${plan} plan.`,
      },
      { status: 413 }
    );
  }

  // Check total storage quota
  const [user] = await db
    .select({ storageUsedBytes: users.storageUsedBytes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const maxStorageBytes = PLAN_LIMITS[plan].storageMB * 1024 * 1024;
  if ((user?.storageUsedBytes ?? 0) + file.size > maxStorageBytes) {
    return NextResponse.json(
      { error: "Storage quota exceeded" },
      { status: 413 }
    );
  }

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
  await db
    .update(users)
    .set({
      storageUsedBytes: (user?.storageUsedBytes ?? 0) + file.size,
    })
    .where(eq(users.id, userId));

  // Enqueue for processing (parse → chunk → embed)
  await enqueueAssetProcessing(asset.id);

  return NextResponse.json(asset, { status: 201 });
}
