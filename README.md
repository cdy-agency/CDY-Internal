# CDY In-House System

Internal business management platform for CDY — Sprint 1 delivers the Finance module foundation.

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, shadcn/ui, React Query
- **Backend:** NestJS 10, Prisma 5, PostgreSQL 15
- **Monorepo:** Turborepo + pnpm

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15 (Docker recommended)

## Quick Start

### 1. Start PostgreSQL

```bash
docker run --name cdy-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=cdy_system \
  -p 5433:5432 \
  -d postgres:15-alpine
```

Update `apps/api/.env` if using a different port or credentials.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Database setup

```bash
pnpm --filter api prisma:migrate
pnpm --filter api prisma:seed
```

### 4. Start development servers

```bash
pnpm dev
```

- **Web:** http://localhost:3250
- **API:** http://localhost:3251
- **Swagger:** http://localhost:3251/api/docs

## Seed Users

| Email | Password | Role |
|-------|----------|------|
| ceo@cdy.com | CDY@2026! | CEO |
| finance@cdy.com | CDY@2026! | Finance Manager |
| sales@cdy.com | CDY@2026! | Sales Agent |

## Project Structure

```
apps/
  api/     NestJS backend (port 3251)
  web/     Next.js frontend (port 3250)
packages/
  shared/  Shared TypeScript types
```

## Sprint 1 Deliverables

- JWT authentication with role-based access control
- Finance overview dashboard with 6 live metric cards
- Finance layout with sidebar navigation
- All data from PostgreSQL — no mocks
