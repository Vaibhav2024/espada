import { Queue } from "bullmq";
import { createRedisConnection } from "./redis";

/**
 * BullMQ requires its own dedicated Redis connection (not shared with subscribers).
 * We create one using the same auth config as the shared singleton.
 */
const bullmqConnection = createRedisConnection();

// Log connection issues
bullmqConnection.on("error", (err) => {
  console.error("[queue:redis] Connection error:", err.message);
});
bullmqConnection.on("connect", () => {
  console.log("[queue:redis] Connected");
});

/**
 * Asset processing queue — jobs are picked up by the worker container.
 */
export const assetQueue = new Queue("asset-processing", {
  connection: bullmqConnection,
});

/**
 * Enqueue an asset for processing (parse → chunk → embed).
 */
export async function enqueueAssetProcessing(assetId: string) {
  try {
    const job = await assetQueue.add(
      "process-asset",
      { assetId },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      }
    );
    console.log(`[queue] Enqueued job ${job.id} for asset ${assetId}`);
  } catch (err) {
    console.error(`[queue] Failed to enqueue asset ${assetId}:`, err);
    throw err;
  }
}
