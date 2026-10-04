import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/backend/app.module';
import express from 'express';
import path from 'path';
import fs from 'fs';

async function bootstrap() {
  // Create Nest app with default Express adapter
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // We configure custom limit express body parsers
  });
  
  const PORT = 3000;
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.use(express.json({ limit: '50mb' }));
  expressApp.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Endpoint to download the entire software package as a .zip
  expressApp.get('/api/download-zip', (req: any, res: any) => {
    const candidates = [
      path.join(process.cwd(), 'fusion-grafica-w2p-v2.0.zip'),
      path.join(process.cwd(), 'public', 'fusion-grafica-w2p-v2.0.zip'),
      path.join(process.cwd(), 'fusion-w2p-software.zip'),
    ];
    const zipPath = candidates.find(p => fs.existsSync(p));
    if (!zipPath) {
      return res.status(404).send('Archivo .ZIP no encontrado aún. Generando...');
    }
    const stat = fs.statSync(zipPath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="fusion-grafica-w2p-v2.0.zip"');
    res.setHeader('Content-Length', stat.size);
    const stream = fs.createReadStream(zipPath);
    stream.pipe(res);
  });

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
    const distPath = path.join(process.cwd(), 'dist');
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
});

