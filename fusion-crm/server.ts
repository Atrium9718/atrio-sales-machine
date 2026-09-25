import express from 'express';
import path from 'path';
import fs from 'fs';
import { metaWebhookRouter } from './server/routes/metaWebhook';
import { widgetRouter } from './server/routes/widget';
import { voiceRouter } from './server/routes/voice';
import { checkMetaTokens } from './server/metaCron';
import { settingsRouter } from './server/routes/settings';
import { adminRouter } from './server/routes/admin';
import { opsRouter } from './server/routes/ops';
import { maestrosRouter } from './server/routes/maestros';
import { homeRouter } from './server/routes/home';
import { performanceRouter, goalsRouter } from './server/routes/performance';
import { announcementsRouter } from './server/routes/announcements';
import { realtimeRouter, initDomainEventBridge, closeAllSSEClients } from './server/routes/realtime';
import { chatRouter } from './server/routes/chat';
import { agentsRouter } from './server/routes/agents';
import { callsRouter } from './server/routes/calls';
import { inboxRouter } from './server/routes/inbox';
import { quotesRouter } from './server/routes/quotes';
import { clientsRouter } from './server/routes/clients';
import { interventoriaRouter } from './server/routes/interventoria';
import { tariffRouter } from './server/routes/tariff';
import { callsService } from './server/services/callsService';
import { loadStateFromFirestore, startStateSync, saveStateToFirestore } from './server/services/persistenceService';
import { registerDomainSubscribers } from './server/events/subscribers';

async function startServer() {
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

startServer();
