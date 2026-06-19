# CDY Deployment Guide — v1.0.0

## Prerequisites

- Docker Desktop running
- `.env.docker` file present at repo root (see `.env.example`)
- Dev postgres (`cdy_postgres`) running — shares `cdy_network` with prod containers

---

## Production Stack

| Container | Image | Port |
|-----------|-------|------|
| `cdy_api_prod` | `cdy-api:prod` | 3251 |
| `cdy_web_prod` | `cdy-web:prod` | 3250 |
| `cdy_postgres_prod` | `postgres:15` | 5432 (internal) |

---

## Deploy Steps

### 1. Pull latest code

```bash
git pull origin master
```

### 2. Build API image

```bash
docker build -f apps/api/Dockerfile.prod -t cdy-api:prod .
```

### 3. Build Web image

```bash
docker build -f apps/web/Dockerfile.prod -t cdy-web:prod .
```

### 4. Run database migration

```bash
# From host (dev postgres must be reachable on port 5433):
DATABASE_URL=postgresql://postgres:password@localhost:5433/cdy_inhouse \
  npx prisma db push --schema=apps/api/prisma/schema.prisma

# Or from inside the running API container:
docker exec -it cdy_api_prod npx prisma db push
```

### 5. Force-recreate containers

```bash
docker compose -f docker-compose.prod.yml --env-file .env.docker up -d --force-recreate
```

### 6. Verify containers are healthy

```bash
docker ps | grep cdy
docker logs cdy_api_prod --tail 50
docker logs cdy_web_prod --tail 20
```

### 7. Smoke test

- [ ] Login page loads at `http://localhost:3250/login`
- [ ] CEO login → redirects to `/finance`
- [ ] IT login → redirects to `/it`
- [ ] Finance dashboard loads with data
- [ ] CRM pipeline loads
- [ ] HR employees list loads
- [ ] Projects list loads
- [ ] CEO Dashboard loads at `/ceo` (CEO role only)
- [ ] Notifications bell renders and count updates
- [ ] Invoice PDF generation works
- [ ] Module switcher navigates between modules
- [ ] Cron logs visible at `GET /api/v1/it/cron-logs` (IT Admin)

---

## Rollback

```bash
# Tag the previous working image before deploying
docker tag cdy-api:prod cdy-api:prod-backup

# Rollback
docker tag cdy-api:prod-backup cdy-api:prod
docker compose -f docker-compose.prod.yml --env-file .env.docker up -d --force-recreate cdy_api_prod
```

---

## v1.0.0 Checklist

- [x] Sprint 1–21: Finance, CRM, HR, Projects core
- [x] Sprint 22: Sales module (campaigns, agents, activity logs)
- [x] Sprint 23: Marketing, Software, Branding, Influencer modules
- [x] Sprint 24: CEO Global Dashboard
- [x] Sprint 25: Production hardening
  - [x] CronLog model + composite indexes (5 models)
  - [x] CacheKeys and CacheTTL registry
  - [x] GlobalExceptionFilter — correlationId, timestamp, path, Prisma P2002/P2025/P2003
  - [x] PerformanceInterceptor — logs requests >500ms globally
  - [x] All 9 cron jobs write CronLog records (itemsProcessed, errors, status)
  - [x] IT module — `GET /api/v1/it/cron-logs` (IT Admin, paginated)
  - [x] Debug controller — all 9 jobs, production guard, `it.audit:write` permission
  - [x] ErrorBoundary component wraps CEO dashboard sections
  - [x] SYSTEM_OVERVIEW.md
  - [x] DEPLOYMENT.md

---

## Environment File Template (`.env.docker`)

```env
DATABASE_URL=postgresql://postgres:password@cdy_postgres_prod:5432/cdy_inhouse
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
FRONTEND_URL=http://localhost:3250
NODE_ENV=production
PORT=3251
NEXT_PUBLIC_API_URL=http://cdy_api_prod:3251
SENTRY_DSN=
UPLOAD_DIR=/app/uploads
```

---

## Useful Commands

```bash
# View API logs live
docker logs cdy_api_prod -f

# Connect to prod DB
docker exec -it cdy_postgres_prod psql -U postgres -d cdy_inhouse

# Push schema changes to prod DB (from inside API container)
docker exec -it cdy_api_prod npx prisma db push

# Trigger a debug cron job (non-prod, IT Admin)
curl -X POST http://localhost:3251/api/v1/debug/run-cron/overdue \
  -H "Cookie: cdy_auth=<token>"
```
