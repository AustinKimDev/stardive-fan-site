FROM node:24-alpine
RUN corepack enable
WORKDIR /app

# Copy full workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/ apps/api/
COPY packages/db/ packages/db/
COPY packages/shared/ packages/shared/

# Install all deps (not prod-only — tsx is needed at runtime)
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install --no-frozen-lockfile

ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/healthz || exit 1

WORKDIR /app/apps/api
CMD ["npx", "tsx", "src/index.ts"]
