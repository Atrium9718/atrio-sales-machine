import express from 'express';
import path from 'path';
import fs from 'fs';
import { metaWebhookRouter } from './routes/metaWebhook';
import { widgetRouter } from './routes/widget';
import { voiceRouter } from './routes/voice';
import { checkMetaTokens } from './metaCron';
import { settingsRouter } from './routes/settings';
import { adminRouter } from './routes/admin';
import { opsRouter } from './routes/ops';
import { maestrosRouter } from './routes/maestros';
import { homeRouter } from './routes/home';
import { performanceRouter, goalsRouter } from './routes/performance';
import { announcementsRouter } from './routes/announcements';
import { realtimeRouter, initDomainEventBridge, closeAllSSEClients } from './routes/realtime';
import { chatRouter } from './routes/chat';
import { agentsRouter } from './routes/agents';
import { callsRouter } from './routes/calls';
import { inboxRouter } from './routes/inbox';
import { quotesRouter } from './routes/quotes';
import { clientsRouter } from './routes/clients';
import { interventoriaRouter } from './routes/interventoria';
import { tariffRouter } from './routes/tariff';
import { dataRouter } from './routes/data';
import { callsService } from './services/callsService';
import { loadStateFromFirestore, startStateSync, saveStateToFirestore } from './services/persistenceService';
import { registerDomainSubscribers } from './events/subscribers';
import { authRouter, requireAuth } from './auth/session';

export async function startServer() {
  // Inicializar bus de eventos, suscriptores de dominio y puente SSE
  registerDomainSubscribers();
  initDomainEventBridge();

  const app = express();
  const PORT = 3000;

  // For Meta webhooks we need raw body for signature verification sometimes, but let's use express.json()
  // and keep the raw body as a buffer.
  app.use(express.json({
    limit: '50mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Autenticación: todo /api exige sesión salvo las rutas públicas (ver server/auth/session.ts)
  app.use('/api/auth', authRouter);
  app.use(requireAuth);
  
  app.use('/api/webhooks/meta', metaWebhookRouter);
  app.use('/api/widget', widgetRouter);
  app.use('/api/voice', voiceRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/ops', opsRouter);
  app.use('/api/maestros', maestrosRouter);
  app.use('/api/home', homeRouter);
  app.use('/api/performance', performanceRouter);
  app.use('/api/goals', goalsRouter);
  app.use('/api/announcements', announcementsRouter);
  app.use('/api/anuncios', announcementsRouter);
  app.use('/api/realtime', realtimeRouter);
  app.use('/api/stream', realtimeRouter); // Migración canal Etapa 6
  app.use('/api/chat', chatRouter);
  app.use('/api/agents', agentsRouter);
  app.use('/api/calls', callsRouter);
  app.use('/api/inbox', inboxRouter);
  app.use('/api/quotes', quotesRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/interventoria', interventoriaRouter);
  app.use('/api/tariff', tariffRouter);
  app.use('/api/data', dataRouter);

  // Explicit route to serve quotation PDF template cleanly without SPA fallback
  app.get('/plantilla-cotizacion.pdf', (req, res) => {
    const publicFile = path.join(process.cwd(), 'public', 'plantilla-cotizacion.pdf');
    const distFile = path.join(process.cwd(), 'dist', 'plantilla-cotizacion.pdf');
    const target = fs.existsSync(publicFile) ? publicFile : (fs.existsSync(distFile) ? distFile : null);

    if (target) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(target);
    }
    res.status(404).send('Plantilla no encontrada');
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(express.static(path.join(process.cwd(), 'public')));
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const publicPath = path.join(process.cwd(), 'public');
    app.use(express.static(publicPath));
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on port ${PORT}`);
    
    // Load state from Firestore
    await loadStateFromFirestore();
    // Start continuous sync
    startStateSync();
    
    // Start cron job every 24 hours
    setInterval(() => checkMetaTokens().catch(console.error), 24 * 60 * 60 * 1000);
    // Also run immediately on startup
    checkMetaTokens().catch(console.error);

    // Cron job calls:cleanup cada 10 minutos (Etapa 15.6)
    setInterval(() => callsService.runCallsCleanupJob().catch(console.error), 10 * 60 * 1000);
  });
  
  // Graceful shutdown to save state and close SSE connections
  const exitHandler = async () => {
    console.log('Shutting down gracefully, closing SSE clients and saving state...');
    closeAllSSEClients();
    await saveStateToFirestore();
    process.exit(0);
  };
  process.on('SIGINT', exitHandler);
  process.on('SIGTERM', exitHandler);
}
