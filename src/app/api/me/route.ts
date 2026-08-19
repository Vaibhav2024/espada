import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, subscriptions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

/**
 * GET /api/me — Return the current user's profile info including inviteCode.
 */
export async function GET() {
  const userId = await requireAuth();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      inviteCode: users.inviteCode,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Also fetch subscription info
  const [sub] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      bonusProUntil: subscriptions.bonusProUntil,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return NextResponse.json({
    ...user,
    subscription: sub ?? null,
  });
}
