#!/bin/sh
set -e

# Extract host and port from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}

echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."

# TCP-level health check — no DB driver needed
until node -e "
  const net = require('net');
  const sock = net.createConnection({ host: '$DB_HOST', port: $DB_PORT, timeout: 3000 });
  sock.on('connect', () => { sock.end(); process.exit(0); });
  sock.on('error', () => process.exit(1));
  sock.on('timeout', () => { sock.destroy(); process.exit(1); });
" 2>/dev/null; do
  echo "  Postgres not ready — retrying in 2s..."
  sleep 2
done

echo "PostgreSQL is reachable. Running migrations..."
node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  pool.query(\`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tags JSONB NOT NULL DEFAULT '[]',
      questions JSONB NOT NULL DEFAULT '[]',
      is_builtin BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quiz_id TEXT NOT NULL,
      quiz_title TEXT NOT NULL,
      correct_count INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0,
      time_taken TEXT NOT NULL DEFAULT '0s',
      timestamp BIGINT NOT NULL
    );
  \`).then(() => { console.log('Migration complete.'); pool.end(); process.exit(0); }).catch(e => { console.error(e); pool.end(); process.exit(1); });
"

echo "Starting API server..."
exec node dist/index.js
