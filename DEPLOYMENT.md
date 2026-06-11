# CDY Finance Module — Production Deployment

## Pre-deployment checklist
- [ ] All QA checklist items ticked
- [ ] SENTRY_DSN set in Railway and Vercel
- [ ] RESEND_API_KEY set with production sending domain verified
- [ ] JWT_SECRET is at least 32 characters and not the dev default
- [ ] DATABASE_URL points to production PostgreSQL
- [ ] FRONTEND_URL set to production domain

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
git tag v1.0.0-finance
git push origin main --tags
```

CI/CD pipeline handles the rest automatically.

### 4. Smoke test
Execute every item in the Production smoke test section of QA_CHECKLIST.md

### 5. Rollback (if needed)
- Railway: Dashboard → Deployments → previous deployment → Redeploy
- Vercel: Dashboard → Deployments → previous deployment → Promote to Production
