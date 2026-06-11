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

### With system nginx already on the server

Keep the **Docker nginx** service — it routes `/` → web and `/api/` → api inside the stack.
Your **host nginx** stays on `:80` / `:443` and forwards one domain to Docker.

```
Internet → host nginx :443 → 127.0.0.1:8081 → Docker nginx → web / api
```

1. **Docker** exposes nginx on localhost only (default `127.0.0.1:8081`):

   ```yaml
   # docker-compose.prod.yml
   ports:
     - '127.0.0.1:${CDY_NGINX_HOST_PORT:-8081}:80'
   ```

2. **Production env** (copy `.env.docker.prod.example` → `.env.docker` on the server):

   ```env
   FRONTEND_URL=https://inhouse.cdyagency.com
   NEXT_PUBLIC_API_URL=http://api:3251/api/v1
   CDY_NGINX_HOST_PORT=8081
   ```

   `NEXT_PUBLIC_API_URL` uses the Docker service name `api` so the Next.js server can reach the API inside the network.

3. **Host nginx** for `inhouse.cdyagency.com` — use `docker/nginx/host-nginx.example.conf`:

   ```bash
   sudo cp docker/nginx/host-nginx.example.conf /etc/nginx/sites-available/cdy-inhouse
   sudo ln -s /etc/nginx/sites-available/cdy-inhouse /etc/nginx/sites-enabled/
   sudo certbot certonly --nginx -d inhouse.cdyagency.com   # if cert not already issued
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. **Verify** (on the server):

   ```bash
   curl -s http://127.0.0.1:8081/health              # → CDY System OK
   curl -I https://inhouse.cdyagency.com/health        # via host nginx
   ```

Do **not** map Docker nginx to `80:80` or `443:443` on the host — that conflicts with system nginx.

| Layer | Listens on | Role |
|-------|------------|------|
| Host nginx | `:80`, `:443` | TLS, domain routing |
| Docker nginx | `127.0.0.1:8081` | Routes to web `:3250` and api `:3251` |
| web / api / postgres | Docker network only | Application |
