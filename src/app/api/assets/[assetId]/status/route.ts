import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

/**
 * GET /api/assets/:assetId/status — Check processing status of an asset.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  await requireAuth();
  const { assetId } = await params;

  const [asset] = await db
    .select({ status: assets.status, name: assets.name })
    .from(assets)
    .where(eq(assets.id, assetId))
    .limit(1);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ status: asset.status, name: asset.name });
}
