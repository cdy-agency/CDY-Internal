# CDY In-House System — Tech Stack & Setup Guide

---

## Tech stack

### Backend

| Tool | Version | Purpose |
|---|---|---|
| NestJS | 10.x | Backend framework — modular, TypeScript-first |
| Node.js | 20.x | Runtime |
| TypeScript | 5.x | Language — strict mode throughout |
| Prisma | 5.x | ORM and database migrations |
| PostgreSQL | 15 | Primary database |
| Redis | 7 | Caching, job queue, rate limiting |
| PgBouncer | latest | Database connection pooling |
| BullMQ | 3.x | Background job queue (PDF generation) |
| Puppeteer | latest | PDF generation via headless Chrome |
| Resend | latest | Transactional email delivery |
| Cloudflare R2 | — | File storage (receipts, PDFs, uploads) |
| Sentry | latest | Error monitoring and alerting |
| bcrypt | — | Password hashing (cost factor 12) |
| jsonwebtoken | — | JWT auth tokens |
| Multer | — | File upload handling |
| class-validator | — | DTO input validation |
| class-transformer | — | DTO transformation |
| date-fns | — | Date manipulation |

### Frontend

| Tool | Version | Purpose |
|---|---|---|
| Next.js | 14.x | React framework with App Router |
| React | 18.x | UI library |
| TypeScript | 5.x | Language — strict mode |
| Tailwind CSS | 3.x | Utility-first styling |
| @tanstack/react-query | 5.x | Server state and caching |
| axios | — | HTTP client |
| @dnd-kit/core | — | Drag and drop (CRM kanban, task boards) |
| date-fns | — | Date formatting |
| lucide-react | — | Icon library |
| sonner | — | Toast notifications |

### Infrastructure

| Tool | Purpose |
|---|---|
| Docker | Container runtime |
| Docker Compose | Multi-container orchestration |
| Nginx | Reverse proxy, SSL termination, rate limiting |
| GitHub Actions | CI/CD pipeline — lint, typecheck, build, deploy |
| Turborepo | Monorepo build system |
| pnpm | Package manager |

---

## Repository structure

```
cdy-internal/
├── apps/
│   ├── api/                    NestJS backend
│   │   ├── src/
│   │   │   ├── auth/           Authentication (JWT, refresh, logout)
│   │   │   ├── finance/        Finance module (invoices, payments, payroll, etc.)
│   │   │   ├── it/             IT/RBAC module
│   │   │   ├── crm/            CRM module
│   │   │   ├── hr/             HR module
│   │   │   ├── projects/       Projects module
│   │   │   ├── ventures/       Ventures module
│   │   │   ├── marketing/      Marketing Services
│   │   │   ├── software/       Software & Web Dev Services
│   │   │   ├── branding/       Branding Services
│   │   │   ├── influencer/     Influencer Marketing
│   │   │   ├── sales/          Sales Services
│   │   │   ├── products/       Tech Products
│   │   │   ├── ceo/            CEO Dashboard
│   │   │   ├── common/         Shared utilities, interceptors, filters
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   └── package.json
│   └── web/                    Next.js frontend
│       ├── app/                App Router pages
│       ├── components/         Shared UI components
│       │   ├── dashboard/      MetricHero, DonutChart, LineChart, etc.
│       │   ├── crm/            CRM-specific components
│       │   ├── finance/        Finance-specific components
│       │   └── ...
│       ├── context/            React context (Auth, Permissions)
│       ├── hooks/              Custom hooks
│       ├── lib/                API client, utilities
│       └── middleware.ts       Route protection
├── docker/
│   ├── api/Dockerfile
│   ├── web/Dockerfile
│   ├── nginx/nginx.conf
│   └── pgbouncer/pgbouncer.ini
├── docker-compose.yml          Development
├── docker-compose.prod.yml     Production
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Local development setup

### Prerequisites

Install these before starting:

```bash
# Node.js 20 (use nvm)
nvm install 20
nvm use 20

