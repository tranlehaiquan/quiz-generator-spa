import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
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
  .route('/api/auth', authRoutes)
  .route('/api/quizzes', quizRoutes)
  .route('/api/history', historyRoutes)
  .route('/api/ai', aiRoutes)
  .route('/api', scanRoutes);

export type AppType = typeof routes;

const port = 3000;
console.log(`Hono API Server is running on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});
