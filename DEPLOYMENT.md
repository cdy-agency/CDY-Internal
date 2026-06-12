# CDY Finance Module — Production Deployment

## Pre-deployment checklist
- [ ] All QA checklist items ticked
- [ ] SENTRY_DSN set in Railway and Vercel
- [ ] RESEND_API_KEY set with production sending domain verified
- [ ] JWT_SECRET is at least 32 characters and not the dev default
- [ ] DATABASE_URL points to production PostgreSQL
- [ ] FRONTEND_URL=https://inhouse.cdyagency.com

## Deploy steps

### 1. Run migrations on production
```bash
railway run npx prisma migrate deploy
```

### 2. Verify migration
```bash
railway run npx prisma migrate status
```

### 3. Push to main
```bash
git tag v2.0.0-finance
git push origin main --tags
```

## v2.0.0-finance Release

### New in v2.0.0
- Payroll engine with payslip generation
- Commission rules management UI
- Balance sheet manual entries + year-on-year comparison
- Finance settings (company details, invoice prefix, payroll config)
- Employee salary management

### Migration
```bash
railway run npx prisma migrate deploy
```

### Seed payroll data (once)
```bash
# Add salary records for each employee via the UI or API
# POST /api/v1/payroll/salaries for each employee
```

### Tag and deploy
```bash
git tag v2.0.0-finance
git push origin main --tags
```

### Docker production (host nginx)

Public URL: **https://inhouse.cdyagency.com**

Host nginx proxies to `127.0.0.1:3250` (web) and `127.0.0.1:3251` (api). No Docker nginx container.

1. Copy env: `cp .env.docker.prod.example .env.docker` and fill secrets.
2. Start stack: `docker compose -f docker-compose.prod.yml --env-file .env.docker up --build -d`
3. Install host nginx: `host-nginx.http-only.example.conf` first, then `host-nginx.example.conf` after cert.
4. Run migrations: `docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy`
5. Stop old Docker nginx if present: `docker rm -f cdy_nginx 2>/dev/null`

CI/CD pipeline handles the rest automatically.

### 4. Smoke test
Execute every item in the Production smoke test section of QA_CHECKLIST.md

### 5. Rollback (if needed)
- Railway: Dashboard → Deployments → previous deployment → Redeploy
- Vercel: Dashboard → Deployments → previous deployment → Promote to Production

## v1.0.0-crm Release

### New in v1.0.0-crm

- Full CRM pipeline from lead to closed deal
- Automatic Finance integration on deal closure
- Sales agent personal dashboards with target tracking
- Conversion reports, sales performance, source analysis
- Proposal tracking, bulk lead actions, CSV export
- CRM settings (lost reasons, score weights)

### Migration

```bash
railway run npx prisma migrate deploy
```

### Seed CRM settings (once)

```bash
# CRM settings seed on bootstrap — no manual step needed
# onApplicationBootstrap() seeds defaults automatically
```

### Tag and deploy

```bash
git tag v1.0.0-crm
git push origin main --tags
```

## v1.0.0-hr Release

### New in v1.0.0-hr

- Performance review system (quarterly reviews, self-assessment, manager completion, acknowledgement)
- Salary history tracking with payroll effective-date integration
- Onboarding checklist (12 default items, auto-init on employee create)
- HR audit log (fire-and-forget, wired into all HR write operations)
- HR reports: headcount, turnover, leave utilisation, attendance summary
- Finance summary: `totalActiveEmployees` and `totalMonthlyPayroll` from HR
- Team productivity stub endpoint (attendance data until Projects module)
- Frontend: performance pages, reports, audit log, employee profile tabs

### Migrations

```bash
railway run npx prisma migrate deploy
# or locally:
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma generate
```

Sprint 14 migration: `20260610100000_sprint14_hr_performance_salary_history`

### Tag and deploy

```bash
git tag v1.0.0-hr
git push origin feature/hr --tags
# Railway + Vercel auto-deploy on push
```
