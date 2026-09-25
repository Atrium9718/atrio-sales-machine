import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = 'DEFAULT_ORG'; // Replace with your actual ORG_ID mechanism

async function main() {
  console.log('Seeding Business Glossary...');

  const glossaryTerms = [
    {
      term: 'Pliego',
      definition: 'Hoja de papel en su tamaño original de fábrica (ej. 70x100 cm, 60x90 cm) antes de ser cortada o impresa.',
      synonyms: ['hoja completa', 'formato mayor', 'sheet'],
      domain: 'Litografía'
    },
    {
      term: 'Tiro y retiro',
      definition: 'Impresión por ambas caras de un pliego. El tiro es el primer lado que se imprime y el retiro es el reverso.',
      synonyms: ['ambas caras', 'impresión doble faz', 'frente y vuelta'],
      domain: 'Litografía'
    },
    {
      term: 'Montaje e imposición',
      definition: 'Distribución de las páginas o piezas en el pliego de impresión para que al doblar o cortar queden en el orden y posición correctos.',
      synonyms: ['armado', 'trazado', 'distribución'],
      domain: 'Litografía'
    },
    {
      term: 'Sangrado',
      definition: 'Extensión de la imagen o color más allá del límite de corte final (usualmente 2-3 mm) para evitar bordes blancos al refilar.',
      synonyms: ['rebase', 'sangría', 'bleed'],
      domain: 'Diseño y Pre-prensa'
    },
    {
      term: 'Demasía',
      definition: 'Cantidad extra de hojas que se deben imprimir para compensar las mermas (desperdicio) en los procesos de impresión y acabado.',
      synonyms: ['sobreproducción', 'hojas de sobrante'],
      domain: 'Producción'
    },
    {
      term: 'Gramaje',
      definition: 'Peso del papel expresado en gramos por metro cuadrado (g/m²). No es exactamente el grosor (calibre), pero están relacionados.',
      synonyms: ['peso del papel', 'grosor'],
      domain: 'Materiales'
    },
    {
      term: 'Troquel',
      definition: 'Herramienta con cuchillas de corte y plecas de doblez, montada en madera, usada para cortar papel o cartón en formas irregulares.',
      synonyms: ['suaje', 'sacabocados', 'die cut'],
      domain: 'Acabados'
    },
    {
      term: 'Plastificado',
      definition: 'Aplicación de una película plástica (mate o brillante) sobre el papel impreso aplicando calor y presión para protegerlo y darle mejor acabado.',
      synonyms: ['laminado', 'termolaminado'],
      domain: 'Acabados'
    },
    {
      term: 'Hendido',
      definition: 'Marca o surco que se hace en el papel grueso o cartón para facilitar su doblez sin que las fibras se rompan.',
      synonyms: ['grafado', 'plegado', 'doblez marcado'],
      domain: 'Acabados'
    },
    {
      term: 'Refilado',
      definition: 'Corte final con guillotina que se hace a los impresos para dejarlos en su tamaño definitivo y exacto, eliminando márgenes de impresión.',
      synonyms: ['guillotinado', 'corte final', 'perfilado'],
      domain: 'Acabados'
    },
    {
      term: 'Pantone',
      definition: 'Sistema estandarizado de igualación de colores (PMS). En litografía, implica preparar y usar una tinta directa específica en lugar de mezclar CMYK.',
      synonyms: ['color directo', 'tinta plana', 'tinta especial'],
      domain: 'Impresión'
    },
    {
      term: 'Selección de color',
      definition: 'Proceso de separar una imagen a todo color en los cuatro colores básicos de impresión (Cian, Magenta, Amarillo y Negro - CMYK).',
      synonyms: ['cuatricromía', 'CMYK'],
      domain: 'Pre-prensa'
    },
    {
      term: 'Plancha CTP',
      definition: 'Lámina de aluminio tratada químicamente, grabada con láser directo desde el computador (Computer To Plate). Transporta la tinta al caucho.',
      synonyms: ['lámina offset', 'placa', 'chapa'],
      domain: 'Pre-prensa'
    },
    {
      term: 'Arranque',
      definition: 'Hojas de papel utilizadas al inicio del tiraje para ajustar el registro de color y el entintado hasta alcanzar la calidad óptima. Es la mayor fuente de desperdicio fijo.',
      synonyms: ['arreglo', 'calibración de máquina', 'puesta a punto'],
      domain: 'Impresión'
    },
    {
      term: 'Pisada',
      definition: 'Cada golpe o revolución del cilindro impresor sobre el papel. Determina la velocidad y costo del tiraje en máquina.',
      synonyms: ['golpe de máquina', 'impresión', 'revolución'],
      domain: 'Impresión'
    },
    {
      term: 'Cuadernillo',
      definition: 'Pliego impreso y doblado repetidas veces que forma una sección de un libro o revista (usualmente de 8, 16 o 32 páginas).',
      synonyms: ['signatura', 'pliego doblado'],
      domain: 'Acabados'
    },
    {
      term: 'Encuadernación',
      definition: 'Proceso de unir los cuadernillos y fijarlos a una cubierta. Puede ser cosida al hilo, pegada (hot melt), grapada (al caballete), etc.',
      synonyms: ['armado de libros', 'empaste'],
      domain: 'Acabados'
    },
    {
      term: 'Guillotina',
      definition: 'Máquina de corte lineal con una cuchilla pesada que corta grandes bloques de papel a escuadra perfecta.',
      synonyms: ['cortadora', 'cizalla industrial'],
      domain: 'Acabados'
    },
    {
      term: 'Merma',
      definition: 'Desperdicio normal y calculado de material durante cualquier etapa del proceso gráfico. Se asume como costo en la cotización.',
      synonyms: ['desperdicio', 'sobrante', 'pérdida técnica'],
      domain: 'Producción'
    },
    {
      term: 'Reproceso',
      definition: 'Trabajo adicional que debe hacerse para corregir un defecto, o imprimir nuevamente algo que quedó mal. Es costo puro de no calidad.',
      synonyms: ['reelaboración', 'arreglo de fallos'],
      domain: 'Producción'
    },
    {
      term: 'Prueba de color',
      definition: 'Impresión previa (generalmente digital pero calibrada) que simula el resultado final de la prensa offset para aprobación del cliente.',
      synonyms: ['machote', 'prueba de contrato', 'cromalín'],
      domain: 'Pre-prensa'
    }
  ];

  for (const item of glossaryTerms) {
    await prisma.businessGlossary.upsert({
      where: { term: item.term },
      update: { ...item, organizationId: ORG_ID },
      create: { ...item, organizationId: ORG_ID }
    });
  }

  console.log('Seeding Context Sources...');
  
  const sources = [
    {
      name: 'Fichas técnicas de materiales y gramajes disponibles',
      type: 'DOCUMENT'
    },
    {
      name: 'Tabla de tiempos estándar por proceso y por máquina',
      type: 'SPREADSHEET'
    },
    {
      name: 'Fórmulas de desperdicio vigentes',
      type: 'KNOWLEDGE_ARTICLE'
    },
    {
      name: 'Política de anticipos, formas de pago y condiciones comerciales',
      type: 'DOCUMENT'
    },
    {
      name: 'Requisitos de archivos de arte: resolución, sangrado, color, fuentes, formatos',
      type: 'KNOWLEDGE_ARTICLE'
    },
    {
      name: 'Manuales de máquinas',
      type: 'DRIVE_FOLDER'
    },
    {
      name: 'Histórico de los 858 proyectos',
      type: 'HISTORICAL_DATA'
    }
  ];

  for (const source of sources) {
    // Just find first to avoid duplicates since we don't have a unique key on name
    const existing = await prisma.contextSource.findFirst({
      where: { name: source.name, organizationId: ORG_ID }
    });

    if (!existing) {
      await prisma.contextSource.create({
        data: {
          organizationId: ORG_ID,
          name: source.name,
          type: source.type as any,
          status: 'SYNCED',
          documentCount: Math.floor(Math.random() * 10) + 1,
          chunkCount: Math.floor(Math.random() * 100) + 10,
          lastSyncAt: new Date()
        }
      });
    }
  }

  console.log('Semantics seed completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
