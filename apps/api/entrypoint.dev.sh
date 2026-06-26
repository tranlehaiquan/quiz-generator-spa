#!/bin/sh
set -e

DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}

echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."

until node -e "
  const net = require('net');
  const sock = net.createConnection({ host: '$DB_HOST', port: $DB_PORT, timeout: 3000 });
  sock.on('connect', () => { sock.end(); process.exit(0); });
  sock.on('error', () => process.exit(1));
  sock.on('timeout', () => { sock.destroy(); process.exit(1); });
" 2>/dev/null; do
  sleep 2
done

echo "Running migrations..."
npx tsx apps/api/src/db/migrate.ts

echo "Starting dev server..."
exec pnpm --filter @aeroquiz/api dev
