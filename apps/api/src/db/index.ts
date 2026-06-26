import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/quizdb';

const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err.message);
});

export const db = drizzle(pool, { schema });
export { schema };
