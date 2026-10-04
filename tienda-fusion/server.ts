import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/backend/app.module';
import { db } from './src/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import express from 'express';
import path from 'path';
import fs from 'fs';

// El servidor compilado (dist/server.cjs) siempre corre en modo producción, aunque el
// hosting no defina NODE_ENV. En desarrollo se usa "npm run dev" (tsx server.ts).
const isBundled = typeof __filename !== 'undefined' && __filename.endsWith('.cjs');
if (isBundled && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// El hosting puede arrancar el servidor desde la raíz del proyecto o desde dist/:
// se buscan las carpetas junto al bundle y, si no, en el directorio de trabajo.
const resolveDir = (...candidates: string[]) => candidates.find(dir => fs.existsSync(dir)) || candidates[candidates.length - 1];
const bundleDir = isBundled ? __dirname : process.cwd();

async function runMigrations() {
  // Aplica automáticamente las migraciones pendientes de ./drizzle al arrancar.
  // Ideal en hosting compartido sin terminal. Se desactiva con AUTO_MIGRATE=false.
  if (process.env.AUTO_MIGRATE === 'false') return;
  try {
    const migrationsFolder = resolveDir(path.join(bundleDir, '..', 'drizzle'), path.join(bundleDir, 'drizzle'), path.join(process.cwd(), 'drizzle'));
    await migrate(db, { migrationsFolder });
    console.log('Migraciones de base de datos al día.');
  } catch (err: any) {
    console.error('No se pudieron aplicar las migraciones:', err?.message || err);
  }
}

async function bootstrap() {
  await runMigrations();

  // Create Nest app with default Express adapter
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // We configure custom limit express body parsers
  });
  
  // Hostinger (y la mayoría de hostings Node.js) asignan el puerto por variable de entorno
  const PORT = Number(process.env.PORT) || 3000;
  const expressApp = app.getHttpAdapter().getInstance();

  // Detrás del proxy de Hostinger: respeta X-Forwarded-For / X-Forwarded-Proto
  expressApp.set('trust proxy', 1);
  expressApp.disable('x-powered-by');

  // Se guarda el cuerpo crudo para poder verificar la firma de los webhooks de pago (Bold)
  expressApp.use(express.json({
    limit: '50mb',
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));
  expressApp.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check endpoint
  expressApp.get('/api/health', (req: any, res: any) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  if (process.env.NODE_ENV !== 'production') {
    // Dynamic import for vite
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Mount Vite middleware, but bypass for /api routes
    expressApp.use((req: any, res: any, next: any) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = resolveDir(isBundled ? __dirname : '', path.join(process.cwd(), 'dist'));
    // Los archivos de /assets llevan hash en el nombre: se pueden cachear un año
    expressApp.use('/assets', express.static(path.join(distPath, 'assets'), { maxAge: '1y', immutable: true }));
    expressApp.use(express.static(distPath));
    // Support both Express v4 and Express v5 path-to-regexp by using fallback middleware
    expressApp.use((req: any, res: any, next: any) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
      }
      next();
    });
  }

  await app.listen(PORT, '0.0.0.0');
  console.log(`Server (NestJS + Vite) running on http://localhost:${PORT}`);
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

