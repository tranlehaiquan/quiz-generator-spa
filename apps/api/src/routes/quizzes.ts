import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { BUILTIN_QUIZZES } from '../data/builtin.js';

// Simple in-memory IP rate limiter to prevent spamming public guest attempts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const rateLimiter = (limit: number, windowMs: number) => {
  return async (c: any, next: any) => {
    const ip = c.req.header('x-forwarded-for') || 'anonymous';
    const now = Date.now();

    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    } else {
      record.count += 1;
      if (record.count > limit) {
        return c.json({ error: 'Too many requests, please try again later.' }, 429);
      }
    }

    await next();
  };
};

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
  .put('/:id', requireAuth, async (c) => {
    try {
      const id = c.req.param('id');
      const userId = c.get('userId');
      const body = await c.req.json();

      if (!body.title || !body.questions || !Array.isArray(body.questions) || body.questions.length === 0) {
        return c.json({ error: 'Invalid quiz structure' }, 400);
      }

      // Verify the quiz exists and belongs to this user
      const [quiz] = await db.select()
        .from(schema.quizzes)
        .where(and(eq(schema.quizzes.id, id), eq(schema.quizzes.userId, userId)))
        .limit(1);

      if (!quiz) {
        return c.json({ error: 'Quiz not found or not authorized' }, 404);
      }

      const updatedQuiz = {
        title: body.title,
        description: body.description || '',
        tags: body.tags || ['Custom'],
        questions: body.questions as Question[],
        updatedAt: new Date(),
      };

      await db.update(schema.quizzes)
        .set(updatedQuiz)
        .where(eq(schema.quizzes.id, id));

      return c.json({
        id,
        title: updatedQuiz.title,
        description: updatedQuiz.description,
        tags: updatedQuiz.tags,
        questions: updatedQuiz.questions,
      });
    } catch (err: any) {
      return c.json({ error: err.message || 'Failed to update quiz' }, 400);
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
  })
  .post('/:id/guest-attempts', rateLimiter(10, 60000), async (c) => {
    try {
      const quizId = c.req.param('id');
      const body = await c.req.json();
      const { playerName, timeTaken, answers } = body;

      if (!playerName || typeof playerName !== 'string' || playerName.trim() === '') {
        return c.json({ error: 'Player name is required' }, 400);
      }

      // Check if quiz exists and get its questions
      let quizQuestions: any[] = [];
      const foundBuiltin = BUILTIN_QUIZZES.find(q => q.id === quizId);
      if (foundBuiltin) {
        quizQuestions = foundBuiltin.questions;
      } else {
        const [found] = await db.select().from(schema.quizzes).where(eq(schema.quizzes.id, quizId)).limit(1);
        if (!found) return c.json({ error: 'Quiz not found' }, 404);
        quizQuestions = found.questions;
      }

      // Calculate score on the backend
      let correctCount = 0;
      const totalCount = quizQuestions.length;

      quizQuestions.forEach((q, idx) => {
        const userAnswer = answers && answers[idx];
        if (userAnswer === q.answer) {
          correctCount++;
        }
      });

      const newAttempt = {
        id: crypto.randomUUID(),
        quizId,
        playerName: playerName.trim(),
        correctCount,
        totalCount,
        timeTaken: String(timeTaken) || '0s',
        answers: answers || {},
      };

      await db.insert(schema.guestAttempts).values(newAttempt);

      return c.json({ 
        success: true, 
        attemptId: newAttempt.id,
        correctCount,
        totalCount,
        timeTaken: newAttempt.timeTaken,
      }, 201);
    } catch (err: any) {
      return c.json({ error: err.message || 'Failed to save guest score' }, 400);
    }
  })
  .get('/:id/guest-attempts', requireAuth, async (c) => {
    try {
      const quizId = c.req.param('id');
      const userId = c.get('userId');

      // Verify the quiz belongs to this user
      const [quiz] = await db.select()
        .from(schema.quizzes)
        .where(and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.userId, userId)))
        .limit(1);

      if (!quiz) {
        return c.json({ error: 'Quiz not found or not authorized' }, 403);
      }

      // Fetch guest scores ordered by score desc, then time asc
      const attempts = await db.select()
        .from(schema.guestAttempts)
        .where(eq(schema.guestAttempts.quizId, quizId))
        .orderBy(schema.guestAttempts.createdAt);

      return c.json({ quiz, attempts });
    } catch (err: any) {
      return c.json({ error: err.message || 'Failed to fetch scores' }, 400);
    }
  })
  .get('/:id/guest-attempts/:attemptId', requireAuth, async (c) => {
    try {
      const quizId = c.req.param('id');
      const attemptId = c.req.param('attemptId');
      const userId = c.get('userId');

      // Verify quiz ownership
      let quizQuestions: Question[] = [];
      let quizTitle = '';
      const foundBuiltin = BUILTIN_QUIZZES.find(q => q.id === quizId);
      if (foundBuiltin) {
        quizQuestions = foundBuiltin.questions;
        quizTitle = foundBuiltin.title;
      } else {
        const [quiz] = await db.select()
          .from(schema.quizzes)
          .where(and(eq(schema.quizzes.id, quizId), eq(schema.quizzes.userId, userId)))
          .limit(1);
        if (!quiz) return c.json({ error: 'Quiz not found or not authorized' }, 403);
        quizQuestions = quiz.questions as Question[];
        quizTitle = quiz.title;
      }

      const [attempt] = await db.select()
        .from(schema.guestAttempts)
        .where(eq(schema.guestAttempts.id, attemptId))
        .limit(1);

      if (!attempt) return c.json({ error: 'Attempt not found' }, 404);

      // Build per-question breakdown
      const answersMap = (attempt.answers || {}) as Record<string, string>;
      const breakdown = quizQuestions.map((q, idx) => {
        const playerAnswer = answersMap[String(idx)] ?? null;
        const isCorrect = playerAnswer === q.answer;
        return {
          index: idx,
          question: q.question,
          options: q.options,
          correctAnswer: q.answer,
          playerAnswer,
          isCorrect,
          explanation: q.explanation ?? null,
        };
      });

      return c.json({
        attempt,
        quizTitle,
        breakdown,
      });
    } catch (err: any) {
      return c.json({ error: err.message || 'Failed to fetch attempt detail' }, 400);
    }
  });

export default quizzes;
