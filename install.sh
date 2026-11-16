#!/usr/bin/env bash
# Install the Ikiminav2 backend tree into ~/Ikiminav2/backend
set -euo pipefail

TARGET="${HOME}/Ikiminav2"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backend"

echo "=== Ikiminav2 installer ==="
echo "Target:  ${TARGET}"
echo "Source:  ${SOURCE_DIR}"

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "ERROR: backend tree not found at ${SOURCE_DIR}" >&2
  exit 1
fi

mkdir -p "${TARGET}"
cp -r "${SOURCE_DIR}" "${TARGET}/backend"

echo
echo "=== Backend installed at ${TARGET}/backend ==="
echo ""
echo "Next steps:"
echo "  cd ${TARGET}/backend"
echo "  cp .env.example .env"
echo "  docker compose up --build"
echo ""
echo "API docs: http://localhost:8000/api/v1/docs"
