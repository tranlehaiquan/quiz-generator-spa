import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const dbPath = path.join(__dirname, '../../db.json');
  if (!fs.existsSync(dbPath)) {
    console.log('No db.json found, nothing to migrate.');
    process.exit(0);
  }

  const raw = fs.readFileSync(dbPath, 'utf-8');
  const data = JSON.parse(raw);
  const { customQuizzes = [], history: historyEntries = [] } = data;

  if (customQuizzes.length === 0 && historyEntries.length === 0) {
    console.log('db.json is empty, nothing to migrate.');
    process.exit(0);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Find the first user to assign migrated content to
  const { rows } = await pool.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
  if (rows.length === 0) {
    console.log('No users exist yet. Sign up first, then run this migration again.');
    await pool.end();
    process.exit(1);
  }

  const userId = rows[0].id;
  console.log(`Migrating data to user: ${userId}`);

  let imported = 0;
  for (const quiz of customQuizzes) {
    const exists = await pool.query('SELECT id FROM quizzes WHERE id = $1', [quiz.id]);
    if (exists.rows.length > 0) continue;

    await pool.query(
      `INSERT INTO quizzes (id, user_id, title, description, tags, questions, is_builtin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [quiz.id, userId, quiz.title, quiz.description || '', JSON.stringify(quiz.tags || []), JSON.stringify(quiz.questions || []), false]
    );
    imported++;
  }

  let histImported = 0;
  for (const entry of historyEntries) {
    const exists = await pool.query('SELECT id FROM history WHERE id = $1', [entry.id]);
    if (exists.rows.length > 0) continue;

    await pool.query(
      `INSERT INTO history (id, user_id, quiz_id, quiz_title, correct_count, total_count, time_taken, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [entry.id, userId, entry.quizId, entry.quizTitle, entry.correctCount, entry.totalCount, entry.timeTaken || '0s', entry.timestamp]
    );
    histImported++;
  }

  await pool.end();
  console.log(`Migrated ${imported} quizzes and ${histImported} history entries.`);
}

main();
