/**
 * Re-queues all assets stuck in "queued" or "processing" status.
 * Run with: npx tsx scripts/requeue-assets.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { db } = await import("../src/db");
  const { assets } = await import("../src/db/schema");
  const { enqueueAssetProcessing } = await import("../src/lib/queue");
  const { inArray } = await import("drizzle-orm");

  // Find stuck assets
  const stuck = await db
    .select({ id: assets.id, name: assets.name, status: assets.status })
    .from(assets)
    .where(inArray(assets.status, ["queued", "processing"]));

  console.log(`Found ${stuck.length} stuck assets:`);
  for (const asset of stuck) {
    console.log(`  - ${asset.name} (${asset.id}) [${asset.status}]`);
  }

  if (stuck.length === 0) {
    console.log("Nothing to re-queue.");
    process.exit(0);
  }

  // Reset status to "queued" and re-enqueue
  for (const asset of stuck) {
    await db
      .update(assets)
      .set({ status: "queued" })
      .where(require("drizzle-orm").eq(assets.id, asset.id));

    await enqueueAssetProcessing(asset.id);
    console.log(`  Queued: ${asset.name}`);
  }

  console.log("Done! Make sure the worker is running: npx tsx worker/index.ts");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
