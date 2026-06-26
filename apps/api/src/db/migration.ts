import { Pool } from 'pg';

const MIGRATION_SQL = `
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

export async function runMigrations(databaseUrl: string): Promise<void> {
  const maxRetries = 5;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 10000 });
    try {
      console.log(`Running migrations (attempt ${attempt}/${maxRetries})...`);
      await pool.query(MIGRATION_SQL);
      console.log('Migration completed.');
      return;
    } catch (err: any) {
      lastError = err;
      console.error(`Migration attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      }
    } finally {
      await pool.end();
    }
  }

  throw lastError || new Error('All migration attempts failed');
}
