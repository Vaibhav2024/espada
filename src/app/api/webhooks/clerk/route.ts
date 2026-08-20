import { Webhook } from "svix";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, subscriptions, invites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { WebhookEvent } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("CLERK_WEBHOOK_SECRET not configured");
  }

  // Get headers for verification
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify the webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "user.created": {
      const { id, email_addresses, first_name, last_name, image_url, unsafe_metadata } =
        event.data;
      const email = email_addresses[0]?.email_address ?? "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;

      await db.insert(users).values({
        id,
        email,
        name,
        avatarUrl: image_url ?? null,
        inviteCode: nanoid(6),
      });

      // Create default free subscription
      await db.insert(subscriptions).values({
        userId: id,
        plan: "free",
        status: "active",
      });

      // Handle referral code from unsafeMetadata (passed during sign-up)
      const referralCode = (unsafe_metadata as Record<string, unknown>)?.referralCode as string | undefined;
      if (referralCode) {
        // Find the inviter by their personal inviteCode
        const [inviter] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.inviteCode, referralCode))
          .limit(1);

        if (inviter && inviter.id !== id) {
          // Create completed invite row
          await db.insert(invites).values({
            inviterId: inviter.id,
            inviteeId: id,
            status: "completed",
            completedAt: new Date(),
          });

          // Extend inviter's bonusProUntil by +1 day
          const [inviterSub] = await db
            .select({ bonusProUntil: subscriptions.bonusProUntil })
            .from(subscriptions)
            .where(eq(subscriptions.userId, inviter.id))
            .limit(1);

          const now = new Date();
          const currentBonus = inviterSub?.bonusProUntil;
          // Start from whichever is later: current bonusProUntil or now
          const baseDate = currentBonus && currentBonus > now ? currentBonus : now;
          const newBonusEnd = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000); // +1 day

          await db
            .update(subscriptions)
            .set({ bonusProUntil: newBonusEnd })
            .where(eq(subscriptions.userId, inviter.id));
        }
      }

      break;
    }

    case "user.updated": {
      const { id, email_addresses, first_name, last_name, image_url } =
        event.data;
      const email = email_addresses[0]?.email_address ?? "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;

      await db
        .update(users)
        .set({
          email,
          name,
          avatarUrl: image_url ?? null,
        })
        .where(eq(users.id, id));

      break;
    }

    case "user.deleted": {
      const { id } = event.data;
      if (id) {
        await db.delete(users).where(eq(users.id, id));
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
