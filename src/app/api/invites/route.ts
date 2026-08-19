import { NextResponse } from "next/server";
import { db } from "@/db";
import { invites, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/invites — Fetch the current user's invite history (completed invites).
 * Returns the list of completed invites with invitee display name and completedAt.
 */
export async function GET() {
  const userId = await requireAuth();

  const completedInvites = await db
    .select({
      id: invites.id,
      inviteeId: invites.inviteeId,
      status: invites.status,
      completedAt: invites.completedAt,
      inviteeName: users.name,
      inviteeEmail: users.email,
    })
    .from(invites)
    .leftJoin(users, eq(invites.inviteeId, users.id))
    .where(eq(invites.inviterId, userId))
    .orderBy(desc(invites.completedAt));

  return NextResponse.json(completedInvites);
}
