import "dotenv/config";
import { Client, Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@postgres:5432/quizdb";

async function ensureDatabase() {
  const url = new URL(DATABASE_URL);
  const dbName = url.pathname.slice(1);
  if (!dbName) return;

  url.pathname = "/postgres";
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();

  const exists = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName],
  );
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`Created database "${dbName}".`);
  }

  await admin.end();
}

const pool = new Pool({ connectionString: DATABASE_URL });

const migration = `
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "password_hash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "avatar_url" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "quizzes" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "tags" JSONB NOT NULL DEFAULT '[]',
  "questions" JSONB NOT NULL DEFAULT '[]',
  "is_builtin" BOOLEAN DEFAULT FALSE NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "history" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "quiz_id" TEXT NOT NULL,
  "quiz_title" TEXT NOT NULL,
  "correct_count" INTEGER NOT NULL DEFAULT 0,
  "total_count" INTEGER NOT NULL DEFAULT 0,
  "time_taken" TEXT NOT NULL DEFAULT '0s',
  "timestamp" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS "guest_attempts" (
  "id" TEXT PRIMARY KEY,
  "quiz_id" TEXT NOT NULL REFERENCES "quizzes"("id") ON DELETE CASCADE,
  "player_name" TEXT NOT NULL,
  "correct_count" INTEGER NOT NULL DEFAULT 0,
  "total_count" INTEGER NOT NULL DEFAULT 0,
  "time_taken" TEXT NOT NULL DEFAULT '0s',
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add answers column to guest_attempts if it doesn't exist (safe migration)
ALTER TABLE "guest_attempts" ADD COLUMN IF NOT EXISTS "answers" JSONB DEFAULT '{}';
`;

async function main() {
  console.log("Running database migration...");
  try {
    await ensureDatabase();
    await pool.query(migration);
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
