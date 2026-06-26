# ---- Build Stage ----
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/api/tsconfig.json apps/api/

# Install all deps (workspace-aware)
RUN pnpm install --frozen-lockfile

# Copy API source and build
COPY apps/api/src apps/api/src/
RUN pnpm --filter @aeroquiz/api build

# ---- Prune for Production ----
FROM builder AS pruner
RUN pnpm --filter @aeroquiz/api deploy --prod /deploy

# ---- Runtime Stage ----
FROM node:22-alpine

WORKDIR /app

COPY --from=pruner /deploy /app

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
