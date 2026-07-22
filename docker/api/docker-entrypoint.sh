#!/bin/sh
set -e

cd /app/apps/api

# Allow one-off commands to bypass startup migrate/seed/server
# e.g. docker compose run --rm --no-deps api npx prisma migrate resolve --rolled-back ...
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "Running database migrations..."
npx prisma migrate deploy

if [ "${SEED_ON_STARTUP:-true}" = "true" ]; then
  echo "Running database seed (skipped if data already exists)..."
  pnpm run prisma:seed
else
  echo "SEED_ON_STARTUP=false — skipping seed"
fi

echo "Starting API server..."
exec node dist/src/main.js
