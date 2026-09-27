# Puente de voz: controla Asterisk por ARI y guarda las llamadas en Postgres.
FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g bun@1.3

COPY . .
# Las dependencias usan el protocolo `workspace:*`, que npm no soporta: se instala con bun.
# postinstall ejecuta `prisma generate`.
RUN bun install --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npx", "tsx", "apps/voice/src/index.ts"]
