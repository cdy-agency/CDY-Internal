# Production troubleshooting — inhouse.cdyagency.com

Architecture: **host nginx → 127.0.0.1:3250 (web) + 127.0.0.1:3251 (api)**. No Docker nginx.

---

## Step 1 — Docker stack

```bash
cd /srv/applications/CDY-Internal
docker compose -f docker-compose.prod.yml --env-file .env.docker ps
docker compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

```bash
curl -s -o /dev/null -w "web: %{http_code}\n" http://127.0.0.1:3250/
curl -s -o /dev/null -w "api:  %{http_code}\n" http://127.0.0.1:3251/api/docs
ss -tlnp | grep -E '3250|3251'
```

If 3250/3251 are not listening, check logs:

```bash
docker compose -f docker-compose.prod.yml logs web --tail 40
docker compose -f docker-compose.prod.yml logs api --tail 40
```

---

## Step 2 — Host nginx site

```bash
sudo nginx -T 2>/dev/null | grep -A15 'server_name inhouse.cdyagency.com'
```

If missing or wrong:

```bash
sudo cp docker/nginx/host-nginx.http-only.example.conf /etc/nginx/sites-available/cdy-inhouse
sudo ln -sf /etc/nginx/sites-available/cdy-inhouse /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

```bash
curl -s http://inhouse.cdyagency.com/health
# Expected: CDY System OK
```

Remove conflicting sites in `/etc/nginx/sites-enabled/` that also claim `inhouse.cdyagency.com`.

---

## Step 3 — HTTPS

```bash
sudo certbot certonly --nginx -d inhouse.cdyagency.com
sudo cp docker/nginx/host-nginx.example.conf /etc/nginx/sites-available/cdy-inhouse
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://inhouse.cdyagency.com/health
```

---

## Symptom cheat sheet

| Symptom | Likely cause |
|---------|----------------|
| `404` from `nginx/1.24.0 (Ubuntu)` | Host nginx site not installed or wrong vhost |
| `curl https` SSL verify failed | Cert not issued for `inhouse.cdyagency.com` |
| Connection refused on `:3250` | `web` container not running |
| Connection refused on `:3251` | `api` container not running |
| Login works but API 403 | Check `FRONTEND_URL` and recreate containers |

---

## Env (`.env.docker`)

```env
FRONTEND_URL=https://inhouse.cdyagency.com
NEXT_PUBLIC_API_URL=http://api:3251/api/v1
```

```bash
docker compose -f docker-compose.prod.yml --env-file .env.docker up -d --force-recreate web api
```

---

## Stop old Docker nginx (if still running)

```bash
docker stop cdy_nginx 2>/dev/null
docker rm cdy_nginx 2>/dev/null
docker compose -f docker-compose.prod.yml --env-file .env.docker up -d
```
