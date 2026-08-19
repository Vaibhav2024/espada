import postgres from "postgres";

const sql = postgres("postgresql://espada:localdev@127.0.0.1:5433/espada");

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

  await sql.end();
  console.log("Done!");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
