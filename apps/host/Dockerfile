# ---- build stage ----
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy workspace manifests first (layer cache)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/host/package.json ./apps/host/
COPY packages/widget-types/package.json ./packages/widget-types/
COPY packages/widget-sdk/package.json ./packages/widget-sdk/

RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/host/ ./apps/host/
COPY widgets/official/ ./apps/host/public/widgets/official/

# Build widget-types first (host depends on it)
RUN pnpm --filter @xemd/widget-types build

# Build host
RUN pnpm --filter @xemd/host build

# ---- runtime stage ----
FROM nginx:alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de AS runtime

# Copy built assets
COPY --from=builder /app/apps/host/dist /usr/share/nginx/html

# nginx config — SPA routing + proxy to API
COPY apps/host/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
