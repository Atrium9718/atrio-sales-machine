export interface LithoCostParameter {
  id?: number;
  category: 'ctp' | 'paper' | 'press_setup' | 'press_run' | 'finishes' | 'binding' | 'editorial' | 'margins';
  code: string;
  name: string;
  description: string;
  unitType: 'plancha' | 'kg' | 'tiro_pliego' | 'fijo_montaje' | 'pagina' | 'unidad_libro' | 'porcentaje';
  costValue: number;
  extraConfig?: any;
  active?: boolean;
}

export const DEFAULT_LITHO_PARAMETERS: LithoCostParameter[] = [
  // 1. CTP & Pre-prensa
  {
    category: 'ctp',
    code: 'ctp_plate_cost',
    name: 'Costo por Plancha CTP Térmica',
    description: 'Valor de filmación y revelado de plancha litográfica por color/cuerpo',
    unitType: 'plancha',
    costValue: 18000,
  },
  {
    category: 'ctp',
    code: 'ctp_fixed_setup_cover',
    name: 'Puesta a punto Pre-prensa Portada',
    description: 'Costo base de imposición, chequeo RIP y guías de corte para portada',
    unitType: 'fijo_montaje',
    costValue: 45000,
  },

  // 2. Papeles y Sustratos
  {
    category: 'paper',
    code: 'paper_kg_rate',
    name: 'Tarifa base de Papel Interior x Kilogramo',
    description: 'Costo promedio de compra de papel interior (Bond, Propalcote, EarthPact)',
    unitType: 'kg',
    costValue: 8500,
  },
  {
    category: 'paper',
    code: 'cover_propalcote_240',
    name: 'Portada Propalcote 240g x Unidad',
    description: 'Costo sustrato pliego portada Propalcote 240g',
    unitType: 'unidad_libro',
    costValue: 450,
  },
  {
    category: 'paper',
    code: 'cover_propalcote_300',
    name: 'Portada Propalcote 300g x Unidad',
    description: 'Costo sustrato pliego portada Propalcote 300g de alto gramaje',
    unitType: 'unidad_libro',
    costValue: 580,
  },
  {
    category: 'paper',
    code: 'cover_maule_c12',
    name: 'Portada Cartulina Maule C-12 x Unidad',
    description: 'Cartulina Maule reverso blanco C-12 para tapas rígidas',
    unitType: 'unidad_libro',
    costValue: 720,
  },
  {
    category: 'paper',
    code: 'cover_tapa_dura_board',
    name: 'Cartón Piedra 2mm + Guardas (Tapa Dura)',
    description: 'Cartón prensado, papel de forro exterior y guardas interiores',
    unitType: 'unidad_libro',
    costValue: 2800,
  },
  {
    category: 'paper',
    code: 'flap_7cm_extra',
    name: 'Adicional Solapa de 7 cm',
    description: 'Incremento de pliego por solapa de 7cm',
    unitType: 'unidad_libro',
    costValue: 180,
  },
  {
    category: 'paper',
    code: 'flap_9cm_extra',
    name: 'Adicional Solapa de 9 cm',
    description: 'Incremento de pliego por solapa de 9cm',
    unitType: 'unidad_libro',
    costValue: 240,
  },

  // 3. Arreglos y Puesta en Máquina (Prensa Offset)
  {
    category: 'press_setup',
    code: 'setup_signature_4x4',
    name: 'Montaje de Pliego Interior Full Color (4x4)',
    description: 'Lavado de batería, calce de 4 colores tiro/retiro y registro en prensa',
    unitType: 'fijo_montaje',
    costValue: 65000,
  },
  {
    category: 'press_setup',
    code: 'setup_signature_1x1',
    name: 'Montaje de Pliego Interior 1 Color (1x1)',
    description: 'Montaje y entintado para impresión monocromática texto negro',
    unitType: 'fijo_montaje',
    costValue: 35000,
  },

  // 4. Tiraje de Máquina (Impresión por Pliego)
  {
    category: 'press_run',
    code: 'run_signature_4x4',
    name: 'Tiraje por Pliego Full Color (4x4)',
    description: 'Costo de impresión por pliego firmado a 4 tintas tiro y retiro',
    unitType: 'tiro_pliego',
    costValue: 140,
  },
  {
    category: 'press_run',
    code: 'run_signature_1x1',
    name: 'Tiraje por Pliego Monocromático (1x1)',
    description: 'Costo de impresión por pliego a 1 tinta texto',
    unitType: 'tiro_pliego',
    costValue: 55,
  },

  // 5. Acabados y Plastificados
  {
    category: 'finishes',
    code: 'laminate_mate',
    name: 'Plastificado Mate Térmico x Portada',
    description: 'Laminado mate con película polipropileno térmica',
    unitType: 'unidad_libro',
    costValue: 180,
  },
  {
    category: 'finishes',
    code: 'laminate_brillo',
    name: 'Plastificado Brillante Térmico x Portada',
    description: 'Laminado brillante alto impacto',
    unitType: 'unidad_libro',
    costValue: 150,
  },
  {
    category: 'finishes',
    code: 'laminate_soft_touch',
    name: 'Plastificado Soft Touch Terciopelo x Portada',
    description: 'Laminado aterciopelado premium',
    unitType: 'unidad_libro',
    costValue: 390,
  },
  {
    category: 'finishes',
    code: 'uv_spot_fixed',
    name: 'Matriz / Malla Reserva UV Sectorizada',
    description: 'Costo fijo de revelado de malla serigráfica UV',
    unitType: 'fijo_montaje',
    costValue: 45000,
  },
  {
    category: 'finishes',
    code: 'uv_spot_run',
    name: 'Barniz UV Sectorizado x Portada',
    description: 'Aplicación serigráfica de curado ultravioleta por ejemplar',
    unitType: 'unidad_libro',
    costValue: 160,
  },
  {
    category: 'finishes',
    code: 'foil_stamp_fixed',
    name: 'Clisé de Estampación al Calor (Foil)',
    description: 'Grabado en magnesio/bronce para hot-stamping',
    unitType: 'fijo_montaje',
    costValue: 75000,
  },
  {
    category: 'finishes',
    code: 'foil_stamp_run',
    name: 'Estampado Hot Stamping x Portada',
    description: 'Tiraje de película foil oro/plata por ejemplar',
    unitType: 'unidad_libro',
    costValue: 250,
  },
  {
    category: 'finishes',
    code: 'emboss_fixed',
    name: 'Matriz Hembra/Macho para Repujado / Relieve',
    description: 'Grabado doble para relieve ciego de portada',
    unitType: 'fijo_montaje',
    costValue: 60000,
  },
  {
    category: 'finishes',
    code: 'emboss_run',
    name: 'Golpe de Repujado x Portada',
    description: 'Tiraje de prensa de relieve por ejemplar',
    unitType: 'unidad_libro',
    costValue: 140,
  },

  // 6. Encuadernación y Acabado Editorial
  {
    category: 'binding',
    code: 'bind_rustica_cosida_unit',
    name: 'Rústica Cosida al Hilo y Pegada Hotmelt x Ejemplar',
    description: 'Alce, cosido al hilo vegetal y pegado con lomo fresado',
    unitType: 'unidad_libro',
    costValue: 1200,
  },
  {
    category: 'binding',
    code: 'bind_rustica_cosida_setup',
    name: 'Ajuste de Máquina Alzadora y Cosedora',
    description: 'Puesta a punto de cosedora de pliegos y encoladora',
    unitType: 'fijo_montaje',
    costValue: 35000,
  },
  {
    category: 'binding',
    code: 'bind_rustica_pur_unit',
    name: 'Rústica Pegado Poliuretano (PUR) x Ejemplar',
    description: 'Fresado y aplicación de cola reactiva PUR de alta resistencia',
    unitType: 'unidad_libro',
    costValue: 950,
  },
  {
    category: 'binding',
    code: 'bind_rustica_pur_setup',
    name: 'Ajuste Inyector PUR y Fresadora',
    description: 'Calentamiento y purga de cola PUR',
    unitType: 'fijo_montaje',
    costValue: 25000,
  },
  {
    category: 'binding',
    code: 'bind_tapa_dura_unit',
    name: 'Encuadernación Cartoné Tapa Dura x Ejemplar',
    description: 'Forrado de tapas, colocación de cabezadas, cinta y enlomado manual',
    unitType: 'unidad_libro',
    costValue: 4500,
  },
  {
    category: 'binding',
    code: 'bind_tapa_dura_setup',
    name: 'Montaje de Línea Tapa Dura / Cartoné',
    description: 'Graduación de máquina casemaker y prensa de ensamble',
    unitType: 'fijo_montaje',
    costValue: 70000,
  },
  {
    category: 'binding',
    code: 'bind_grapado_unit',
    name: 'Grapado a Caballete (Revista/Folleto) x Ejemplar',
    description: 'Doblado y engrapado con 2 alambres inoxidables',
    unitType: 'unidad_libro',
    costValue: 380,
  },
  {
    category: 'binding',
    code: 'bind_grapado_setup',
    name: 'Montaje Grapadora de Caballete',
    description: 'Ajuste de cabezales de alambre',
    unitType: 'fijo_montaje',
    costValue: 15000,
  },
  {
    category: 'binding',
    code: 'bind_anillado_unit',
    name: 'Anillado Doble O / Wire-O x Ejemplar',
    description: 'Perforado de hojas y cerrado de espiral Wire-O',
    unitType: 'unidad_libro',
    costValue: 1100,
  },
  {
    category: 'binding',
    code: 'bind_anillado_setup',
    name: 'Montaje Perforadora Wire-O',
    description: 'Graduación de peines y cerradora',
    unitType: 'fijo_montaje',
    costValue: 20000,
  },

  // 7. Servicios Editoriales Profesionales
  {
    category: 'editorial',
    code: 'service_maquetacion_rate',
    name: 'Tarifa Maquetación InDesign x Página',
    description: 'Diagramación interior con estilo tipográfico por página',
    unitType: 'pagina',
    costValue: 7000,
  },
  {
    category: 'editorial',
    code: 'service_maquetacion_bulk_rate',
    name: 'Tarifa Maquetación x Página (>200 págs)',
    description: 'Diagramación para libros extensos de más de 200 páginas',
    unitType: 'pagina',
    costValue: 5500,
  },
  {
    category: 'editorial',
    code: 'service_cover_design',
    name: 'Diseño de Portada Integral (Fijo)',
    description: 'Diseño integral portada, lomo, contraportada con ISBN y solapas',
    unitType: 'fijo_montaje',
    costValue: 220000,
  },
  {
    category: 'editorial',
    code: 'service_correccion_estilo_rate',
    name: 'Corrección de Estilo y Ortotipográfica x Página',
    description: 'Revisión gramatical, ortográfica y sintáctica por página',
    unitType: 'pagina',
    costValue: 6000,
  },
  {
    category: 'editorial',
    code: 'service_transcripcion_rate',
    name: 'Transcripción de Audio/Manuscrito x Página',
    description: 'Digitalización y digitación literal/depurada por página',
    unitType: 'pagina',
    costValue: 9500,
  },
  {
    category: 'editorial',
    code: 'service_traduccion_rate',
    name: 'Traducción Especializada x Página',
    description: 'Traducción profesional nativa con adaptación técnica por página',
    unitType: 'pagina',
    costValue: 18000,
  },

  // 8. Márgenes y Reglas Financieras
  {
    category: 'margins',
    code: 'litho_margin_factor',
    name: 'Margen Bruto Litográfico (%)',
    description: 'Factor multiplicador de rentabilidad sobre costos de producción física',
    unitType: 'porcentaje',
    costValue: 35, // 35%
  },
  {
    category: 'margins',
    code: 'iva_rate_colombia',
    name: 'Impuesto al Valor Agregado IVA (%)',
    description: 'Tasa impositiva legal colombiana',
    unitType: 'porcentaje',
    costValue: 19, // 19%
  },
];
