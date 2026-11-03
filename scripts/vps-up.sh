#!/bin/sh
# Start Play Station on the VPS, attached to Nginx Proxy Manager's docker network.
# Usage: ./scripts/vps-up.sh <npm-network-name>
set -eu
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
fi

if [ -n "${1:-}" ]; then
  if grep -q '^NPM_NETWORK=' .env; then
    sed -i "s/^NPM_NETWORK=.*/NPM_NETWORK=$1/" .env
  else
    printf '\nNPM_NETWORK=%s\n' "$1" >> .env
  fi
fi

if ! grep -q '^DESK_PASSWORD=.\+' .env; then
  echo "Set DESK_PASSWORD in .env, then run this again. The desk at /desk uses it."
  exit 1
fi

if ! grep -q '^NPM_NETWORK=.\+' .env; then
  echo "Set NPM_NETWORK in .env to a name from: docker network ls"
  exit 1
fi

docker compose -f docker-compose.yml -f docker-compose.npm.yml up -d --build
docker compose -f docker-compose.yml ps
