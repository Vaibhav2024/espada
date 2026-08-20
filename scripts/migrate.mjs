import postgres from "postgres";
import { config } from "dotenv";

// Load env — tries .env.local first, then .env
// To run against production: set DATABASE_URL env var directly
//   DATABASE_URL=postgresql://user:pass@host:5432/db node scripts/migrate.mjs
config({ path: ".env.local" });
config({ path: ".env" });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not set. Set it in .env.local or pass as env var.");
  process.exit(1);
}

const sql = postgres(dbUrl);

async function run() {
  console.log("Running migrations...");

  await sql.unsafe(`ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "transcript_segments" JSONB`);
  console.log("✓ Added transcript_segments to spaces");

  await sql.unsafe(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "bonus_pro_until" TIMESTAMP`);
  console.log("✓ Added bonus_pro_until to subscriptions");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "invites" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "inviter_id" TEXT NOT NULL REFERENCES "users"("id"),
      "invitee_id" TEXT REFERENCES "users"("id"),
      "status" TEXT NOT NULL DEFAULT 'pending',
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "completed_at" TIMESTAMP
    )
  `);
  console.log("✓ Created invites table");

  // Fix existing invite codes: regenerate any that are not 6 uppercase alphanumeric chars
  const foldersToFix = await sql`
    SELECT id FROM folders WHERE length(invite_code) != 6 OR invite_code ~ '[^A-Z0-9]'
  `;
  for (const folder of foldersToFix) {
    const newCode = generateCode();
    await sql`UPDATE folders SET invite_code = ${newCode} WHERE id = ${folder.id}`;
  }
  if (foldersToFix.length > 0) {
    console.log(`✓ Fixed ${foldersToFix.length} folder invite codes to 6-char uppercase alphanumeric`);
  }

  // Fix user invite codes too
  const usersToFix = await sql`
    SELECT id FROM users WHERE length(invite_code) != 6 OR invite_code ~ '[^A-Z0-9]'
  `;
  for (const user of usersToFix) {
    const newCode = generateCode();
    await sql`UPDATE users SET invite_code = ${newCode} WHERE id = ${user.id}`;
  }
  if (usersToFix.length > 0) {
    console.log(`✓ Fixed ${usersToFix.length} user invite codes to 6-char uppercase alphanumeric`);
  }

  await sql.end();
  console.log("Done!");
}

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
