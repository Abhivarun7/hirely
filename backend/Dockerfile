# syntax=docker/dockerfile:1.6

# ---------- Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install all deps (including dev) for the TS build
COPY package.json package-lock.json* ./
RUN npm ci

# Build the TypeScript sources
COPY tsconfig.json ./
COPY src ./src
RUN npm run build


# ---------- Runner ----------
FROM node:20-alpine AS runner

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Tools needed for HEALTHCHECK
RUN apk add --no-cache curl tini

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output + anything the runtime needs
COPY --from=builder /app/dist ./dist
COPY migrations ./migrations
COPY migrate-mongo-config.js ./

# Uploads directory (mount a volume to persist user files)
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
