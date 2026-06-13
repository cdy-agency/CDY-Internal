#!/bin/sh
# Unblocks Prisma P3009 caused by failed sprint14 migration (wrong timestamp).
# Run on production host from repo root: ./scripts/fix-p3009-migration.sh

set -e

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.docker}"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  . "$ENV_FILE"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-cdy}"
POSTGRES_DB="${POSTGRES_DB:-cdy_system}"
OLD_MIGRATION='20260610100000_sprint14_hr_performance_salary_history'
NEW_MIGRATION='20260629100000_sprint14_hr_performance_salary_history'

echo "=== Step 1: Stop API crash loop ==="
docker compose -f "$COMPOSE_FILE" stop api 2>/dev/null || true

echo "=== Step 2: Remove failed migration record from database ==="
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "DELETE FROM _prisma_migrations WHERE migration_name = '${OLD_MIGRATION}';"

echo "=== Step 3: Check if Sprint 14 tables already exist ==="
TABLE_EXISTS=$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PerformanceReview');")

echo "PerformanceReview exists: ${TABLE_EXISTS}"

echo "=== Step 4: Ensure correct migration folder on disk ==="
OLD_DIR="apps/api/prisma/migrations/${OLD_MIGRATION}"
NEW_DIR="apps/api/prisma/migrations/${NEW_MIGRATION}"

if [ -d "$OLD_DIR" ] && [ ! -d "$NEW_DIR" ]; then
  echo "Renaming ${OLD_DIR} -> ${NEW_DIR}"
  mv "$OLD_DIR" "$NEW_DIR"
elif [ -d "$OLD_DIR" ] && [ -d "$NEW_DIR" ]; then
  echo "Removing duplicate old migration folder ${OLD_DIR}"
  rm -rf "$OLD_DIR"
fi

if [ ! -d "$NEW_DIR" ]; then
  echo "ERROR: ${NEW_DIR} not found. Run git pull to get the renamed migration."
  exit 1
fi

echo "=== Step 5: Run migrations ==="
docker compose -f "$COMPOSE_FILE" run --rm --no-deps api npx prisma migrate deploy

if [ "$TABLE_EXISTS" = "t" ]; then
  echo "=== Step 6: Mark renamed migration applied (tables already existed) ==="
  docker compose -f "$COMPOSE_FILE" run --rm --no-deps api \
    npx prisma migrate resolve --applied "$NEW_MIGRATION" 2>/dev/null || true
  docker compose -f "$COMPOSE_FILE" run --rm --no-deps api npx prisma migrate deploy
fi

echo "=== Step 7: Migration status ==="
docker compose -f "$COMPOSE_FILE" run --rm --no-deps api npx prisma migrate status

echo "=== Step 8: Start API ==="
docker compose -f "$COMPOSE_FILE" up -d api

echo "Done."
