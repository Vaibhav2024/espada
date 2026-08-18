import Redis from "ioredis";

/**
 * Parses the REDIS_URL and returns explicit connection options.
 * This avoids any URL-parsing quirks in ioredis.
 */
function getRedisOptions(): {
  host: string;
  port: number;
  password: string | undefined;
} {
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname || "127.0.0.1",
        port: parseInt(parsed.port || "6379"),
        password: parsed.password || undefined,
      };
    } catch {
      // fallback
    }
  }
  return {
    host: "127.0.0.1",
    port: 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

const redisOpts = getRedisOptions();

/**
 * Create a new Redis client with correct auth.
 * Exported so BullMQ can use it as a connection factory.
 */
export function createRedisConnection(): Redis {
  return new Redis({
    host: redisOpts.host,
    port: redisOpts.port,
    password: redisOpts.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    protocol: 2,
  });
}

// Singleton for general use (quota checks, etc.)
let redis: Redis;

if (process.env.NODE_ENV === "production") {
  redis = createRedisConnection();
} else {
  const g = globalThis as unknown as { __espada_redis?: Redis };
  if (!g.__espada_redis) {
    g.__espada_redis = createRedisConnection();
  }
  redis = g.__espada_redis;
}

export { redis };
