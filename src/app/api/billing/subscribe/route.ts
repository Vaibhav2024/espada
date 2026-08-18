import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * POST /api/billing/subscribe — Create a Razorpay Subscription for Pro plan.
 *
 * Body: { billingCycle: "monthly" | "annually" }
 *
 * Returns the Razorpay subscription object with `id` and `short_url` that
 * the client uses to open Razorpay Checkout.
 */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const { billingCycle } = await req.json();

  if (!billingCycle || !["monthly", "annually"].includes(billingCycle)) {
    return NextResponse.json(
      { error: "billingCycle must be 'monthly' or 'annually'" },
      { status: 400 }
    );
  }

  // Look up or create a Razorpay plan ID.
  // In production these would be pre-created in the Razorpay dashboard and
  // stored as env vars. Using env vars for plan IDs:
  //   RAZORPAY_PLAN_MONTHLY=plan_xxx
  //   RAZORPAY_PLAN_ANNUALLY=plan_yyy
  const planId =
    billingCycle === "monthly"
      ? process.env.RAZORPAY_PLAN_MONTHLY!
      : process.env.RAZORPAY_PLAN_ANNUALLY!;

  if (!planId) {
    return NextResponse.json(
      { error: `Razorpay plan ID not configured for ${billingCycle}` },
      { status: 500 }
    );
  }

  // Get existing Razorpay customer ID if we have one
  const [existingSub] = await db
    .select({ razorpayCustomerId: subscriptions.razorpayCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  // Create a Razorpay Subscription
  const subscriptionOptions: Record<string, unknown> = {
    plan_id: planId,
    total_count: billingCycle === "monthly" ? 12 : 1,
    quantity: 1,
    notes: {
      userId,
    },
  };

  // Attach existing customer if available
  if (existingSub?.razorpayCustomerId) {
    subscriptionOptions.customer_id = existingSub.razorpayCustomerId;
  }

  const razorpaySub = await razorpay.subscriptions.create(
    subscriptionOptions as unknown as Parameters<typeof razorpay.subscriptions.create>[0]
  );

  // Store the subscription ID immediately (status will update via webhook)
  await db
    .update(subscriptions)
    .set({
      razorpaySubscriptionId: razorpaySub.id,
      billingCycle,
    })
    .where(eq(subscriptions.userId, userId));

  return NextResponse.json({
    subscriptionId: razorpaySub.id,
    // short_url can be used as a fallback hosted checkout link
    shortUrl: (razorpaySub as unknown as Record<string, unknown>).short_url ?? null,
    // Key ID needed by client-side Razorpay Checkout
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
