# CDY In-House Business Management System — System Overview

## Architecture

**Monorepo** managed with pnpm workspaces + Turborepo.

| Package | Tech | Port |
|---------|------|------|
| `apps/api` | NestJS 10, TypeScript | 3251 |
| `apps/web` | Next.js 14 App Router, TypeScript | 3250 |
| `packages/shared` | Shared TS types | — |

**Database:** PostgreSQL 15 (production: `cdy_postgres_prod`, dev: `cdy_postgres`)  
**ORM:** Prisma 5  
**Auth:** JWT (access token in HTTP-only cookie) + refresh token  
**Cache:** In-memory TTL cache (`CacheService`) — resets on restart  
**Jobs:** `@nestjs/schedule` cron jobs — 9 daily automation jobs  
**Monitoring:** Sentry for error tracking; CronLog model for cron observability  
**Containers:** Docker Compose — `cdy_api_prod`, `cdy_web_prod`, `cdy_postgres_prod` on `cdy_network`

---

## Modules

### Finance
Revenue tracking, invoicing, payments, expenses, bills, bank reconciliation, payroll, retainer contracts, commissions, credit notes, payment plans, budget management, tax rates, ventures.

### CRM
Lead capture, sales pipeline (Kanban), proposals, client accounts, conversion reports, follow-up reminders.

### HR
Employee profiles, attendance, leave management, performance reviews, payroll integration, HR settings.

### Projects
Projects, tasks, milestones, time tracking, deliverable approvals, profitability reports, handover documents.

### Marketing
Marketing clients, content calendar (posts, reels, stories), content scheduling, approval workflow.

### Software
Software project lifecycle — requirements, design, dev sprints, QA phases, deployment, maintenance.

### Branding
Branding projects, scope items, design submissions, approval workflow, suppliers.

### Influencer
Influencer database, campaigns, influencer-campaign assignments, deliverables.

### Sales
Field sales campaigns, agents, daily activity logs, weekly reports.

### IT
User management, role management, permission assignment, audit log, cron job monitoring.

### CEO Dashboard
Executive global summary aggregating all modules in a single API call. 60-second auto-refresh.

---

## RBAC

Roles: **CEO**, **Finance Manager**, **Operations Manager**, **Project Manager**, **Sales Agent**, **Team Member**, **IT Administrator**.

Permissions are feature-action pairs (`canRead`/`canWrite`) assigned per role via `RolePermission`. The RBAC seed runs on every API startup via `RbacBootstrapService` (upsert, never destructive).

---

## Authentication Flow

1. POST `/api/v1/auth/login` → sets `cdy_auth` (access, 15 min) + `cdy_refresh` (refresh, 7 days) HTTP-only cookies.
2. Next.js middleware reads JWT from cookie, decodes permissions, enforces per-route access.
3. API validates JWT on every request via `JwtAuthGuard` + `PermissionGuard`.
4. Frontend proxy at `/api/proxy/[...path]` forwards requests to the NestJS API, forwarding cookies.

---

## Cron Jobs (9 daily)

| Time | Job | Purpose |
|------|-----|---------|
| 07:00 | retainer-auto-billing | Auto-generate retainer invoices |
| 07:30 | project-deadline-alerts | Notify assignees of upcoming task deadlines |
| 08:00 | overdue-invoice-detection | Mark invoices past due date as OVERDUE |
| 08:05 | invoice-reminder-cascade | Send reminder emails (3-tier: 0/3/7 days) |
| 08:10 | bill-due-alerts | Notify of bills due within 3 days |
| 08:15 | payment-plan-instalment-alerts | Mark overdue payment plan instalments |
| 08:20 | budget-alerts | Notify of projects exceeding budget thresholds |
| 08:30 | proposal-expiry-check | Auto-expire sent proposals past expiry date |
| 09:00 | crm-follow-up-reminders | Remind agents of due CRM follow-ups |

All jobs write a `CronLog` record (start time, completion time, items processed, errors, status).

---

## Key Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `FRONTEND_URL` | CORS origin (prod: `http://localhost:3250`) |
| `SENTRY_DSN` | Optional Sentry DSN |
| `NODE_ENV` | `production` or `development` |
| `UPLOAD_DIR` | Invoice PDF storage path |
| `PORT` | API port (default: 3251) |

---

## File Structure Highlights

```
apps/api/
  src/
    common/
      cache-keys.ts         — CacheKeys and CacheTTL registry
      filters/
        global-exception.filter.ts  — GlobalExceptionFilter with Prisma error handling
      interceptors/
        performance.interceptor.ts  — Logs requests >500ms
    automation/
      cron-log.service.ts   — CronLog write helper for all jobs
      jobs/                 — 9 cron job files
    ceo/                    — CEO Dashboard module
    it/                     — IT module (cron-logs endpoint)
    debug/                  — Debug cron trigger (non-prod, IT Admin only)
  prisma/
    schema.prisma           — Full Prisma schema (all models)
    seeds/rbac.seed.ts      — Roles, features, permissions

apps/web/
  app/(ceo)/ceo/page.tsx   — CEO global dashboard
  components/
    ErrorBoundary.tsx       — React class component error boundary
    dashboard/              — Shared dashboard UI components
  middleware.ts             — JWT-based route protection
```
