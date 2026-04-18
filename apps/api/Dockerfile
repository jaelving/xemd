FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/widget-types/package.json ./packages/widget-types/
COPY packages/widget-sdk/package.json ./packages/widget-sdk/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build widget-types
RUN pnpm --filter @xemd/widget-types build

# Build API
RUN pnpm --filter @xemd/api build

# ---- runtime stage ----
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/widget-types/package.json ./packages/widget-types/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/widget-types/dist ./packages/widget-types/dist

# Copy the SDK (plain JS — not compiled, just served statically)
COPY apps/api/src/sdk ./apps/api/dist/sdk

# Official widgets baked into image
COPY widgets/official /widgets/official

# Run as non-root
RUN addgroup -S xemd && adduser -S xemd -G xemd
USER xemd

EXPOSE 3001

ENV NODE_ENV=production
ENV WIDGETS_DIR=/widgets
ENV DATA_DIR=/data
ENV PORT=3001

CMD ["node", "apps/api/dist/index.js"]
