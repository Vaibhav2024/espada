import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateInviteCode } from "@/lib/invite-code";
import type { Plan } from "./quota";

/**
 * Get the current authenticated user's ID from Clerk.
 * Also ensures the user exists in our database (creates if missing).
 * Throws if not authenticated.
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthError();
  }

  // Ensure user exists in our DB (handles first-time users and
  // cases where the Clerk webhook hasn't fired yet)
  await ensureUserExists(userId);

  return userId;
}

/**
 * Custom error class for authentication failures.
 * API routes can catch this to return a proper 401.
 */
export class AuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthError";
  }
}

/**
 * Ensure a user row exists in the database.
 * If not, fetch their info from Clerk and create the row + free subscription.
 * This is idempotent — safe to call on every request.
 */
async function ensureUserExists(userId: string): Promise<void> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing) return; // already in DB

  // Fetch user details from Clerk
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    null;

  // Insert user
  await db.insert(users).values({
    id: userId,
    email,
    name,
    avatarUrl: clerkUser?.imageUrl ?? null,
    inviteCode: generateInviteCode(),
  });

  // Create default free subscription
  await db.insert(subscriptions).values({
    userId,
    plan: "free",
    status: "active",
  });
}

/**
 * Get the user's effective plan from the subscriptions table.
 * A user is "pro" if either:
 *   - subscription.plan === "pro" && status === "active"
 *   - now < bonusProUntil (free Pro from invites)
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  const [sub] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      bonusProUntil: subscriptions.bonusProUntil,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub) return "free";

  // Paid pro subscription active
  if (sub.plan === "pro" && sub.status === "active") {
    return "pro";
  }

  // Bonus pro from invites
  if (sub.bonusProUntil && new Date() < sub.bonusProUntil) {
    return "pro";
  }

  return "free";
}
