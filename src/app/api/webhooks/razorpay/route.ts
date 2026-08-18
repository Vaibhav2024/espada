import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/webhooks/razorpay — Razorpay webhook handler.
 *
 * Verifies HMAC signature (X-Razorpay-Signature header) against
 * RAZORPAY_WEBHOOK_SECRET before processing events.
 *
 * Handles:
 *  - subscription.charged  → mark active, extend currentPeriodEnd
 *  - subscription.cancelled → mark cancelled
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Read raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing X-Razorpay-Signature header" },
      { status: 400 }
    );
  }

  // Verify HMAC-SHA256 signature
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Parse the verified payload
  const event = JSON.parse(rawBody);
  const eventType: string = event.event;

  switch (eventType) {
    case "subscription.charged": {
      await handleSubscriptionCharged(event.payload);
      break;
    }

    case "subscription.cancelled": {
      await handleSubscriptionCancelled(event.payload);
      break;
    }

    default:
      // Acknowledge unhandled events without error
      break;
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

/**
 * subscription.charged — payment successful for a billing cycle.
 * Mark subscription active and extend currentPeriodEnd by the billing interval.
 */
async function handleSubscriptionCharged(payload: {
  subscription: { entity: RazorpaySubscriptionEntity };
  payment: { entity: { notes?: Record<string, string> } };
}) {
  const sub = payload.subscription.entity;
  const userId = sub.notes?.userId;

  if (!userId) {
    console.warn(
      "[razorpay-webhook] subscription.charged missing userId in notes"
    );
    return;
  }

  // Determine billing cycle from the plan interval
  const billingCycle: "monthly" | "annually" =
    sub.total_count === 12 || (sub.plan_id && sub.current_end)
      ? inferBillingCycle(sub)
      : "monthly";

  // current_end is a Unix timestamp — convert to Date
  const currentPeriodEnd = sub.current_end
    ? new Date(sub.current_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback: +30 days

  await db
    .update(subscriptions)
    .set({
      plan: "pro",
      billingCycle,
      status: "active",
      razorpaySubscriptionId: sub.id,
      razorpayCustomerId: sub.customer_id ?? null,
      currentPeriodEnd,
    })
    .where(eq(subscriptions.userId, userId));
}

/**
 * subscription.cancelled — user or system cancelled the subscription.
 */
async function handleSubscriptionCancelled(payload: {
  subscription: { entity: RazorpaySubscriptionEntity };
}) {
  const sub = payload.subscription.entity;
  const userId = sub.notes?.userId;

  if (!userId) {
    console.warn(
      "[razorpay-webhook] subscription.cancelled missing userId in notes"
    );
    return;
  }

  await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(eq(subscriptions.userId, userId));
}

/**
 * Infer billing cycle from Razorpay subscription entity.
 * total_count=12 with monthly period → monthly billing.
 * total_count=1 with yearly period → annual billing.
 */
function inferBillingCycle(
  sub: RazorpaySubscriptionEntity
): "monthly" | "annually" {
  // If the subscription has a short_url or the total_count hints at annual
  if (sub.total_count && sub.total_count <= 2) {
    return "annually";
  }
  return "monthly";
}

// Minimal type for the Razorpay subscription entity fields we use
interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  customer_id?: string;
  status: string;
  current_start?: number;
  current_end?: number;
  total_count?: number;
  notes?: Record<string, string>;
}
