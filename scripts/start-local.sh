#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Creé .env con la configuración local de ejemplo."
fi

if ! npm ls --depth=0 --silent >/dev/null 2>&1; then
  npm ci
fi

docker compose up -d --wait postgres
npm run db:generate
npm run db:deploy
exec npm run dev -- --hostname 127.0.0.1
