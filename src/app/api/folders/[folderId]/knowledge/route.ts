import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { knowledgeItems, assets } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { uploadAsset } from "@/lib/upload";
import { enqueueAssetProcessing } from "@/lib/queue";
import { resolveFolder } from "@/lib/resolve-folder";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ folderId: string }>;
}

/**
 * GET /api/folders/:folderId/knowledge — List knowledge items with asset details.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { folderId } = await params;
  const realFolderId = await resolveFolder(folderId, userId);

  const items = await db
    .select({
      id: knowledgeItems.id,
      folderId: knowledgeItems.folderId,
      assetId: knowledgeItems.assetId,
      addedAt: knowledgeItems.addedAt,
      asset: assets,
    })
    .from(knowledgeItems)
    .innerJoin(assets, eq(knowledgeItems.assetId, assets.id))
    .where(eq(knowledgeItems.folderId, realFolderId));

  return NextResponse.json(items);
}

/**
 * POST /api/folders/:folderId/knowledge — Upload a file and create a knowledge item.
 * Accepts multipart/form-data with a "file" field, or JSON { url, name } for links.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const userId = await requireAuth();
  const { folderId } = await params;
  const realFolderId = await resolveFolder(folderId, userId);
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    // File upload
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const asset = await uploadAsset(userId, file);

    const [item] = await db
      .insert(knowledgeItems)
      .values({ folderId: realFolderId, assetId: asset.id })
      .returning();

    await enqueueAssetProcessing(asset.id);

    return NextResponse.json({ ...item, asset }, { status: 201 });
  } else {
    // Link/URL ingestion
    const { url, name } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const [asset] = await db
      .insert(assets)
      .values({
        uploaderId: userId,
        type: "link",
        name: name || url,
        url,
        status: "queued",
      })
      .returning();

    const [item] = await db
      .insert(knowledgeItems)
      .values({ folderId: realFolderId, assetId: asset.id })
      .returning();

    await enqueueAssetProcessing(asset.id);

    return NextResponse.json({ ...item, asset }, { status: 201 });
  }
}
