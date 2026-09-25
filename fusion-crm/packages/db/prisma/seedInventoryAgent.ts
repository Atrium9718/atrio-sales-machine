import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = 'DEFAULT_ORG'; 

async function main() {
  const agentKey = 'inventario_abastecimiento';
  
  const systemPrompt = `
ERES el Jefe de Compras y Abastecimiento de Fusion. Tienes una memoria larga, eres desconfiado de los promedios, atento a los plazos de entrega, y tu obsesión es no parar la planta ni congelar plata.

REGLAS ABSOLUTAS:
1. El stock se lee SIEMPRE del libro mayor en el momento de la consulta mediante tus herramientas. NUNCA inventes stock, nunca uses caché ni tu memoria.
2. NUNCA ejecutes una compra. Solo generas propuestas de compra (proponerCompra) para aprobación humana.
3. NUNCA reveles precios de proveedor a usuarios sin permiso 'cost:read'.
4. Nunca modifiques el stock. El stock solo cambia por movimientos reales en el libro mayor.
5. Si el libro mayor y el saldo no cuadran, repórtalo como incidente y niégate a proyectar sobre datos inconsistentes.

TODA alerta o respuesta de abastecimiento DEBE seguir esta estructura:
1. Qué falta o va a faltar, y para cuándo.
2. Qué trabajos compromete, con nombre de cliente y fecha.
3. Qué hacer: comprar, transformar, sustituir o tercerizar, con el costo de cada opción.
4. Cuál es el plazo de entrega del proveedor y hasta cuándo se puede esperar antes de que sea tarde.
`;

  let agent = await prisma.agent.findUnique({ where: { key: agentKey } });
  
  if (!agent) {
    agent = await prisma.agent.create({
      data: {
        organizationId: ORG_ID,
        key: agentKey,
        name: 'Jefe de Abastecimiento',
        description: 'Vigila el stock, el desperdicio y genera alertas y propuestas de compra.',
        systemPrompt,
        isActive: true,
        type: 'PLANNER',
        domain: 'INVENTORY',
        allowedToolKeys: [
          'consultarStock', 
          'verificarDisponibilidadProyecto', 
          'calcularCobertura', 
          'consultarConsumoHistorico', 
          'proyectarDemanda', 
          'analizarDesperdicio', 
          'consultarProveedores', 
          'evaluarTransformacion', 
          'detectarInventarioMuerto',
          'calcularCostoRealMaterial',
          'proponerCompra'
        ],
        modelPreference: 'REASONING',
        temperature: 0.2, // Low temp for analytical responses
      }
    });
  } else {
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        systemPrompt,
        allowedToolKeys: [
          'consultarStock', 
          'verificarDisponibilidadProyecto', 
          'calcularCobertura', 
          'consultarConsumoHistorico', 
          'proyectarDemanda', 
          'analizarDesperdicio', 
          'consultarProveedores', 
          'evaluarTransformacion', 
          'detectarInventarioMuerto',
          'calcularCostoRealMaterial',
          'proponerCompra'
        ]
      }
    });
  }

  console.log(`Agent ${agentKey} seeded successfully.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
