import { Router } from 'express';

export const opsRouter = Router();

// BLOQUE A: Bóveda de Secretos
const mockSecrets = [
  { id: '1', name: 'Google Drive API Key', type: 'API_KEY', integration: 'Google Drive', last4: '8Ab3', createdAt: new Date().toISOString(), rotatedAt: new Date().toISOString(), expiresAt: null, lastUsedAt: new Date().toISOString() },
  { id: '2', name: 'Odoo Token', type: 'BEARER', integration: 'Odoo ERP', last4: 'zX91', createdAt: new Date().toISOString(), rotatedAt: null, expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(), lastUsedAt: new Date(Date.now() - 95 * 86400000).toISOString() }, // 95 days ago -> warning
  { id: '3', name: 'WhatsApp API Token', type: 'TOKEN', integration: 'WhatsApp', last4: 'wq0P', createdAt: new Date().toISOString(), rotatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 2 * 86400000).toISOString(), lastUsedAt: new Date().toISOString() }, // Expires in 2 days
];

opsRouter.get('/secrets', (req, res) => {
  // POR CONSTRUCCIÓN: no se envía el valor.
  res.json(mockSecrets);
});

opsRouter.post('/secrets/:id/rotate', (req, res) => {
  // body.newValue
  res.json({ success: true });
});

opsRouter.post('/secrets/:id/revoke', (req, res) => {
  res.json({ success: true });
});

// BLOQUE B: Integraciones
const mockIntegrations = [
  { id: 'meta', name: 'Meta (Facebook & Instagram)', status: 'OK', error: null, config: { pageId: '1029384756', instagramId: '1122334455', webhookVerifyToken: 'FusionCG_Secret_Token' } },
  { id: 'whatsapp', name: 'WhatsApp Business API', status: 'OK', error: null, config: { phoneNumberId: '123456789', wabaId: '987654321', webhookUrl: 'https://api.fusioncg.com/webhooks/whatsapp' } },
  { id: '1', name: 'Google Drive', status: 'OK', error: null, config: { folderId: 'root' } },
  { id: '2', name: 'Odoo ERP', status: 'ERROR', error: 'Connection timeout', config: { url: 'https://odoo.local', db: 'prod' } },
  { id: '3', name: 'WhatsApp', status: 'OK', error: null, config: { phoneNumberId: '12345' } }
];

opsRouter.get('/integrations', (req, res) => {
  res.json(mockIntegrations);
});

opsRouter.post('/integrations/:id/test', (req, res) => {
  const { id } = req.params;
  if (id === '2') {
    res.json({ success: false, latency: 1500, error: 'Connection timeout' });
  } else {
    res.json({ success: true, latency: 45, error: null });
  }
});

// BLOQUE C: Salud del sistema
opsRouter.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    cards: [
      { name: 'Base de Datos', status: 'OK', detail: 'PostgreSQL 15 - 45ms' },
      { name: 'Redis', status: 'OK', detail: 'Connected' },
      { name: 'Colas (BullMQ)', status: 'WARNING', detail: '45 pending, 2 failed' }
    ],
    queues: [
      { name: 'email_outbox', active: 2, pending: 0, failed: 0, delayed: 0 },
      { name: 'sync_odoo', active: 1, pending: 45, failed: 2, delayed: 0 }
    ],
    cron: [
      { name: 'verificar_respaldos', lastRun: new Date().toISOString(), duration: 45000, failed: false },
      { name: 'sync_inventario', lastRun: new Date(Date.now() - 4 * 3600000).toISOString(), duration: 12000, failed: true }
    ],
    metrics: { rpm: 450, p95: 120, errorRate: 0.01 },
    storage: { dbSizeGB: 4.5, diskFreeGB: 45 },
    aiCost: { currentMonth: 45.2, budget: 100 },
    system: { version: '1.4.2', commit: 'a1b2c3d4', deployedAt: new Date(Date.now() - 86400000 * 3).toISOString() }
  });
});

// BLOQUE D: Respaldos
opsRouter.get('/backups', (req, res) => {
  res.json([
    { id: '1', date: new Date().toISOString(), size: '4.5GB', type: 'FULL', verified: true },
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), size: '4.4GB', type: 'FULL', verified: false }
  ]);
});

opsRouter.post('/backups/:id/download', (req, res) => {
  res.json({ url: '/mock-download.zip' });
});

// BLOQUE E: Mantenimiento
opsRouter.post('/maintenance/execute', (req, res) => {
  const { action } = req.body;
  res.json({ success: true, message: `Acción ${action} en progreso` });
});

