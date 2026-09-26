#!/bin/sh
set -e
# Con Postgres como base de datos, aplicar las migraciones pendientes antes de arrancar
if [ "$DATA_BACKEND" = "postgres" ]; then
  echo "Aplicando migraciones de Postgres..."
  node node_modules/prisma/build/index.js migrate deploy --schema packages/db/prisma/schema
fi
exec "$@"
