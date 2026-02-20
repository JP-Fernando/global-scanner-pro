# =============================================================================
# Global Quant Scanner Pro — Multi-stage Docker Image
#
# Stage 1 (deps):    Install production dependencies only
# Stage 2 (runtime): Minimal runtime image with non-root user
#
# Build:  docker build -t global-scanner-pro .
# Run:    docker run -p 3000:3000 --env-file .env global-scanner-pro
# =============================================================================

# ── Stage 1: Install production dependencies ──────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package manifests first for better layer caching
COPY package.json package-lock.json ./

# Install production dependencies only (skip devDependencies)
RUN npm ci --omit=dev --legacy-peer-deps && \
    # Remove npm cache to reduce layer size
    npm cache clean --force


# ── Stage 2: Runtime image ───────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install curl for HEALTHCHECK
RUN apk add --no-cache curl

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY server.js ./
COPY package.json ./
COPY src/ ./src/
COPY universes/ ./universes/
COPY index.html ./

# Create logs directory with correct permissions before switching user
RUN mkdir -p logs && chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose application port
EXPOSE 3000

# Environment defaults (override via --env-file or -e flags)
ENV NODE_ENV=production \
    PORT=3000

# Health check — polls /api/v1/health every 30s
# Fails after 3 consecutive failures (90s grace period on start)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -fs http://localhost:${PORT}/api/v1/health | grep -q '"status":"ok"' || exit 1

# Start the server
CMD ["node", "server.js"]
