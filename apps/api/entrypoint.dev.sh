#!/bin/sh
set -e

echo "Running database migration..."
npx tsx apps/api/src/db/migrate.ts

echo "Starting dev server..."
exec pnpm --filter @aeroquiz/api dev
