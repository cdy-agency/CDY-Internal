# ─── Base ─────────────────────────────────────────────────────
FROM node:20-alpine AS base
# Prisma query engine requires OpenSSL on Alpine (musl)
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/

# ─── Dependencies ─────────────────────────────────────────────
FROM base AS deps
RUN pnpm install --frozen-lockfile

# ─── Development (hot reload) ─────────────────────────────────
FROM deps AS development
COPY apps/api/ ./apps/api/
RUN pnpm --filter @cdy/shared build && pnpm --filter api prisma:generate
EXPOSE 3251

# ─── Build ────────────────────────────────────────────────────
FROM deps AS builder
COPY apps/api/ ./apps/api/
RUN pnpm --filter @cdy/shared build && pnpm --filter api prisma:generate
RUN pnpm --filter api build

# ─── Production ───────────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/tsconfig.seed.json ./apps/api/tsconfig.seed.json
COPY docker/api/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN mkdir -p /app/uploads/receipts
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
EXPOSE 3251
