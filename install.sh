#!/usr/bin/env bash
# Install the Itsindav2 backend tree into ~/Itsindav2/backend
set -euo pipefail

TARGET="${HOME}/Itsindav2"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backend"

echo "=== Itsindav2 installer ==="
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
