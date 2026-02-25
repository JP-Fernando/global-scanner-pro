#!/usr/bin/env bash
# setup-dev.sh — bootstrap a local development environment for Global Quant Scanner Pro
# Usage: bash scripts/setup-dev.sh
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
abort() { echo -e "${RED}[error]${NC} $*"; exit 1; }

# ── 1. Prerequisites ─────────────────────────────────────────────────────────
info "Checking prerequisites..."

command -v node >/dev/null 2>&1 || abort "Node.js not found. Install Node.js 20 LTS from https://nodejs.org"
command -v npm  >/dev/null 2>&1 || abort "npm not found. It should be bundled with Node.js."
command -v git  >/dev/null 2>&1 || abort "Git not found. Install Git 2.40+."

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  abort "Node.js 20+ required (found $NODE_MAJOR). Use nvm: nvm install 20 && nvm use 20"
fi

info "Node.js $(node -v), npm $(npm -v) — OK"

# ── 2. Install dependencies ───────────────────────────────────────────────────
info "Installing npm dependencies..."
npm install

# ── 3. Environment file ───────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    warn ".env created from .env.example — edit it and fill in any required values."
  else
    warn ".env.example not found; skipping .env creation. Create .env manually."
  fi
else
  info ".env already exists — skipping."
fi

# ── 4. TypeScript check ───────────────────────────────────────────────────────
info "Running TypeScript type-check..."
npx tsc --noEmit && info "TypeScript OK" || warn "TypeScript errors detected — fix before committing."

# ── 5. Lint ───────────────────────────────────────────────────────────────────
info "Running ESLint..."
npm run lint && info "Lint OK" || warn "Lint errors detected — run 'npm run lint -- --fix'."

# ── 6. Tests ──────────────────────────────────────────────────────────────────
info "Running test suite..."
npm test && info "All tests passed." || warn "Some tests failed — check output above."

# ── 7. Summary ────────────────────────────────────────────────────────────────
echo ""
info "Dev environment ready."
echo ""
echo "  Start server:       node server.js"
echo "  API docs:           http://localhost:3000/api-docs"
echo "  Health check:       http://localhost:3000/api/v1/health"
echo "  Metrics:            http://localhost:3000/metrics"
echo "  Run tests:          npm test"
echo "  Type-check:         npx tsc --noEmit"
echo "  Lint:               npm run lint"
echo "  Build (full):       npm run build"
echo "  Docker (compose):   npm run docker:up"
echo ""