# pnpm
npm install -g pnpm

# Docker Desktop
# Download from https://www.docker.com/products/docker-desktop

# Verify installations
node --version    # v20.x.x
pnpm --version    # 8.x.x
docker --version  # Docker version 24.x.x
```

### Step 1 — Clone and install dependencies

```bash
git clone https://github.com/cdy/cdy-internal.git
cd cdy-internal
pnpm install
```

### Step 2 — Set up environment variables

```bash
# Copy example env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Fill in `apps/api/.env`:

```env
# Database
DATABASE_URL="postgresql://cdy_user:your_password@localhost:5432/cdy_db"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth — generate secure random strings (min 64 chars)
JWT_SECRET="your-jwt-secret-min-64-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-64-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
RESEND_FROM_NAME="CDY"

# File storage (Cloudflare R2)
CLOUDFLARE_R2_ACCOUNT_ID="your_account_id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your_access_key"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your_secret_key"
CLOUDFLARE_R2_BUCKET_NAME="cdy-files"
CLOUDFLARE_R2_PUBLIC_URL="https://files.yourdomain.com"

# Puppeteer (PDF generation)
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"

# Error monitoring
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"

# Environment
NODE_ENV="development"
PORT=3001
```

Fill in `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Step 3 — Start Docker services

```bash
# Start PostgreSQL, Redis, and PgBouncer
docker-compose up -d postgres redis pgbouncer

# Verify services are running
docker-compose ps
```

### Step 4 — Set up the database

```bash
# Run all migrations
pnpm --filter api prisma:migrate

# Generate Prisma client
pnpm --filter api prisma:generate

# Seed the database (roles, permissions, sample data)
pnpm --filter api prisma:seed
```

The seed creates:
- All 8 roles with correct default permissions
- All system features registered in RBAC
- Default leave types (Annual, Sick, Unpaid, etc.)
- Default HR settings
- Default CRM settings (lost reasons, score weights)
- Sample departments
- Seed users for each role (see credentials below)

### Step 5 — Start development servers

```bash
# Start both API and web in parallel
pnpm dev

# Or start individually:
pnpm --filter api dev      # API on http://localhost:3001
pnpm --filter web dev      # Web on http://localhost:3000
```

### Seed user credentials

| Role | Email | Password |
|---|---|---|
| CEO | ceo@cdy.com | CDY@2026! |
| Finance Manager | finance@cdy.com | CDY@2026! |
| Operations Manager | ops@cdy.com | CDY@2026! |
| Project Manager | pm@cdy.com | CDY@2026! |
| Sales Agent | sales@cdy.com | CDY@2026! |
| Team Member | member@cdy.com | CDY@2026! |
| IT Administrator | it@cdy.com | CDY@2026! |

**Change all passwords immediately in production.**

---

## Environment variables reference

### Required — API

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Access token signing secret (min 64 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (min 64 chars) |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | Sending email address (must be verified in Resend) |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 API key ID |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 API secret |
| `CLOUDFLARE_R2_BUCKET_NAME` | R2 bucket name |
| `CLOUDFLARE_R2_PUBLIC_URL` | Public URL for serving files |
| `PUPPETEER_EXECUTABLE_PATH` | Path to Chrome/Chromium binary |

### Required — Web

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

### Optional

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | development | Set to `production` in prod |
| `PORT` | 3001 | API server port |
| `SENTRY_DSN` | — | Sentry error tracking DSN |
| `JWT_EXPIRES_IN` | 15m | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | 7d | Refresh token expiry |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | true | Skip bundled Chrome download |

---

## Puppeteer / Chrome setup

Puppeteer is used for PDF generation (invoices, payslips, reports).
It requires a Chrome or Chromium binary.

### In Docker (Alpine Linux)

The Dockerfile installs Chromium from Alpine's package registry:

```dockerfile
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

