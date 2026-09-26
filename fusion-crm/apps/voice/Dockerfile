FROM node:22-alpine AS base

WORKDIR /app

# Instalar herramientas del sistema
RUN apk add --no-cache libc6-compat openssl

# Copiar archivos de configuración de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias del workspace
RUN npm install

# Copiar esquema de Prisma y paquetes compartidos
COPY packages ./packages
COPY tsconfig.json ./

# Generar cliente de Prisma
RUN npx prisma generate --schema=packages/db/prisma

# Copiar código fuente de apps/voice
COPY apps/voice ./apps/voice

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npx", "tsx", "apps/voice/src/index.ts"]
