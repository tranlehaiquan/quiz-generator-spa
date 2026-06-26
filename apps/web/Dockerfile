# ---- Build Stage ----
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/web/tsconfig.json apps/web/
COPY apps/web/tsconfig.app.json apps/web/
COPY apps/web/tsconfig.node.json apps/web/
COPY apps/web/vite.config.ts apps/web/
COPY apps/web/index.html apps/web/

# API types needed at build time for Hono RPC client
COPY apps/api/package.json apps/api/
COPY apps/api/tsconfig.json apps/api/
COPY apps/api/src/ apps/api/src/

# Install all deps (workspace-aware)
RUN pnpm install --frozen-lockfile

# Copy web source and build
COPY apps/web/src apps/web/src/
COPY apps/web/public apps/web/public/
RUN pnpm --filter @aeroquiz/web build

# ---- Runtime Stage: nginx ----
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
