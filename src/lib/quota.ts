import { redis } from "./redis";

/**
 * Plan limits — §4 of the architecture doc.
 */
const PLAN_LIMITS = {
  free: {
    spacesPerDay: 3,
    aiMessagesPerDay: 50,
    uploadSizeMB: 10,
    activeDocs: 5,
    storageMB: 500,
  },
  pro: {
    spacesPerDay: Infinity,
    aiMessagesPerDay: 300,
    uploadSizeMB: 50,
    activeDocs: Infinity,
    storageMB: 5000,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

/**
 * Returns the date string used as the Redis key suffix (YYYY-MM-DD in UTC).
 */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Attempts to consume one unit of a daily quota.
 * Returns { allowed: true, remaining } or { allowed: false, limit }.
 *
 * Uses Redis INCR (atomic, no race conditions) with a 24h TTL for auto-reset.
 */
export async function consumeQuota(
  userId: string,
  quotaType: "spaces" | "ai_msgs",
  plan: Plan
): Promise<
  { allowed: true; remaining: number } | { allowed: false; limit: number }
> {
  const limit =
    quotaType === "spaces"
      ? PLAN_LIMITS[plan].spacesPerDay
      : PLAN_LIMITS[plan].aiMessagesPerDay;

  // Pro with Infinity — always allow
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity };
  }

  const key = `quota:${quotaType}:${userId}:${todayKey()}`;
  const current = await redis.incr(key);

  // Set TTL on first creation (when INCR returns 1)
  if (current === 1) {
    await redis.expire(key, 86400); // 24 hours
  }

  if (current > limit) {
    return { allowed: false, limit };
  }

  return { allowed: true, remaining: limit - current };
}

/**
 * Check current usage without consuming.
 */
export async function getQuotaUsage(
  userId: string,
  quotaType: "spaces" | "ai_msgs"
): Promise<number> {
  const key = `quota:${quotaType}:${userId}:${todayKey()}`;
  const val = await redis.get(key);
  return val ? parseInt(val, 10) : 0;
}

export { PLAN_LIMITS };
