import { Router } from 'express';
export const maestrosRouter = Router();

// MOCK DATA FOR MAESTROS
const MOCK_DATA: Record<string, any[]> = {
  'Sector': [
    { id: '1', code: 'TECH', name: 'Tecnología', usageCount: 45, isActive: true },
    { id: '2', code: 'RETAIL', name: 'Retail', usageCount: 12, isActive: true },
    { id: '3', code: 'HEALTH', name: 'Salud', usageCount: 5, isActive: false }
  ],
  'ClientType': [
    { id: '4', code: 'B2B', name: 'Corporativo (B2B)', usageCount: 120, isActive: true },
    { id: '5', code: 'B2C', name: 'Consumidor (B2C)', usageCount: 300, isActive: true }
  ],
  'Origin': [
    { id: '6', code: 'ORG', name: 'Orgánico', usageCount: 40, isActive: true },
    { id: '7', code: 'ADS', name: 'Publicidad Pagada', usageCount: 200, isActive: true }
  ],
  'PipelineStage': [
    { id: '8', code: 'LEAD', name: 'Nuevo Prospecto', usageCount: 50, isActive: true },
    { id: '9', code: 'CONTACT', name: 'Contactado', usageCount: 30, isActive: true },
    { id: '10', code: 'QUOTE', name: 'Cotizando', usageCount: 15, isActive: true },
    { id: '11', code: 'WON', name: 'Cerrado Ganado', usageCount: 100, isActive: true }
  ]
};

maestrosRouter.get('/:catalogId', async (req, res) => {
  const catalog = req.params.catalogId;
  res.json(MOCK_DATA[catalog] || []);
});

maestrosRouter.post('/:catalogId', async (req, res) => {
  const catalog = req.params.catalogId;
  const newRecord = { ...req.body, id: Math.random().toString(), usageCount: 0, isActive: true };
  if (!MOCK_DATA[catalog]) MOCK_DATA[catalog] = [];
  MOCK_DATA[catalog].push(newRecord);
  res.json(newRecord);
});

maestrosRouter.put('/:catalogId/:id', async (req, res) => {
  res.json({ success: true });
});
