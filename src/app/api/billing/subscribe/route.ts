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

// Cache created plan IDs in memory (persists across requests in same process)
let cachedMonthlyPlanId: string | null = null;
let cachedAnnuallyPlanId: string | null = null;

/**
 * Ensure a Razorpay Plan exists. Uses env var if set, otherwise creates one.
 */
async function ensurePlanId(billingCycle: "monthly" | "annually"): Promise<string> {
  // Check env vars first
  if (billingCycle === "monthly" && process.env.RAZORPAY_PLAN_MONTHLY) {
    return process.env.RAZORPAY_PLAN_MONTHLY;
  }
  if (billingCycle === "annually" && process.env.RAZORPAY_PLAN_ANNUALLY) {
    return process.env.RAZORPAY_PLAN_ANNUALLY;
  }

  // Check in-memory cache
  if (billingCycle === "monthly" && cachedMonthlyPlanId) return cachedMonthlyPlanId;
  if (billingCycle === "annually" && cachedAnnuallyPlanId) return cachedAnnuallyPlanId;

  // Create plan on-the-fly (test mode)
  // Monthly: ₹668.44/mo ($7.99), Annually: ₹5726.32/yr ($68.50)
  const planOptions = billingCycle === "monthly"
    ? {
        period: "monthly" as const,
        interval: 1,
        item: {
          name: "Espada Pro Monthly",
          amount: 66844, // ₹668.44 in paise
          currency: "INR",
          description: "Espada Pro - Monthly subscription",
        },
      }
    : {
        period: "yearly" as const,
        interval: 1,
        item: {
          name: "Espada Pro Annual",
          amount: 572632, // ₹5726.32 in paise
          currency: "INR",
          description: "Espada Pro - Annual subscription",
        },
      };

  const plan = await razorpay.plans.create(planOptions as unknown as Parameters<typeof razorpay.plans.create>[0]);

  // Cache the created plan ID
  if (billingCycle === "monthly") {
    cachedMonthlyPlanId = plan.id;
  } else {
    cachedAnnuallyPlanId = plan.id;
  }

  return plan.id;
}

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

  let planId: string;
  try {
    planId = await ensurePlanId(billingCycle);
  } catch (err) {
    console.error("[billing] Failed to get/create plan:", err);
    return NextResponse.json(
      { error: "Failed to initialize payment plan. Please try again." },
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
