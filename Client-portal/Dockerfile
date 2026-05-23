# ══════════════════════════════════════════════════════════════
# BotFlow — Multi-stage Dockerfile
#
# Stages:
#   base        → shared Node.js base
#   deps        → install all dependencies
#   development → hot-reload dev server (used by docker-compose)
#   builder     → build frontend assets
#   production  → lean production image
#
# Build production:
#   docker build --target production -t botflow-api .
# ══════════════════════════════════════════════════════════════

# ── base ──────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init
# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S botflow -u 1001

# ── deps ──────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
# Install all deps (including dev) — we'll prune in production stage
RUN npm ci --include=dev

# ── development ───────────────────────────────────────────────
FROM deps AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3001
CMD ["dumb-init", "node", "--watch", "server/index.js"]

# ── builder (Vite frontend) ───────────────────────────────────
FROM deps AS builder
COPY . .
ENV NODE_ENV=production
RUN npm run build 2>/dev/null || echo "No frontend build step found, skipping"

# ── production ────────────────────────────────────────────────
FROM base AS production

ENV NODE_ENV=production
ENV PORT=3001

# Copy only production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy server source
COPY --chown=botflow:nodejs server/ ./server/
# Copy built frontend assets (if present)
COPY --from=builder --chown=botflow:nodejs /app/dist ./dist 2>/dev/null || true

USER botflow
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => process.exit(r.statusCode===200?0:1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]
