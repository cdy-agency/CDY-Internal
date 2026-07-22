#!/bin/sh
# Unblocks Prisma P3009 for failed soft_delete migration.
# Run on the host that has the failing DB (cdy_internal / prod / staging).
#
# Usage:
#   COMPOSE_FILE=docker-compose.prod.yml ENV_FILE=.env.docker ./scripts/fix-p3009-soft-delete.sh
#
# Default: docker-compose.yml + .env

set -e

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"
MIGRATION='20260709120000_soft_delete_all_modules'

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  . "$ENV_FILE"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-cdy_user}"
POSTGRES_DB="${POSTGRES_DB:-cdy_system}"

echo "=== Using compose=$COMPOSE_FILE db=$POSTGRES_DB user=$POSTGRES_USER ==="
echo "=== Step 1: Show failed migration record ==="
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT migration_name, finished_at, rolled_back_at, started_at FROM _prisma_migrations WHERE migration_name = '${MIGRATION}';" \
  || true

echo "=== Step 2: Check how many deletedAt columns already exist ==="
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT COUNT(*) AS deleted_at_columns
   FROM information_schema.columns
   WHERE table_schema = 'public' AND column_name = 'deletedAt';"

echo "=== Step 3: Mark failed migration as rolled back ==="
docker compose -f "$COMPOSE_FILE" run --rm --no-deps api \
  npx prisma migrate resolve --rolled-back "$MIGRATION"

echo "=== Step 4: Re-apply migrations (soft_delete is now idempotent) ==="
docker compose -f "$COMPOSE_FILE" run --rm --no-deps api npx prisma migrate deploy

echo "=== Step 5: Status ==="
docker compose -f "$COMPOSE_FILE" run --rm --no-deps api npx prisma migrate status

echo "Done. Restart API if needed: docker compose -f $COMPOSE_FILE up -d api"
