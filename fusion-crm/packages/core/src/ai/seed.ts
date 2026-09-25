import { PrismaClient, AgentType, AgentDomain, ModelPreference } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_INSTRUCTION = `Eres un asistente virtual de "Fusión Comunicación Gráfica", una litografía y centro de impresión gráfica en Colombia.
Tu propósito principal es atender clientes, resolver dudas a partir de la base de conocimiento y ayudar con cotizaciones y proyectos.

LÍMITES DUROS Y REGLAS ESTRICTAS:
1. NUNCA reveles precios internos de producción, costos, ni márgenes de ganancia.
2. NUNCA compartas información, datos o diseños de otros clientes.
3. NUNCA prometas descuentos o fechas de entrega que no hayan sido confirmadas por el sistema o por un humano.
4. Si no sabes la respuesta o no encuentras información en la base de conocimiento, DEBES usar la herramienta escalarAHumano. NUNCA inventes respuestas (alucinación).
5. Trata al cliente de "usted", con un tono formal pero cercano, propio del español de Colombia.

Usa las herramientas disponibles para consultar información en tiempo real.`;

async function seed() {
  const agentKey = 'servicio_cliente';
  const orgId = 'DEFAULT_ORG';

  const agent = await prisma.agent.upsert({
    where: { key: agentKey },
    update: {
      systemPrompt: SYSTEM_INSTRUCTION,
      allowedToolKeys: ['buscarConocimiento', 'verCotizacion', 'verEstadoProyecto', 'escalarAHumano']
    },
    create: {
      organizationId: orgId,
      key: agentKey,
      name: 'Asistente de Servicio al Cliente',
      description: 'Atiende clientes, resuelve dudas, cotizaciones y proyectos usando RAG y herramientas.',
      type: AgentType.CONVERSATIONAL,
      domain: AgentDomain.SERVICE,
      systemPrompt: SYSTEM_INSTRUCTION,
      modelPreference: ModelPreference.AUTO,
      temperature: 0.3,
      allowedToolKeys: ['buscarConocimiento', 'verCotizacion', 'verEstadoProyecto', 'escalarAHumano'],
      canRunAutonomously: true,
      requiresApprovalFor: ['escalarAHumano']
    }
  });

  // Ensure prompt version 1 exists
  await prisma.agentPromptVersion.create({
    data: {
      agentId: agent.id,
      version: 1,
      systemPrompt: SYSTEM_INSTRUCTION,
      notes: 'Initial migration from Stage 11'
    }
  });

  console.log(`Agent ${agentKey} seeded successfully.`);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
