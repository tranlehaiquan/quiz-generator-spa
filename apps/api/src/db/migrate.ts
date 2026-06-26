import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://quiz:quizsecret@localhost:5432/quizdb' });

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
`;

async function main() {
  console.log('Running database migration...');
  try {
    await pool.query(migration);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
