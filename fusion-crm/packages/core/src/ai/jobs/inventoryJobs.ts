import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = 'DEFAULT_ORG';

export async function generateDailyShortageReport() {
  // Simulates 7:00 AM job: faltantes críticos de los próximos 7 días
  console.log('Daily Shortage Report generated and sent.');
}

export async function analyzeWeeklyPurchases() {
  // Simulates Monday job: propuesta de compras de la semana
  
  // Creates an agent task for PURCHASE_PROPOSAL
  const proposal = await prisma.agentTask.create({
    data: {
      organizationId: ORG_ID,
      agentId: 'fake-agent-id-for-now',
      type: 'PURCHASE_PROPOSAL',
      status: 'PENDING',
      title: 'Propuesta de Compras Semanal',
      summary: 'Faltantes detectados para proyectos en firme y reposición de stock de seguridad.',
      payload: {
        items: [
          { item: 'Propalcote 150g 70x100', cantidad: 5000, proveedorSugerido: 'Papeles Nacionales' }
        ],
        justificacion: "El stock actual no cubre PROY-840 ni PROY-850. Plazo de entrega: 7 días."
      },
      impact: {
        impacto: "Inmoviliza $2.25M COP. Evita penalizaciones por retraso en 3 clientes."
      }
    }
  });
  
  console.log(`Generated weekly purchase proposal ${proposal.id}`);
}

export async function analyzeMonthlyWasteAndDeadStock() {
  // Simulates Monthly job: inventario muerto, rotación y análisis de desperdicio
  // For waste, it proposes a formula adjustment.
  
  const formulaProposal = await prisma.agentTask.create({
    data: {
      organizationId: ORG_ID,
      agentId: 'fake-agent-id-for-now',
      type: 'RESCHEDULE_PROPOSAL', // Reusing this for formula proposal, or can add FORMULA_PROPOSAL
      status: 'PENDING',
      title: 'Ajuste de WasteFormula',
      summary: 'Desviación sistemática de desperdicio del +25% en impresión Offset.',
      payload: {
        machineId: 'm-offset',
        currentWastePercentage: 5,
        proposedWastePercentage: 6.5,
        financialImpact: 279000
      },
      impact: {
        impacto: "Sube el costo estimado en cotizaciones futuras en un 1.5%. Aumenta la precisión de la orden de corte."
      }
    }
  });
  
  console.log(`Generated monthly waste formula adjustment proposal ${formulaProposal.id}`);
}
