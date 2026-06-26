#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until node -e "
  const { Pool } = require('pg');
  const p = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
  p.query('SELECT 1').then(() => { p.end(); process.exit(0); }).catch(() => { p.end(); process.exit(1); });
" 2>/dev/null; do
  sleep 2
done

echo "Running migrations..."
npx tsx apps/api/src/db/migrate.ts

echo "Starting dev server..."
exec pnpm --filter @aeroquiz/api dev
