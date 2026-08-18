import { config } from "dotenv";
import { resolve } from "path";

// Load env BEFORE anything else — must be synchronous top-level calls
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// Now dynamically import the actual worker (so db/redis get correct env vars)
async function main() {
  const { Worker } = await import("bullmq");
  const Redis = (await import("ioredis")).default;
  const { processAsset } = await import("./jobs/process-asset");

  // Parse REDIS_URL
  const url = process.env.REDIS_URL;
  let host = "127.0.0.1";
  let port = 6379;
  let password: string | undefined;

  if (url) {
    try {
      const parsed = new URL(url);
      host = parsed.hostname || host;
      port = parseInt(parsed.port || "6379");
      password = parsed.password || undefined;
    } catch {}
  } else {
    password = process.env.REDIS_PASSWORD || undefined;
  }

  console.log(`[worker] Redis: ${host}:${port} (auth: ${password ? "yes" : "no"})`);
  console.log(`[worker] DB: ${process.env.DATABASE_URL ? "configured" : "NOT SET!"}`);

  const connection = new Redis({
    host,
    port,
    password,
    maxRetriesPerRequest: null,
    protocol: 2,
  });

  console.log("[worker] Starting asset processing worker...");

  const worker = new Worker(
    "asset-processing",
    async (job) => {
      console.log(`[worker] Processing job ${job.id}: ${job.name}`);
      switch (job.name) {
        case "process-asset":
          await processAsset(job.data);
          break;
        default:
          console.warn(`[worker] Unknown job name: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 60_000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.id} (${job.name}) completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  worker.on("ready", () => {
    console.log("[worker] Ready and listening for jobs");
  });

  worker.on("error", (err) => {
    console.error("[worker] Error:", err.message);
  });

  process.on("SIGTERM", async () => {
    console.log("[worker] SIGTERM received, closing...");
    await worker.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[worker] Fatal:", err);
  process.exit(1);
});
