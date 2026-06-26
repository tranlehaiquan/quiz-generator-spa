import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';

const getSecret = () => process.env.JWT_SECRET || 'dev-secret';

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, getSecret()) as { userId: string; email: string };
    c.set('userId', payload.userId);
    c.set('userEmail', payload.email);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});

export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, getSecret()) as { userId: string; email: string };
      c.set('userId', payload.userId);
      c.set('userEmail', payload.email);
    } catch {
      // Token invalid, continue as guest
    }
  }
  await next();
});

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
  }
}
