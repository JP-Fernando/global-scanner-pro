# =============================================================================
# Global Quant Scanner Pro — Multi-stage Docker Image
#
# Stage 1 (deps):    Install all dependencies, including devDependencies
#                    (also the base of the `app-dev` compose service)
# Stage 2 (build):   Compile the server (tsc) and the frontend (Vite +
#                    inject-vite-assets), then prune to production dependencies
# Stage 3 (runtime): Minimal runtime image with non-root user, running the same
#                    entrypoint as `npm start` (node dist/server.js)
#
# Build:  docker build -t global-scanner-pro .
# Run:    docker run -p 3000:3000 --env-file .env global-scanner-pro
#         (production requires SESSION_SECRET and JWT_SECRET, and ALLOWED_ORIGINS
#          must include the origin the browser uses, e.g. http://localhost:3000)
# =============================================================================

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps

# Toolchain for native modules (better-sqlite3 falls back to node-gyp when no
# prebuilt binary is available for the platform)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package manifests first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps


# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM deps AS build

# Copy build inputs
COPY tsconfig.json vite.config.ts server.js index.html android.html manifest.webmanifest sw.js ./
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY icons/ ./icons/
COPY universes/ ./universes/

# Build-time frontend settings (empty = same-origin API, served from /)
ARG VITE_BASE_PATH=/
ARG VITE_API_BASE_URL=
ENV VITE_BASE_PATH=${VITE_BASE_PATH} \
    VITE_API_BASE_URL=${VITE_API_BASE_URL}

# dist/server.js + dist/src/** (tsc) and dist/public/** (Vite, universes, PWA files)
RUN npm run build && \
    npm prune --omit=dev --legacy-peer-deps && \
    npm cache clean --force


# ── Stage 3: Runtime image ───────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Production node_modules (native modules were built against this same base image)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Writable directories for logs and the SQLite database (DATABASE_PATH=./data/app.db)
RUN mkdir -p logs data && chown -R node:node logs data

# Switch to non-root user for security
USER node

# Expose application port
EXPOSE 3000

# Environment defaults (override via --env-file or -e flags)
ENV NODE_ENV=production \
    PORT=3000

# Persist the user database across container restarts
VOLUME ["/app/data"]

# Health check — polls /api/v1/health every 30s
# Fails after 3 consecutive failures (30s grace period on start)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- "http://localhost:${PORT}/api/v1/health" | grep -q '"status":"ok"' || exit 1

# Start the server (same entrypoint as `npm start`)
CMD ["node", "dist/server.js"]
