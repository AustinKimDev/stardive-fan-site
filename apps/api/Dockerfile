FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

# Copy workspace manifests for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

# Install ALL deps (tsx is devDep but needed for runtime)
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install --no-frozen-lockfile

# Copy source files
COPY packages/db/ packages/db/
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# .env is mounted via docker-compose env_file, not baked in
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/healthz || exit 1

CMD ["node", "--import", "tsx/esm", "apps/api/src/index.ts"]
