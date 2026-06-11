# CDY System — Docker Setup

## Development (hot reload)

```bash
# Copy environment file
cp .env.docker .env.docker.local
# Edit .env.docker.local with your values

# Start all services (postgres, api, web, adminer)
pnpm dev:docker

# Run database migrations (first time only)
pnpm db:migrate

# Seed the database (first time only)
pnpm db:seed
```

Services available:

- Web app: http://localhost:3250
- API: http://localhost:3251
- API docs: http://localhost:3251/api/docs
- PostgreSQL (host): localhost:5433
- Adminer: http://localhost:8080

## Reset everything (wipe database)

```bash
pnpm dev:docker:reset
```

## Production

```bash
pnpm prod:docker
```
