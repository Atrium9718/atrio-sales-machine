# ── Build ─────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g bun@1.3

COPY . .
# Las dependencias usan el protocolo `workspace:*`, que npm no soporta: se instala con bun.
# postinstall ejecuta `prisma generate`.
RUN bun install --frozen-lockfile
RUN bun run build

# ── Runtime ───────────────────────────────────────────────────
FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/settings.store.json /app/firebase-applet-config.json ./

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.cjs"]
