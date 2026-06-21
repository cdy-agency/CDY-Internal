# CDY In-House System — Deployment Guide

---

## Overview

The CDY system runs as 7 Docker containers orchestrated by Docker Compose behind an Nginx reverse proxy. All containers are defined in `docker-compose.prod.yml`.

| Container | Image | Purpose |
|---|---|---|
| api | node:20-alpine (custom) | NestJS backend |
| web | node:20-alpine (custom) | Next.js frontend |
| postgres | postgres:15-alpine | Primary database |
| redis | redis:7-alpine | Cache and job queue |
| pgbouncer | pgbouncer (custom) | Connection pooling |
| nginx | nginx:alpine | Reverse proxy + SSL |
| backup | alpine (custom) | Automated daily database backups |

---

## Server requirements

**Minimum:**
- 2 vCPU
- 4GB RAM
- 40GB SSD
- Ubuntu 22.04 LTS or Debian 12

**Recommended:**
- 4 vCPU
- 8GB RAM
- 80GB SSD

**Operating system:** Ubuntu 22.04 LTS (all commands in this guide assume Ubuntu)

---

## First-time server setup

### Step 1 — Connect to the server

```bash
ssh root@your_server_ip
```

### Step 2 — Update the system

```bash
apt update && apt upgrade -y
```

### Step 3 — Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add current user to docker group (avoids needing sudo)
usermod -aG docker $USER

# Start Docker and enable on boot
systemctl start docker
systemctl enable docker

# Verify
docker --version
docker compose version
```

### Step 4 — Install Certbot for SSL

```bash
apt install -y certbot python3-certbot-nginx
```

### Step 5 — Configure firewall

```bash
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable
ufw status
```

### Step 6 — Create application directory

```bash
mkdir -p /srv/applications/cdy-internal
cd /srv/applications/cdy-internal
```

---

## Deploying the application

### Step 1 — Clone the repository

```bash
git clone https://github.com/cdy/cdy-internal.git /srv/applications/cdy-internal
cd /srv/applications/cdy-internal
```

### Step 2 — Create production environment file

```bash
cp apps/api/.env.example apps/api/.env.production
```

Edit `apps/api/.env.production` with production values:

```env
NODE_ENV=production
PORT=3001

# Database — use a strong password
DATABASE_URL="postgresql://cdy_user:STRONG_PASSWORD_HERE@pgbouncer:5432/cdy_db"
POSTGRES_USER=cdy_user
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
POSTGRES_DB=cdy_db

# Redis
REDIS_URL="redis://redis:6379"

# Auth — generate with: openssl rand -base64 64
JWT_SECRET="GENERATED_SECRET_MIN_64_CHARS"
JWT_REFRESH_SECRET="DIFFERENT_GENERATED_SECRET_MIN_64_CHARS"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email
RESEND_API_KEY="re_your_production_key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
RESEND_FROM_NAME="CDY"

# File storage
CLOUDFLARE_R2_ACCOUNT_ID="your_account_id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your_key_id"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your_secret"
CLOUDFLARE_R2_BUCKET_NAME="cdy-files-prod"
CLOUDFLARE_R2_PUBLIC_URL="https://files.yourdomain.com"

# Puppeteer
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"

