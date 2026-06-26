import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const getSecret = () => process.env.JWT_SECRET || 'dev-secret';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const auth = new Hono()
  .get('/setup-status', async (c) => {
    const [row] = await db.select({ count: schema.users.id }).from(schema.users).limit(1);
    return c.json({ needsSetup: !row });
  })
  .post('/setup', async (c) => {
    // Only allow setup if no users exist
    const [row] = await db.select({ count: schema.users.id }).from(schema.users).limit(1);
    if (row) {
      return c.json({ error: 'Setup already completed.' }, 403);
    }

    try {
      const body = await c.req.json();
      const parsed = signupSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
      }

      const { email, password, name } = parsed.data;
      const passwordHash = await bcrypt.hash(password, 12);

      const [user] = await db.insert(schema.users)
        .values({ email, passwordHash, name })
        .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name });

      const token = jwt.sign({ userId: user.id, email: user.email }, getSecret(), { expiresIn: '7d' });

      return c.json({ user: { id: user.id, email: user.email, name: user.name }, token }, 201);
    } catch (err: any) {
      console.error('Setup error:', err);
      return c.json({ error: 'Internal server error' }, 500);
    }
  })
  .get('/config', (c) => {
    return c.json({
      allowSignup: process.env.ALLOW_SIGNUP !== 'false',
    });
  })
  .post('/signup', async (c) => {
    if (process.env.ALLOW_SIGNUP === 'false') {
      return c.json({ error: 'Signup is currently disabled.' }, 403);
    }

    try {
      const body = await c.req.json();
      const parsed = signupSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
      }

      const { email, password, name } = parsed.data;

      const existing = await db.select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (existing.length > 0) {
        return c.json({ error: 'Email already registered' }, 409);
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const [user] = await db.insert(schema.users)
        .values({ email, passwordHash, name })
        .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name });

      const token = jwt.sign({ userId: user.id, email: user.email }, getSecret(), { expiresIn: '7d' });

      return c.json({ user: { id: user.id, email: user.email, name: user.name }, token }, 201);
    } catch (err: any) {
      console.error('Signup error:', err);
      return c.json({ error: 'Internal server error' }, 500);
    }
  })
  .post('/login', async (c) => {
    try {
      const body = await c.req.json();
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
      }

      const { email, password } = parsed.data;

      const [user] = await db.select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (!user) {
        return c.json({ error: 'Invalid email or password' }, 401);
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return c.json({ error: 'Invalid email or password' }, 401);
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, getSecret(), { expiresIn: '7d' });

      return c.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (err: any) {
      console.error('Login error:', err);
      return c.json({ error: 'Internal server error' }, 500);
    }
  })
  .get('/me', requireAuth, async (c) => {
    const userId = c.get('userId');
    const [user] = await db.select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      avatarUrl: schema.users.avatarUrl,
    })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
  });

export default auth;