The NestJS PDF service must use `--no-sandbox` and `--disable-setuid-sandbox`
when running inside Docker as root:

```typescript
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
  ],
})
```

### Installing Chrome if missing from a running container

```bash
docker-compose exec api npx puppeteer browsers install chrome
```

This is temporary — it will not survive a container rebuild.
Always use the Dockerfile approach for a permanent fix.

---

## Database management

### Running migrations

```bash
# Development — creates migration files
pnpm --filter api prisma:migrate
# or
docker-compose exec api npx prisma migrate dev --name your_migration_name

# Production — applies existing migrations only (no new files)
docker-compose exec api npx prisma migrate deploy
```

### Seeding

```bash
# Run the full seed
pnpm --filter api prisma:seed

# The seed is safe to run multiple times:
# - Roles: upserted (name/homeModule updated, key never changes)
# - Features: upserted (name updated)
# - Permissions: created ONLY if they don't exist (existing permissions preserved)
```

### Prisma Studio (database browser)

```bash
pnpm --filter api prisma:studio
# Opens at http://localhost:5555
```

### Database backup

```bash
# Manual backup
docker-compose exec postgres pg_dump -U cdy_user cdy_db > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T postgres psql -U cdy_user cdy_db < backup_20260615.sql
```

---

## Running the test suite

```bash
# Run all tests
pnpm test

# Run API tests only
pnpm --filter api test

# Run with coverage
pnpm --filter api test:cov

# Run e2e tests
pnpm --filter api test:e2e
```

---

## Common development commands

```bash
# Check TypeScript across entire monorepo
pnpm typecheck

# Lint entire monorepo
pnpm lint

# Fix lint issues
pnpm lint:fix

# Build both apps for production
pnpm build

# Run bundle analysis on frontend
cd apps/web && ANALYZE=true pnpm build

# Generate Prisma client after schema changes
pnpm --filter api prisma:generate

# View API logs
docker-compose logs -f api

# Restart a specific service
docker-compose restart api

# Trigger a cron job manually (IT Admin only, dev environment)
curl -X POST http://localhost:3001/api/v1/debug/run-cron/retainers \
  -H "Cookie: cdy_access_token=your_token"
```

---

## Architecture notes

### Authentication

JWT-based with two tokens:
- **Access token** — 15 minute expiry, stored in httpOnly cookie
- **Refresh token** — 7 day expiry, stored in httpOnly cookie

The access token payload includes the user's full permission map so the middleware can check permissions without a database call on every request.

Silent refresh is handled by an axios interceptor. On a 401, the interceptor calls `/auth/refresh` once. If refresh fails, the user is redirected to `/login`.

### Permission system

Permissions are checked at two layers:
1. **Next.js middleware** — reads JWT payload, checks route permissions, redirects if denied
2. **NestJS guards** — `PermissionGuard` + `@RequirePermission('feature.key', 'read'|'write')` on every controller method

The CEO role bypasses both checks — full access is hardcoded.

Permissions are cached in Redis per user for 5 minutes. Cache invalidated when the IT Administrator changes a role's permissions.

### Caching strategy

All cache keys follow the pattern in `apps/api/src/common/cache-keys.ts`.

Cache invalidation is handled by `CacheInvalidationService` which is wired into every service that changes data. Key modules:
- Invoice change → invalidates finance:summary, ceo:summary
- Task status change → invalidates projects:progress:{projectId}, projects:summary
- Lead stage change → invalidates crm:summary, ceo:summary

### Background jobs

All Finance integration triggers (invoice creation from project/campaign creation, commission from deal closure) run via `setImmediate`. This guarantees that a Finance failure never blocks the triggering action. If Finance fails, the error is logged to Sentry and the main record remains unaffected.

PDF generation runs via BullMQ queue. Heavy PDF jobs are queued and processed asynchronously so they do not block API responses.