import { customAlphabet } from "nanoid";

/**
 * Generates a 6-character uppercase alphanumeric invite code.
 * Uses only A-Z and 0-9 — no hyphens, underscores, or lowercase.
 * Each code is unique enough for our use case (36^6 = ~2.2 billion combinations).
 */
const generate = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

export function generateInviteCode(): string {
  return generate();
}
