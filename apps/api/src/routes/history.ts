import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const history = new Hono()
  .get('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    const entries = await db.select()
      .from(schema.history)
      .where(eq(schema.history.userId, userId))
      .orderBy(schema.history.timestamp);

    return c.json(entries);
  })
  .post('/', requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const userId = c.get('userId');

      if (!body.quizId || !body.quizTitle || body.correctCount === undefined || !body.totalCount) {
        return c.json({ error: 'Invalid history entry structure' }, 400);
      }

      const newEntry = {
        id: 'history-' + Date.now(),
        userId,
        quizId: body.quizId,
        quizTitle: body.quizTitle,
        correctCount: Number(body.correctCount),
        totalCount: Number(body.totalCount),
        timeTaken: body.timeTaken || '0s',
        timestamp: Date.now(),
      };

      await db.insert(schema.history).values(newEntry);

      return c.json(newEntry, 201);
    } catch {
      return c.json({ error: 'Malformed payload body' }, 400);
    }
  })
  .delete('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    await db.delete(schema.history).where(eq(schema.history.userId, userId));
    return c.json({ success: true });
  });

export default history;
