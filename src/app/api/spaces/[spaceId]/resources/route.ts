import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spaceResources, assets } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ spaceId: string }>;
}

/**
 * GET /api/spaces/:spaceId/resources — List resources attached to a space.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  await requireAuth();
  const { spaceId } = await params;

  const resources = await db
    .select({
      id: spaceResources.id,
      spaceId: spaceResources.spaceId,
      assetId: spaceResources.assetId,
      focused: spaceResources.focused,
      addedAt: spaceResources.addedAt,
      asset: assets,
    })
    .from(spaceResources)
    .innerJoin(assets, eq(spaceResources.assetId, assets.id))
    .where(eq(spaceResources.spaceId, spaceId));

  return NextResponse.json(resources);
}

/**
 * POST /api/spaces/:spaceId/resources — Attach an asset to a space.
 * Body: { assetId: string, focused?: boolean }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  await requireAuth();
  const { spaceId } = await params;
  const { assetId, focused } = await req.json();

  if (!assetId) {
    return NextResponse.json(
      { error: "assetId is required" },
      { status: 400 }
    );
  }

  // Verify asset exists
  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.id, assetId))
    .limit(1);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const [resource] = await db
    .insert(spaceResources)
    .values({
      spaceId,
      assetId,
      focused: focused ?? true,
    })
    .returning();

  return NextResponse.json(resource, { status: 201 });
}
