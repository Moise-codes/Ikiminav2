#!/usr/bin/env bash
# =============================================================================
# Itsinda Platform v2 — Development Setup Script
# =============================================================================
# Sets up the full development environment: backend API, and prints next steps
# for the web and mobile frontends.
#
# Usage:
#   chmod +x install.sh
#   ./install.sh
# =============================================================================
set -euo pipefail

WORKSPACE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${WORKSPACE}/backend"

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  ___  __            __      "
echo " |_ _||  |_  ___ _ _|  | ___ "
echo "  | | |   _|(_-<| ' \  |/ _  |"
echo " |___||_\__||__/|_||_|_|\__,_|"
echo -e "${NC}"
echo "  Itsinda Platform v2 — Development Setup"
echo "  ========================================="
echo ""

# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------
check_cmd() {
    if ! command -v "$1" &>/dev/null; then
        echo -e "${RED}ERROR: '$1' is not installed or not in PATH.${NC}"
        echo "  Install it and re-run this script."
        exit 1
    fi
}

echo "Checking requirements..."
check_cmd docker
check_cmd docker compose
echo -e "  ${GREEN}✓ Docker and Docker Compose found${NC}"

# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------
echo ""
echo -e "${BLUE}--- Backend ---${NC}"

if [[ ! -d "${BACKEND_DIR}" ]]; then
    echo -e "${RED}ERROR: backend directory not found at ${BACKEND_DIR}${NC}"
    exit 1
fi

# Create .env if it doesn't exist
if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
    cp "${BACKEND_DIR}/.env.example" "${BACKEND_DIR}/.env"
    echo -e "  ${GREEN}✓ Created backend/.env from .env.example${NC}"
    echo -e "  ${YELLOW}  Edit backend/.env to add real credentials when ready.${NC}"
else
    echo -e "  ${GREEN}✓ backend/.env already exists (skipped)${NC}"
fi

echo ""
echo "  Starting backend services (PostgreSQL + Redis + API + Worker)..."
echo "  This runs alembic migrations automatically before the API starts."
echo ""

cd "${BACKEND_DIR}"
docker compose up --build -d

echo ""
echo -e "  ${GREEN}✓ Backend is starting up${NC}"
echo "  Waiting for the API to be ready..."

# Wait for the API health endpoint
MAX_WAIT=60
WAITED=0
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
    if [[ ${WAITED} -ge ${MAX_WAIT} ]]; then
        echo -e "  ${RED}✗ API did not start within ${MAX_WAIT}s. Check logs:${NC}"
        echo "    docker compose logs api"
        exit 1
    fi
    sleep 2
    WAITED=$((WAITED + 2))
done

echo -e "  ${GREEN}✓ Backend API is running${NC}"
echo ""
echo "  API base:    http://localhost:8000"
echo "  API docs:    http://localhost:8000/api/v1/docs"
echo "  Health:      http://localhost:8000/health"

# ---------------------------------------------------------------------------
# Web frontend
# ---------------------------------------------------------------------------
echo ""
echo -e "${BLUE}--- Web Frontend ---${NC}"

if [[ -d "${WORKSPACE}/web" ]]; then
    echo "  Found web/ directory."
    if command -v pnpm &>/dev/null; then
        PKG="pnpm"
    elif command -v yarn &>/dev/null; then
        PKG="yarn"
    else
        PKG="npm"
    fi
    echo "  Installing dependencies with ${PKG}..."
    cd "${WORKSPACE}/web"
    ${PKG} install
    echo -e "  ${GREEN}✓ Web dependencies installed${NC}"
    echo "  To start:  cd web && ${PKG} run dev"
else
    echo -e "  ${YELLOW}  web/ directory not found — frontend not built yet.${NC}"
    echo "  When the web frontend is added, run:"
    echo "    cd web && npm install && npm run dev"
fi

# ---------------------------------------------------------------------------
# Mobile frontend
# ---------------------------------------------------------------------------
echo ""
echo -e "${BLUE}--- Mobile App ---${NC}"

if [[ -d "${WORKSPACE}/mobile" ]]; then
    echo "  Found mobile/ directory."
    if command -v pnpm &>/dev/null; then
        PKG="pnpm"
    elif command -v yarn &>/dev/null; then
        PKG="yarn"
    else
        PKG="npm"
    fi
    cd "${WORKSPACE}/mobile"
    ${PKG} install
    echo -e "  ${GREEN}✓ Mobile dependencies installed${NC}"
    echo "  To start:  cd mobile && ${PKG} start"
    echo "  Android:   cd mobile && ${PKG} run android"
    echo "  iOS:       cd mobile && ${PKG} run ios"
else
    echo -e "  ${YELLOW}  mobile/ directory not found — mobile app not built yet.${NC}"
    echo "  When the mobile app is added, run:"
    echo "    cd mobile && npm install && npm start"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "  =============================================="
echo -e "  ${GREEN}Itsinda dev environment ready!${NC}"
echo "  =============================================="
echo ""
echo "  Backend API:        http://localhost:8000/api/v1"
echo "  Interactive docs:   http://localhost:8000/api/v1/docs"
echo "  OpenAPI spec:       http://localhost:8000/api/v1/openapi.json"
echo ""
echo "  Useful commands:"
echo "    View API logs:    docker compose -f backend/docker-compose.yml logs -f api"
echo "    View all logs:    docker compose -f backend/docker-compose.yml logs -f"
echo "    Stop services:    docker compose -f backend/docker-compose.yml down"
echo "    Run migrations:   docker compose -f backend/docker-compose.yml run migrate"
echo ""
echo "  Next steps:"
echo "    1. Edit backend/.env to add Africa's Talking SMS credentials"
echo "    2. Build the web frontend (see project README)"
echo "    3. Build the mobile app (see project README)"
echo ""
