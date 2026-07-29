#!/bin/sh
set -e

if [ "${DATABASE_URL:-}" = "file:/data/dev.db" ]; then
  mkdir -p /data
  touch /data/dev.db
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Starting Next.js server..."
exec node server.js