# Sentry
SENTRY_DSN="your_sentry_dsn"
```

Create `apps/web/.env.production`:

```env
NEXT_PUBLIC_API_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV=production
```

### Step 3 — Configure Nginx

Edit `docker/nginx/nginx.conf` and replace `yourdomain.com` with your actual domain.

The Nginx config handles:
- HTTP → HTTPS redirect
- SSL termination
- Proxy to Next.js (port 3000) for web routes
- Proxy to NestJS (port 3001) for `/api/v1/*` routes
- Rate limiting (100 req/min per IP for API, 20 req/min for auth)
- File upload size limit (5MB)
- Security headers (HSTS, X-Frame-Options, CSP)

### Step 4 — Build and start containers

```bash
# Build all containers
docker compose -f docker-compose.prod.yml build

# Start all containers in detached mode
docker compose -f docker-compose.prod.yml up -d

# Verify all containers are running
docker compose -f docker-compose.prod.yml ps
```

Expected output — all containers should show "Up":
```
NAME         STATUS
api          Up
web          Up
postgres     Up
redis        Up
pgbouncer    Up
nginx        Up
backup       Up
```

### Step 5 — Point domain DNS

In your DNS provider (Cloudflare, Route 53, etc.):
- Add an **A record** pointing your domain to the server IP
- Add an **A record** for `www.yourdomain.com` pointing to the same IP

Wait for DNS propagation (usually 5–60 minutes).

### Step 6 — Install SSL certificate

```bash
# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Get certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Restart nginx
docker compose -f docker-compose.prod.yml start nginx
```

Certificates are stored in `/etc/letsencrypt/live/yourdomain.com/`.

Set up auto-renewal:

```bash
# Test renewal (dry run)
certbot renew --dry-run

# Add to crontab for auto-renewal
crontab -e
# Add this line:
0 3 * * 0 certbot renew --quiet && docker compose -f /srv/applications/cdy-internal/docker-compose.prod.yml restart nginx
```

### Step 7 — Run database migrations and seed

```bash
# Run all migrations
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Seed the database (first time only)
docker compose -f docker-compose.prod.yml exec api pnpm --filter api prisma:seed
```

### Step 8 — Verify health

```bash
# Check health endpoint
curl https://yourdomain.com/health

# Expected response:
# {"status":"ok","database":"up","memory_rss":"up","memory_heap":"up"}
```

### Step 9 — Create first user accounts

The seed creates default users with development passwords.
**Immediately after first deployment:**

1. Login as it@cdy.com (CDY@2026!)
2. Navigate to /it/users
3. Create real CDY user accounts with real email addresses
4. Assign correct roles
5. Deactivate or delete seed users

---

## Post-deployment checklist

Complete every item before announcing go-live:

```
Auth
[ ] Login with each of the 8 roles — confirm correct redirect per role
[ ] Silent refresh works after 15 minutes (do not click anything for 15 min)
[ ] Logout redirects to /login with no loop

Finance
[ ] Create invoice → PDF downloads → email sends to test inbox
[ ] Record payment → receipt email sends
[ ] P&L report loads with correct data
[ ] Trigger retainer cron manually → invoice created

CRM
[ ] Create lead → move to Closed Won → client created, invoice in Finance
[ ] Commission record created with PENDING status

HR
[ ] Create employee → leave balances initialised → onboarding checklist created
[ ] Submit leave request → manager notified

Projects
[ ] Create project with cost → draft invoice in Finance → Finance Manager notified

Service modules
[ ] Marketing client setup via retainer search works
[ ] Software project creation creates draft invoice
[ ] Branding project creation creates draft invoice
[ ] Influencer campaign creation creates draft invoice
[ ] Sales campaign creation creates draft invoice

CEO
[ ] CEO dashboard loads with data from all modules
[ ] Alert buttons navigate correctly

Performance
[ ] /health returns 200
[ ] Finance summary loads < 200ms (second load, from cache)
[ ] No slow request warnings in API logs (> 500ms)

Security
[ ] HTTPS active — browser shows padlock
[ ] HTTP redirects to HTTPS (try http://yourdomain.com)
[ ] Security headers present: curl -I https://yourdomain.com
  Must include: X-Frame-Options, Strict-Transport-Security, Content-Security-Policy
[ ] TEAM_MEMBER cannot access /finance — redirected to /hr/leave/my
[ ] IT Admin cannot access /finance — redirected to /it
```

---

## Ongoing deployment — updating the application

When new code is ready to deploy:

```bash
cd /srv/applications/cdy-internal

# Pull latest code
git pull origin main

# Run any new migrations first
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Rebuild and restart containers
docker compose -f docker-compose.prod.yml up --build -d

# Verify all containers started
docker compose -f docker-compose.prod.yml ps

# Check for errors
docker compose -f docker-compose.prod.yml logs --tail=50 api
```

The build and restart takes approximately 2–3 minutes. During this time the application is briefly unavailable. For zero-downtime deploys, see the Rolling Deploy section below.

---

## Rolling deploy (zero downtime)

For updates that must not cause downtime:

```bash
# Build new images without stopping running containers
docker compose -f docker-compose.prod.yml build api web

# Restart services one at a time
docker compose -f docker-compose.prod.yml up -d --no-deps api
# Wait 30 seconds and verify api is healthy
curl https://yourdomain.com/health

docker compose -f docker-compose.prod.yml up -d --no-deps web
# Verify web is working
curl https://yourdomain.com

# Nginx does not need restarting unless config changed
```

---

## Rollback

If a deployment causes issues:

```bash
# Immediate rollback — revert to previous git commit
git log --oneline -5      # find the previous commit hash
git checkout abc1234      # replace with actual hash

# Rebuild and restart
docker compose -f docker-compose.prod.yml up --build -d

# If migration needs to be rolled back
# (only possible if the migration was reversible and run within last 10 minutes)
docker compose -f docker-compose.prod.yml exec api npx prisma migrate reset --skip-seed
# WARNING: This destroys all data. Use only in emergencies on fresh installations.
```

For data-safe rollbacks when a migration has already run and data exists:
1. Restore from the most recent backup (see backup section)
2. Checkout the previous code version
3. Deploy the previous version

---

## Database backups

### Automatic backups

The `backup` container runs a daily backup at 2am:

```bash
# Backup stored at /srv/backups/cdy/
# Filename format: cdy_db_YYYYMMDD_HHMMSS.sql.gz
# Retention: 30 days (older backups auto-deleted)
```

### Manual backup

```bash
# Create a manual backup
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U cdy_user cdy_db | gzip > /srv/backups/cdy/manual_$(date +%Y%m%d_%H%M%S).sql.gz

# Verify backup was created
ls -lh /srv/backups/cdy/
```

### Restore from backup

```bash
# Stop the API to prevent writes during restore
docker compose -f docker-compose.prod.yml stop api web

# Restore
gunzip -c /srv/backups/cdy/cdy_db_20260615_020000.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U cdy_user cdy_db

# Restart services
docker compose -f docker-compose.prod.yml start api web

# Verify
curl https://yourdomain.com/health
```

---

## Monitoring

### Viewing logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f nginx

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 api

# Slow request log — requests over 500ms are logged as WARN
docker compose -f docker-compose.prod.yml logs api | grep "SLOW REQUEST"
```

### Cron job monitoring

Cron job execution is logged to the `CronLog` table. Check via IT Admin at `/api/v1/it/cron-logs` or directly in the database:

```sql
SELECT "jobName", status, "itemsProcessed", errors, "startedAt"
FROM "CronLog"
ORDER BY "startedAt" DESC
LIMIT 20;
```

### Sentry

All production errors are reported to Sentry automatically. The Operations Manager and Finance Manager should be added to the Sentry project to receive email alerts on new errors.

### Health check

The health endpoint is at `GET /health` and returns:

```json
{
  "status": "ok",
  "database": "up",
  "memory_rss": "up",
  "memory_heap": "up"
}
```

Set up an external uptime monitor (UptimeRobot, Better Uptime, etc.) pointing to this endpoint. Alert threshold: 2 consecutive failures.

---

## Resource management

### Checking container resource usage

```bash
docker stats --no-stream
```

### Cleaning up unused Docker resources

```bash
# Remove stopped containers, unused images, networks
docker system prune -f

# Remove unused images only
docker image prune -f

# Free disk space used by old build layers
docker builder prune -f
```

### Disk space monitoring

Set up an alert when disk usage exceeds 80%:

```bash
# Check current usage
df -h /

# Add to crontab for daily alert
0 9 * * * df -h / | awk 'NR==2 {if ($5+0 > 80) print "WARNING: Disk usage is "$5}' | mail -s "CDY Server Disk Alert" admin@cdy.com
```

---

## SSL certificate renewal

Certificates from Let's Encrypt expire every 90 days. Auto-renewal is configured in crontab (see setup step 6). To manually renew:

```bash
certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

---

## Production environment variables — full reference

```env
# ── Application ─────────────────────────────────────────────
NODE_ENV=production
PORT=3001

# ── Database ─────────────────────────────────────────────────
DATABASE_URL="postgresql://cdy_user:PASSWORD@pgbouncer:5432/cdy_db"
POSTGRES_USER=cdy_user
POSTGRES_PASSWORD=your_strong_password
POSTGRES_DB=cdy_db

# PgBouncer (internal service name in Docker network)
PGBOUNCER_HOST=pgbouncer
PGBOUNCER_PORT=5432

# ── Redis ────────────────────────────────────────────────────
REDIS_URL="redis://redis:6379"

# ── Auth ─────────────────────────────────────────────────────
# Generate with: openssl rand -base64 64
JWT_SECRET=your_min_64_char_secret
JWT_REFRESH_SECRET=your_different_min_64_char_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Email ────────────────────────────────────────────────────
RESEND_API_KEY=re_your_production_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=CDY

# ── File storage ─────────────────────────────────────────────
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=cdy-files-prod
CLOUDFLARE_R2_PUBLIC_URL=https://files.yourdomain.com

# ── PDF generation ───────────────────────────────────────────
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# ── Monitoring ───────────────────────────────────────────────
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# ── Frontend ─────────────────────────────────────────────────
# (in apps/web/.env.production)
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Generating secure secrets

```bash
# JWT secrets (run twice for two different secrets)
openssl rand -base64 64

# Database password
openssl rand -base64 32

# Example output (do not use these):
# kX9mP2nQ4rT6vY8zB1dF3hJ5lN7pR9sU0wE2gI4kM6oQ8sW1yA3cE5gI7kM9oQ==
```

---

## Troubleshooting

### Container not starting

```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs api

# Common causes:
# - Missing environment variable
# - Database not ready yet (api starts before postgres is fully up)
# - Port already in use
```

### Database connection refused

```bash
# Check if postgres is running
docker compose -f docker-compose.prod.yml ps postgres

# Check postgres logs
docker compose -f docker-compose.prod.yml logs postgres

# Connect manually to verify
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U cdy_user -d cdy_db -c "SELECT 1;"
```

### Migrations failing

```bash
# Check migration status
docker compose -f docker-compose.prod.yml exec api npx prisma migrate status

# Common causes:
# - Migration has already been applied (safe to ignore)
# - Schema conflict (requires manual resolution)
# - Database locked (another migration in progress)
```

### PDF generation failing (Chrome not found)

```bash
# Check if Chromium is installed in the API container
docker compose -f docker-compose.prod.yml exec api which chromium-browser
# or
docker compose -f docker-compose.prod.yml exec api which chromium

# If not found — rebuild the API container (Dockerfile should install it)
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d api

# Quick fix for immediate use (does not survive rebuild)
docker compose -f docker-compose.prod.yml exec api npx puppeteer browsers install chrome
```

### Login redirect loop (me → logout → me)

This means the auth interceptor is in a loop trying to refresh a failed token.

```bash
# Check if /auth/refresh endpoint is returning errors
docker compose -f docker-compose.prod.yml logs api | grep "auth/refresh"

# Clear all Redis sessions (forces all users to re-login)
docker compose -f docker-compose.prod.yml exec redis redis-cli FLUSHDB

# If the issue persists — check JWT_SECRET and JWT_REFRESH_SECRET
# are set correctly and have not changed since the last deployment
```

### Emails not sending

```bash
# Check Resend API key is valid
curl -X GET https://api.resend.com/emails \
  -H "Authorization: Bearer your_resend_api_key"

# Check sending domain is verified in Resend dashboard
# Domain verification: add DNS TXT records provided by Resend

# Check API logs for email errors
docker compose -f docker-compose.prod.yml logs api | grep "email\|resend\|Resend"
```

### High memory usage

```bash
# Check memory per container
docker stats --no-stream

# If API is using too much — check for memory leaks in Sentry
# If Redis is using too much — clear cache
docker compose -f docker-compose.prod.yml exec redis redis-cli FLUSHDB

# If PostgreSQL is using too much — check for long-running queries
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U cdy_user -d cdy_db \
  -c "SELECT pid, age(query_start, now()), usename, query FROM pg_stat_activity WHERE query != '<IDLE>' ORDER BY query_start DESC LIMIT 10;"
```

---

## Git tagging convention

```bash
# Release tags
v1.0.0              # Major release
v1.0.0-finance      # Finance module complete
v1.0.0-crm          # CRM module complete
v1.0.0-hr           # HR module complete
v1.0.0-projects     # Projects module complete

# Create and push a tag
git tag v1.0.0
git push origin main --tags

# View all tags
git tag --list
```

---

## Support contacts

For server infrastructure issues: contact the server hosting provider support.

For application bugs: create an issue in the GitHub repository with:
- Steps to reproduce
- Expected behaviour
- Actual behaviour  
- API logs from the time of the issue
- Browser console errors (if frontend issue)