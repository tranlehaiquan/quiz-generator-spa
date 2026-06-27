import { pgTable, text, integer, jsonb, boolean, timestamp, bigint } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const quizzes = pgTable('quizzes', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  tags: jsonb('tags').notNull().$type<string[]>().default([]),
  questions: jsonb('questions').notNull().$type<{
    question: string; options: string[]; answer: string; explanation?: string;
  }[]>().default([]),
  isBuiltin: boolean('is_builtin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const history = pgTable('history', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  quizId: text('quiz_id').notNull(),
  quizTitle: text('quiz_title').notNull(),
  correctCount: integer('correct_count').notNull().default(0),
  totalCount: integer('total_count').notNull().default(0),
  timeTaken: text('time_taken').notNull().default('0s'),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
});

export const guestAttempts = pgTable('guest_attempts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  quizId: text('quiz_id').references(() => quizzes.id, { onDelete: 'cascade' }).notNull(),
  playerName: text('player_name').notNull(),
  correctCount: integer('correct_count').notNull().default(0),
  totalCount: integer('total_count').notNull().default(0),
  timeTaken: text('time_taken').notNull().default('0s'),
  answers: jsonb('answers').$type<Record<string, string>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
