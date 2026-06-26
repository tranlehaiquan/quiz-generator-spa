import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { db, schema } from './db/index.js';
import { runMigrations } from './db/migration.js';
import authRoutes from './routes/auth.js';
import quizRoutes from './routes/quizzes.js';
import historyRoutes from './routes/history.js';
import aiRoutes from './routes/ai.js';
import scanRoutes from './routes/scan.js';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const routes = app
  .get('/api/health', async (c) => {
    try {
      await db.select().from(schema.users).limit(1);
      return c.json({ status: 'ok', db: 'connected' });
    } catch {
      return c.json({ status: 'degraded', db: 'disconnected' }, 503);
    }
  })
  .route('/api/auth', authRoutes)
  .route('/api/quizzes', quizRoutes)
  .route('/api/history', historyRoutes)
  .route('/api/ai', aiRoutes)
  .route('/api', scanRoutes);

export type AppType = typeof routes;

async function start() {
  try {
    await runMigrations(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/quizdb');
  } catch (err: any) {
    console.error('Migration failed:', err.message);
    console.error('Starting without DB — health will report degraded.');
  }

  const port = 3000;
  console.log(`Hono API Server running on port ${port}...`);
  serve({ fetch: app.fetch, port });
}

start();
