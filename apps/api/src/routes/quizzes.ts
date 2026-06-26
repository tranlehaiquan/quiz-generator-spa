import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { BUILTIN_QUIZZES } from '../data/builtin.js';

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  tags: string[];
  questions: Question[];
}

const quizzes = new Hono()
  .get('/', optionalAuth, async (c) => {
    const userId = c.get('userId');

    let custom: any[] = [];
    if (userId) {
      custom = await db.select()
        .from(schema.quizzes)
        .where(eq(schema.quizzes.userId, userId));
    }

    const mapped: Quiz[] = custom.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      tags: q.tags as string[],
      questions: q.questions as Question[],
    }));

    return c.json({ builtin: BUILTIN_QUIZZES, custom: mapped });
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');

    const foundBuiltin = BUILTIN_QUIZZES.find(q => q.id === id);
    if (foundBuiltin) return c.json(foundBuiltin);

    const [found] = await db.select().from(schema.quizzes).where(eq(schema.quizzes.id, id)).limit(1);
    if (!found) return c.json({ error: 'Quiz not found' }, 404);

    return c.json({
      id: found.id,
      title: found.title,
      description: found.description,
      tags: found.tags as string[],
      questions: found.questions as Question[],
    });
  })
  .post('/', requireAuth, async (c) => {
    try {
      const body = await c.req.json();
      const userId = c.get('userId');

      if (!body.title || !body.questions || !Array.isArray(body.questions) || body.questions.length === 0) {
        return c.json({ error: 'Invalid quiz structure' }, 400);
      }

      const newQuiz = {
        id: 'custom-' + Date.now(),
        userId,
        title: body.title,
        description: body.description || 'Custom user created quiz.',
        tags: body.tags || ['Custom'],
        questions: body.questions as Question[],
        isBuiltin: false,
      };

      await db.insert(schema.quizzes).values(newQuiz);

      return c.json({
        id: newQuiz.id,
        title: newQuiz.title,
        description: newQuiz.description,
        tags: newQuiz.tags,
        questions: newQuiz.questions,
      }, 201);
    } catch {
      return c.json({ error: 'Malformed JSON body payload' }, 400);
    }
  })
  .delete('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');

    const result = await db.delete(schema.quizzes)
      .where(and(eq(schema.quizzes.id, id), eq(schema.quizzes.userId, userId)))
      .returning({ id: schema.quizzes.id });

    if (result.length === 0) {
      return c.json({ error: 'Custom quiz not found or not authorized' }, 404);
    }

    return c.json({ success: true, id });
  });

export default quizzes;
