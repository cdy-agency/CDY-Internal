# ─── Base ─────────────────────────────────────────────────────
FROM node:20-alpine AS base
# Pinned to match "packageManager" in package.json / the pnpm version that
# generated pnpm-lock.yaml — an unpinned install grabs whatever pnpm is
# latest at build time, and pnpm 10+ added a lockfile "engine identity"
# check that an older lockfile like ours doesn't satisfy
# (ERR_PNPM_PNPM_ENGINE_IDENTITY_UNVERIFIABLE).
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/ ./packages/
COPY apps/web/package.json ./apps/web/

# ─── Dependencies ─────────────────────────────────────────────
FROM base AS deps
RUN pnpm install --frozen-lockfile

# ─── Development (hot reload) ─────────────────────────────────
FROM deps AS development
COPY apps/web/ ./apps/web/
RUN pnpm --filter @cdy/shared build
EXPOSE 3250

# ─── Build ────────────────────────────────────────────────────
FROM deps AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:3251/api/v1
ARG NEXTAUTH_SECRET=dev-nextauth-secret
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
COPY apps/web/ ./apps/web/
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p apps/web/public
RUN pnpm --filter @cdy/shared build && pnpm --filter web build

# ─── Production ───────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
CMD ["node", "apps/web/server.js"]
EXPOSE 3250
