# CDY System — Docker Setup

## Development (hot reload)

```bash
cp .env.docker .env.docker.local   # optional: edit values
pnpm dev:docker
pnpm db:migrate                    # first time
pnpm db:seed                       # first time
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

Public URL: **https://inhouse.cdyagency.com**

Uses **host nginx only** (no Docker nginx container). Docker exposes web and api on localhost.

```
Internet → host nginx :443
              ├─ /        → 127.0.0.1:3250 (Next.js)
              └─ /api/    → 127.0.0.1:3251 (NestJS)
```

```bash
cp .env.docker.prod.example .env.docker   # edit secrets on the server
docker compose -f docker-compose.prod.yml --env-file .env.docker up --build -d
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### Host nginx setup

1. **Start Docker** (postgres + api + web only):

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.docker up -d
   ```

2. **Verify containers** (on the server):

   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3250/
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3251/api/docs
   ss -tlnp | grep -E '3250|3251'
   ```

3. **Install host nginx site** — HTTP first, then HTTPS:

   ```bash
   sudo cp docker/nginx/host-nginx.http-only.example.conf /etc/nginx/sites-available/cdy-inhouse
   sudo ln -sf /etc/nginx/sites-available/cdy-inhouse /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   curl -s http://inhouse.cdyagency.com/health   # → CDY System OK

   sudo certbot certonly --nginx -d inhouse.cdyagency.com
   sudo cp docker/nginx/host-nginx.example.conf /etc/nginx/sites-available/cdy-inhouse
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. **Production env** (`.env.docker`):

   ```env
   FRONTEND_URL=https://inhouse.cdyagency.com
   NEXT_PUBLIC_API_URL=http://api:3251/api/v1
   ```

| Layer | Listens on | Role |
|-------|------------|------|
| Host nginx | `:80`, `:443` | TLS + routes to web/api |
| web | `127.0.0.1:3250` | Next.js UI, `/api/proxy` |
| api | `127.0.0.1:3251` | REST API `/api/v1`, Swagger |
| postgres | Docker network only | Database |

See `docker/nginx/TROUBLESHOOTING.md` if health checks fail.
