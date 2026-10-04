#!/usr/bin/env bash
# Empaqueta la tienda para subirla a Hostinger (Node.js web app).
# Usa solo los archivos versionados en git: excluye node_modules, dist, .env y
# cualquier archivo local. Hostinger instala dependencias y compila en su lado.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
OUT="${1:-$REPO_ROOT/tienda-fusion-hostinger.zip}"

git -C "$REPO_ROOT" archive --format=zip -o "$OUT" HEAD:tienda-fusion
SIZE=$(du -h "$OUT" | cut -f1)
echo "Archivo listo: $OUT ($SIZE). Límite de Hostinger: 50 MB."
