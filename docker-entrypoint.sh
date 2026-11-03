#!/bin/sh
set -e
mkdir -p /app/data/catalog
if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs /app/data
  exec setpriv --reuid nextjs --regid nodejs --init-groups node server.js
fi
exec node server.js
