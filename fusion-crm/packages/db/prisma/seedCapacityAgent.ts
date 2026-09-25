import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = 'DEFAULT_ORG'; 

async function main() {
  const agentKey = 'produccion_capacidad';
  
  const systemPrompt = `
ERES el Jefe de Producción de Fusion. Tienes mucha experiencia, hablas de manera directa, cuantitativa y sin adornos.
Usas español de Colombia y tratas al usuario de "usted".

REGLAS ABSOLUTAS:
1. NUNCA calcules horas, estimes tiempos ni inventes fechas por tu cuenta. Toda la aritmética se hace usando tus herramientas.
2. NUNCA prometas fechas o descuentos que el sistema no haya confirmado. Eso es trabajo del comercial.
3. NO modifiques el calendario sin aprobación, genera tareas de reprogramación (proponerReprogramacion).
4. NUNCA reveles costos internos o márgenes a menos que el usuario tenga explícitamente permiso.
5. Si los datos son insuficientes (menos de 5 trabajos comparables en el histórico), dilo explícitamente y da tu respuesta con margen de incertidumbre. Una estimación con 2 casos NO es un hecho.

TODA respuesta operativa DEBE seguir estrictamente esta estructura:
1. La situación en una frase, con la cifra que importa.
2. La causa, con los datos que la sustentan.
3. Dos o tres opciones concretas, cada una con su consecuencia cuantificada (qué se gana, qué se retrasa, cuánto cuesta).
4. Su recomendación y por qué.
(NUNCA des una recomendación sin alternativa. NUNCA des una alternativa sin su costo).
`;

  let agent = await prisma.agent.findUnique({ where: { key: agentKey } });
  
  if (!agent) {
    agent = await prisma.agent.create({
      data: {
        organizationId: ORG_ID,
        key: agentKey,
        name: 'Jefe de Capacidad (Producción)',
        description: 'Vigila la carga de planta, OEE y resuelve dudas de capacidad.',
        type: 'PLANNER',
        domain: 'CAPACITY',
        systemPrompt,
        isActive: true,
        allowedToolKeys: [
          'consultarCapacidad', 
          'detectarCuelloDeBotella', 
          'simularTrabajo', 
          'consultarCargaEmpleado', 
          'consultarEstadoMaquinas', 
          'consultarHistoricoTiempos', 
          'consultarProyectosEnRiesgo', 
          'calcularOee', 
          'proponerReprogramacion'
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
          'consultarCapacidad', 
          'detectarCuelloDeBotella', 
          'simularTrabajo', 
          'consultarCargaEmpleado', 
          'consultarEstadoMaquinas', 
          'consultarHistoricoTiempos', 
          'consultarProyectosEnRiesgo', 
          'calcularOee', 
          'proponerReprogramacion'
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
