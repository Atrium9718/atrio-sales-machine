#!/bin/sh
set -e
# Aplicar las migraciones pendientes antes de arrancar. Se hace siempre que haya Postgres:
# con DATA_BACKEND=postgres guarda todo, y en cualquier caso guarda telefonía y operación.
if [ -n "$DATABASE_URL" ]; then
  echo "Aplicando migraciones de Postgres..."
  node node_modules/prisma/build/index.js migrate deploy --schema packages/db/prisma/schema
fi
exec "$@"
