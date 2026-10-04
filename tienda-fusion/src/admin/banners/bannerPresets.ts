export interface BannerPresetImage {
  id: string;
  name: string;
  category: string;
  url: string;
  thumbnail: string;
  description: string;
}

export interface AiPromptPreset {
  id: string;
  title: string;
  category: string;
  prompt: string;
  recommendedTag: string;
  recommendedCta: string;
  aspectRatio: string;
  style: string;
}

export interface ReadyBannerTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  title: string;
  subtitle: string;
  tag: string;
  ctaText: string;
  linkType: string;
  linkUrl: string;
  placement: string;
  animationType: string;
  bgType: 'IMAGE' | 'GRADIENT' | 'COLOR';
  desktopImageUrl: string;
  mobileImageUrl: string;
  gradientFrom: string;
  gradientTo: string;
  bgColor: string;
  textColor: string;
  overlayOpacity: number;
  extraConfig: {
    textAlign: 'left' | 'center' | 'right';
    tagBgColor: string;
    tagTextColor: string;
    ctaBgColor: string;
    ctaTextColor: string;
    overlayType: 'GRADIENT' | 'VIGNETTE' | 'COLOR' | 'NONE';
    overlayDirection: string;
  };
  popupConfig?: any;
}

export interface GraphicProductOption {
  id: string;
  name: string;
  category: string;
  finishingDefault: string;
  icon?: string;
  defaultPromptEn: string;
  defaultHeadline: string;
  defaultSubtitle: string;
  defaultTag: string;
  defaultCta: string;
  recommendedGradient: { from: string; to: string };
}

export const GRAPHIC_PRODUCTS_CATALOG: GraphicProductOption[] = [
  {
    id: 'prod-atrio',
    name: 'Atrio Agencia S.A.S • Marketing Digital & Marca',
    category: 'Aliado Estratégico',
    finishingDefault: 'Estrategia Digital & Branding Omnicanal',
    defaultPromptEn: 'Modern executive digital marketing and branding creative studio workspace, sleek glass desks, glowing analytics dashboards on modern screens, warm ambient architectural lighting, corporate strategic partner vibe, photorealistic 8k',
    defaultHeadline: 'Impulsa tu Marca con Marketing Digital y Estrategia Omnicanal',
    defaultSubtitle: 'Alianza estratégica con Atrio Agencia S.A.S para diseño de marca, pauta digital y crecimiento comercial.',
    defaultTag: '🚀 Aliado Estratégico • Atrio Agencia S.A.S',
    defaultCta: 'Conocer Atrio Agencia',
    recommendedGradient: { from: '#0f172a', to: '#312e81' }
  },
  {
    id: 'prod-luxury-cards',
    name: 'Tarjetas de Presentación de Lujo con Foil',
    category: 'Papelería Comercial',
    finishingDefault: 'Foil Dorado / Plateado + Plastificado Soft Touch + UV Reserva',
    defaultPromptEn: 'Macro close-up studio shot of luxury black and dark green corporate business cards on textured cotton paper, dazzling embossed metallic gold foil edge gilding and typography, soft studio lighting with gentle shadows, ultra sharp 300 DPI print quality, 8k resolution',
    defaultHeadline: 'Tarjetas de Presentación de Lujo con Foil y UV',
    defaultSubtitle: 'Causa una primera impresión inolvidable con papeles finos, plastificado mate Soft Touch y estampado metalizado.',
    defaultTag: '💎 Acabados Especiales Foil',
    defaultCta: 'Diseñar Tarjetas',
    recommendedGradient: { from: '#18181b', to: '#27272a' }
  },
  {
    id: 'prod-boxes',
    name: 'Cajas Plegadizas & Empaques Personalizados',
    category: 'Empaques & Packaging',
    finishingDefault: 'Cartón Maule Calibre 14/16 + Troquelado + Reserva UV',
    defaultPromptEn: 'Luxury custom cosmetic packaging box mockup, matte dark emerald finish with embossed gold foil details, clean studio pedestal showcase, soft rim lighting, premium folding carton manufacturing, 8k',
    defaultHeadline: 'Cajas y Empaques Personalizados de Alta Gama',
    defaultSubtitle: 'Protege y valoriza tus productos con cajas plegadizas troqueladas en cartón maule y acabados de lujo.',
    defaultTag: '📦 Línea de Empaques Premium',
    defaultCta: 'Cotizar Empaques',
    recommendedGradient: { from: '#064e3b', to: '#047857' }
  },
  {
    id: 'prod-editorial',
    name: 'Libros, Revistas & Catálogos Editoriales',
    category: 'Editorial Litográfico',
    finishingDefault: 'Encuadernación PUR + Cubierta Propalcote 300g + Barniz UV',
    defaultPromptEn: 'High-end editorial design catalog and magazine spread open on minimalist warm concrete surface, vibrant full-color CMYK offset print pages, spot gloss varnish highlights, crisp binding spine, architectural lighting',
    defaultHeadline: 'Revistas, Libros y Catálogos de Alta Definición',
    defaultSubtitle: 'Impresión editorial offset con encuadernación PUR o grapa caballete y fidelidad de color certificada.',
    defaultTag: '📚 Producción Editorial Offset',
    defaultCta: 'Calcular Lomo y Cotizar',
    recommendedGradient: { from: '#083344', to: '#0284c7' }
  },
  {
    id: 'prod-labels',
    name: 'Etiquetas & Stickers en Rollo Troquelados',
    category: 'Adhesivos Industriales',
    finishingDefault: 'Vinilo Adhesivo Resistente al Agua + Troquel + Acabado Mate/Brillo',
    defaultPromptEn: 'Vibrant holographic die-cut vinyl stickers and roll labels peeling on a clean graphic studio backdrop, colorful iridescent reflections, crisp vector precision, studio strobe light',
    defaultHeadline: 'Etiquetas y Stickers en Rollo Troquelados',
    defaultSubtitle: 'Adhesivos en vinilo mate, brillante o transparente resistentes al agua, congelación y fricción.',
    defaultTag: '🏷️ Adhesivos en Rollo & Troquel',
    defaultCta: 'Personalizar Stickers',
    recommendedGradient: { from: '#701a75', to: '#db2777' }
  },
  {
    id: 'prod-rollup',
    name: 'Pendones Roll-Up & Gran Formato',
    category: 'Gran Formato & Publicidad',
    finishingDefault: 'Lona Banner 13oz + Estructura Retráctil de Aluminio',
    defaultPromptEn: 'Modern aluminum retractable roll-up banner stand standing in a bright minimalist corporate expo showroom, vibrant ultra-high resolution graphic print, crisp typography, clean lighting',
    defaultHeadline: 'Pendones Roll-Up y Publicidad Gran Formato',
    defaultSubtitle: 'Lona banner de alta resistencia 13oz con estructura de aluminio retráctil y bolso de transporte incluido.',
    defaultTag: '🏢 Gran Formato & Eventos',
    defaultCta: 'Ver Medidas y Precios',
    recommendedGradient: { from: '#1e293b', to: '#334155' }
  },
  {
    id: 'prod-folders',
    name: 'Carpetas Corporativas con Solapa & Bolsillo',
    category: 'Papelería Corporativa',
    finishingDefault: 'Propalcote 300g + Troquel de Bolsillo + Ranura para Tarjeta',
    defaultPromptEn: 'Corporate presentation folder mockup open with business cards inserted in pocket slot, crisp letterhead, clean studio flat lay lighting, corporate navy blue and teal branding',
    defaultHeadline: 'Carpetas Corporativas de Alto Nivel',
    defaultSubtitle: 'Presenta tus propuestas comerciales con carpetas institucionales en propalcote 300g y solapa troquelada.',
    defaultTag: '📁 Imagen Corporativa',
    defaultCta: 'Cotizar Carpetas',
    recommendedGradient: { from: '#0f172a', to: '#1e293b' }
  },
  {
    id: 'prod-kraft',
    name: 'Empaques Ecológicos & Papel Kraft EarthPact',
    category: 'Línea Sostenible',
    finishingDefault: '100% Bagazo de Caña de Azúcar + Tintas Vegetales',
    defaultPromptEn: 'Sustainable eco-friendly kraft paper packaging bags and boxes made from sugarcane bagasse EarthPact, clean botanical green leaves accents, minimalist earth tone lighting',
    defaultHeadline: 'Empaques 100% Ecológicos y Biodegradables',
    defaultSubtitle: 'Impresión en sustratos de caña de azúcar sin blanqueadores químicos y tintas amigables con el medio ambiente.',
    defaultTag: '🌿 Sustratos Verdes EarthPact',
    defaultCta: 'Ver Línea Ecológica',
    recommendedGradient: { from: '#064e3b', to: '#022c22' }
  },
  {
    id: 'prod-flyers',
    name: 'Volantes & Folletos Comerciales por Millares',
    category: 'Publicidad Masiva',
    finishingDefault: 'Propalcote 115g/150g + Plegado Tríptico / Díptico',
    defaultPromptEn: 'Fan spread of colorful commercial marketing flyers and folded brochures, crisp offset typography, vibrant CMYK graphics, top angle commercial product shoot',
    defaultHeadline: 'Volantes y Plegables para Impacto Masivo',
    defaultSubtitle: 'Tirajes litográficos por millares a precios directos de fábrica con la mayor fidelidad de color.',
    defaultTag: '⚡ Tirajes por Millares',
    defaultCta: 'Cotizar Volantes',
    recommendedGradient: { from: '#042f2e', to: '#0f766e' }
  },
  {
    id: 'prod-forms',
    name: 'Talonarios & Facturación Comercial',
    category: 'Formatos Contables',
    finishingDefault: 'Papel Químico Autocopiante + Numerado + Pespunte',
    defaultPromptEn: 'Neat stack of commercial carbonless invoice duplicate forms, crisp micro-perforated tear lines, red sequential numbering, clean office desk lighting',
    defaultHeadline: 'Talonarios y Formatos con Copia Autocopiante',
    defaultSubtitle: 'Talonarios de facturas, remisiones y recibos de caja numerados en papel químico con copia clara.',
    defaultTag: '📑 Papelería Contable',
    defaultCta: 'Pedir Talonarios',
    recommendedGradient: { from: '#1e293b', to: '#0f766e' }
  }
];

export const CURATED_BANNER_IMAGES: BannerPresetImage[] = [
  {
    id: 'atrio-partner',
    name: 'Atrio Agencia S.A.S - Impulso Digital & Branding',
    category: 'Aliado Estratégico',
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2000&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=400&auto=format&fit=crop',
    description: 'Estrategias digitales omnicanal, diseño de marca, marketing y growth'
  },
  {
    id: 'litho-offset',
    name: 'Prensa Offset Litográfica 4 Tintas CMYK',
    category: 'Imprenta',
    url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=400&auto=format&fit=crop',
    description: 'Impresión de alta precisión industrial a 300 DPI con chequeo pre-prensa'
  },
  {
    id: 'luxury-cards',
    name: 'Tarjetas de Presentación con Foil Dorado',
    category: 'Papelería',
    url: 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=2000&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=400&auto=format&fit=crop',
    description: 'Papeles finos, plastificado mate Soft Touch y estampado metalizado'
  },
  {
    id: 'editorial-books',
    name: 'Libros y Revistas con Encuadernación Rústica',
    category: 'Editorial',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=2000&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400&auto=format&fit=crop',
    description: 'Impresión de tripa en Bond 75g o Propalcote con lomo PUR'
  },
  {
    id: 'boxes-packaging',
    name: 'Cajas y Empaques Personalizados de Lujo',
    category: 'Empaques',
    url: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=2000&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=400&auto=format&fit=crop',
    description: 'Cartón microcorrugado, maule calibre 14 y reserva UV brillante'
  },
  {
    id: 'flyers-marketing',
    name: 'Volantes y Folletos Comerciales',
    category: 'Publicidad',
    url: 'https://images.unsplash.com/photo-1596526131083-e8c638c9c6c5?q=80&w=2000&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1596526131083-e8c638c9c6c5?q=80&w=400&auto=format&fit=crop',
    description: 'Volantes media carta y trípticos a todo color por millares'
  },
  {
    id: 'large-format',
    name: 'Pendones Roll-Up y Gran Formato',
    category: 'Gran Formato',
    url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2000&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=400&auto=format&fit=crop',
    description: 'Lona banner 13oz de alta resistencia con estructura retráctil de aluminio'
  },
  {
    id: 'stickers-labels',
    name: 'Etiquetas y Stickers en Rollo Troquelados',
    category: 'Etiquetas',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
    description: 'Vinilo adhesivo brillante, mate o transparente resistente al agua'
  },
  {
    id: 'corporate-folders',
    name: 'Carpetas Corporativas con Bolsillo',
    category: 'Corporativo',
    url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=2000&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=400&auto=format&fit=crop',
    description: 'Carpetas en propalcote 300g con troquel de solapa y ranura para tarjeta'
  }
];

export const AI_PROMPT_PRESETS: AiPromptPreset[] = [
  {
    id: 'ai-atrio-partner',
    title: 'Atrio Agencia • Marketing Digital & Marca',
    category: 'Aliado Estratégico',
    prompt: 'Modern creative digital marketing agency workspace, high-tech monitors with brand analytics, sleek modern graphic designers, warm ambient lighting, corporate branding excellence, ultra-realistic 8k',
    recommendedTag: 'Aliado Estratégico • Atrio Agencia S.A.S',
    recommendedCta: 'Visitar ATRIO AGENCIA S.A.S.',
    aspectRatio: '16:9',
    style: 'commercial_photo'
  },
  {
    id: 'ai-litho-press',
    title: 'Prensa Litográfica Moderna & Rollos de Papel',
    category: 'Tecnología Imprenta',
    prompt: 'Professional commercial Heidelberg offset printing press in action, vibrant CMYK color ink fountains, crisp paper rolls feeding, 300 DPI high resolution graphic arts studio, ultra-detailed cinematic lighting',
    recommendedTag: 'Litografía Offset 300 DPI',
    recommendedCta: 'Cotizar Tiraje Offset',
    aspectRatio: '16:9',
    style: 'commercial_photo'
  },
  {
    id: 'ai-luxury-packaging',
    title: 'Cajas Premium con Estampado Dorado Foil',
    category: 'Empaques de Lujo',
    prompt: 'Luxury matte dark teal and black cosmetic packaging box with exquisite embossed metallic gold foil typography, soft shadow studio product photography, elegant minimalistic aesthetic, ultra sharp 8k',
    recommendedTag: 'Línea de Empaques Premium',
    recommendedCta: 'Explorar Cajas Personalizadas',
    aspectRatio: '16:9',
    style: 'commercial_photo'
  },
  {
    id: 'ai-stationery-cards',
    title: 'Kit de Papelería Corporativa & Tarjetas',
    category: 'Identidad Corporativa',
    prompt: 'Elegant corporate stationery mockup on premium textured linen paper, business cards with painted green foil edges, branded envelopes and letterhead, architectural clean lighting, top-down isometric view',
    recommendedTag: 'Papelería Ejecutiva',
    recommendedCta: 'Diseñar Tarjetas Online',
    aspectRatio: '16:9',
    style: 'commercial_photo'
  },
  {
    id: 'ai-editorial-magazine',
    title: 'Revistas de Arte y Moda con Acabado UV',
    category: 'Editorial',
    prompt: 'High-end design magazine spread open on minimalist concrete table, vibrant full color lithographic prints, spot UV varnish highlights, perfect binding book spine, editorial aesthetic',
    recommendedTag: 'Cotizador de Libros & Revistas',
    recommendedCta: 'Calcular Lomo & Cotizar',
    aspectRatio: '16:9',
    style: 'commercial_photo'
  },
  {
    id: 'ai-eco-craft',
    title: 'Empaques Ecológicos en Papel Kraft EarthPact',
    category: 'Sostenibilidad',
    prompt: 'Sustainable eco-friendly kraft paper packaging bags and boxes made from sugarcane bagasse EarthPact, clean botanical green leaves accents, minimalist earth tone lighting',
    recommendedTag: 'Sustratos Ecológicos 100%',
    recommendedCta: 'Ver Empaques Verdes',
    aspectRatio: '16:9',
    style: 'commercial_photo'
  },
  {
    id: 'ai-pop-stickers',
    title: 'Stickers Troquelados y Etiquetas Holográficas',
    category: 'Adhesivos',
    prompt: 'Fun collection of holographic die-cut vinyl stickers with vivid iridescent colors, glossy coating reflections, modern graphic designer illustrations, bright studio lighting',
    recommendedTag: 'Stickers en Rollo & Troquel',
    recommendedCta: 'Personalizar Stickers',
    aspectRatio: '16:9',
    style: 'commercial_photo'
  }
];

export const GRADIENT_PRESETS = [
  { name: 'Dark Teal Matrix', from: '#042f2e', to: '#0f766e', text: '#ffffff' },
  { name: 'Deep Indigo Royal (Atrio)', from: '#0f172a', to: '#312e81', text: '#ffffff' },
  { name: 'Midnight Litography', from: '#020617', to: '#1e293b', text: '#ffffff' },
  { name: 'Golden Amber Luxury', from: '#451a03', to: '#b45309', text: '#ffffff' },
  { name: 'Emerald Craft', from: '#064e3b', to: '#047857', text: '#ffffff' },
  { name: 'Vibrant Magenta Offset', from: '#701a75', to: '#db2777', text: '#ffffff' },
  { name: 'Cyber Cyan Tech', from: '#083344', to: '#0284c7', text: '#ffffff' },
  { name: 'Warm Charcoal Minimal', from: '#18181b', to: '#27272a', text: '#ffffff' },
];

export const OVERLAY_GRADIENT_PRESETS = [
  { name: 'Viñeta Lateral de Alto Contraste', from: '#020617', to: '#00000000', direction: '90deg', desc: 'Máxima legibilidad de textos blancos a la izquierda' },
  { name: 'Dark Teal a Esmeralda', from: '#042f2e', to: '#0f766e', direction: '135deg', desc: 'Identidad corporativa elegante y moderna' },
  { name: 'Indigo Profundo a Azul Real', from: '#0f172a', to: '#312e81', direction: '135deg', desc: 'Ideal para alianzas estratégicas y tecnología' },
  { name: 'Púrpura Imperial a Magenta', from: '#3b0764', to: '#701a75', direction: '135deg', desc: 'Lujo, packaging y cosmética' },
  { name: 'Ámbar Cálido a Chocolate', from: '#451a03', to: '#78350f', direction: '135deg', desc: 'Cafés, gastronomía y artesanías' },
  { name: 'Carbón y Grafito Litográfico', from: '#18181b', to: '#09090b', direction: '180deg', desc: 'Contraste limpio y minimalista' },
  { name: 'Esmeralda Bio a Verde Bosque', from: '#064e3b', to: '#022c22', direction: '135deg', desc: 'Línea ecológica y sustratos sostenibles' },
  { name: 'Gradiente Vertical Superior/Inferior', from: '#020617', to: '#00000000', direction: '180deg', desc: 'Oscurece la parte superior del banner' }
];

export const OVERLAY_DIRECTIONS = [
  { value: '90deg', label: '➡️ Horizontal (Izq. a Der.)', desc: 'Texto a la izquierda oscuro, foto visible a la derecha' },
  { value: '135deg', label: '↘️ Diagonal Suave (135°)', desc: 'Degradado fluido desde esquina superior izquierda' },
  { value: '180deg', label: '⬇️ Vertical (Arriba a Abajo)', desc: 'Ideal para banners con textos en la parte superior' },
  { value: '270deg', label: '⬅️ Inverso (Der. a Izq.)', desc: 'Texto a la derecha oscuro, foto visible a la izquierda' },
  { value: 'radial', label: '⭕ Radial Central', desc: 'Foco de luz en el centro con viñeta en los bordes' }
];

export const ANIMATION_OPTIONS = [
  { value: 'fade', label: 'Desvanecimiento Suave (Fade)', desc: 'Transición elegante y limpia ideal para fotografía corporativa' },
  { value: 'slide', label: 'Deslizamiento Lateral (Slide)', desc: 'Movimiento horizontal dinámico de izquierda a derecha' },
  { value: 'zoom', label: 'Zoom In Profundo (Scale)', desc: 'Acercamiento progresivo que genera profundidad' },
  { value: 'kenburns', label: 'Efecto Ken Burns (Cinematográfico)', desc: 'Lento paneo y zoom continuo de alta gama visual' },
  { value: 'bounce', label: 'Rebote Sutil (Bounce)', desc: 'Entrada elástica que llama la atención inmediatamente' },
  { value: 'pulse', label: 'Latido Continuo (Pulse)', desc: 'Respiración rítmica sutil para anuncios destacados' }
];

export const PLACEMENT_OPTIONS = [
  { value: 'hero', label: 'Carrusel Principal (Hero Home)', desc: 'Cabecera de alto impacto en la portada de la tienda' },
  { value: 'partner', label: 'Aliado Estratégico (Ej: Atrio Agencia)', desc: 'Banner de alianzas estratégicas, branding y marketing digital' },
  { value: 'top_bar', label: 'Barra Superior de Avisos (Top Banner)', desc: 'Cinta fija con avisos de envíos gratis o promociones' },
  { value: 'category', label: 'Banner de Categoría / Catálogo', desc: 'Destacado promocional dentro del catálogo de productos' },
  { value: 'popup_modal', label: 'Ventana Emergente (Popup Promo)', desc: 'Modal con descuento, cupón y cuenta regresiva' },
  { value: 'floating', label: 'Widget Flotante Esquina', desc: 'Píldora flotante persistente en la esquina inferior' }
];

export const POPUP_TRIGGER_OPTIONS = [
  { value: 'on_load', label: 'Al Cargar la Página (Inmediato)', desc: 'Se abre tan pronto el cliente ingresa a la tienda' },
  { value: 'delay', label: 'Con Retraso de Tiempo (Temporizado)', desc: 'Aparece tras X segundos de interacción del usuario' },
  { value: 'exit_intent', label: 'Intento de Salida (Exit Intent)', desc: 'Se dispara cuando el usuario mueve el cursor hacia arriba para salir' }
];

export const QUICK_LINK_DESTINATIONS = [
  { label: '🌟 Editor Canvas W2P (Tarjetas Estándar)', value: '/diseñador/tarjetas-estandar' },
  { label: '🛍️ Catálogo General Completo', value: '/categoria/todas' },
  { label: '📄 Papelería Comercial & Tarjetas', value: '/categoria/papeleria-comercial' },
  { label: '📦 Cajas & Empaques Personalizados', value: '/categoria/empaques-cajas' },
  { label: '📚 Libros, Revistas & Editorial', value: '/categoria/editorial-merchandising' },
  { label: '🏢 Gran Formato & Publicidad', value: '/categoria/gran-formato' },
  { label: '🌐 Aliado Atrio Agencia (Externo)', value: 'https://www.atrioagencia.com' }
];

export const READY_BANNER_TEMPLATES: ReadyBannerTemplate[] = [
  {
    id: 'tpl-offset',
    name: 'Litografía Offset 300 DPI Industrial',
    description: 'Impresión de alta precisión para grandes tirajes con chequeo pre-prensa.',
    category: 'Imprenta',
    title: 'Impresión Litográfica de Alta Definición 300 DPI',
    subtitle: 'Tecnología digital y offset con chequeo pre-prensa incluido y cotización automática por volumen.',
    tag: 'Calidad Litográfica Garantizada',
    ctaText: 'Explorar Catálogo',
    linkType: 'CATEGORY',
    linkUrl: '/categoria/todas',
    placement: 'hero',
    animationType: 'fade',
    bgType: 'IMAGE',
    desktopImageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop',
    gradientFrom: '#042f2e',
    gradientTo: '#0f766e',
    bgColor: '#0f172a',
    textColor: '#ffffff',
    overlayOpacity: 55,
    extraConfig: {
      textAlign: 'left',
      tagBgColor: '#14b8a6',
      tagTextColor: '#022c22',
      ctaBgColor: '#14b8a6',
      ctaTextColor: '#022c22',
      overlayType: 'GRADIENT',
      overlayDirection: '135deg'
    }
  },
  {
    id: 'tpl-atrio',
    name: 'Alianza Estratégica: Atrio Agencia S.A.S',
    description: 'Estrategias de marketing digital omnicanal, diseño de marca y crecimiento.',
    category: 'Alianza',
    title: '¿Necesitas impulsar tu marca en digital?',
    subtitle: 'Tenemos la agencia que necesitas para todo lo que tiene que ver con marketing digital, diseño de marca y más. Potencia tus impresos con estrategias digitales de alto impacto.',
    tag: 'Aliado Estratégico • Atrio Agencia S.A.S',
    ctaText: 'Visitar ATRIO AGENCIA S.A.S.',
    linkType: 'EXTERNAL',
    linkUrl: 'https://www.atrioagencia.com',
    placement: 'partner',
    animationType: 'fade',
    bgType: 'GRADIENT',
    desktopImageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2000&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800&auto=format&fit=crop',
    gradientFrom: '#0f172a',
    gradientTo: '#312e81',
    bgColor: '#0f172a',
    textColor: '#ffffff',
    overlayOpacity: 45,
    extraConfig: {
      textAlign: 'left',
      tagBgColor: '#6366f1',
      tagTextColor: '#ffffff',
      ctaBgColor: '#4f46e5',
      ctaTextColor: '#ffffff',
      overlayType: 'GRADIENT',
      overlayDirection: '135deg'
    }
  },
  {
    id: 'tpl-packaging',
    name: 'Cajas & Empaques Personalizados con Foil',
    description: 'Presentaciones premium con acabados de lujo, relieve y reserva UV brillante.',
    category: 'Empaques',
    title: 'Cajas & Empaques Personalizados de Lujo',
    subtitle: 'Lleva la presentación de tu marca al siguiente nivel con acabados de lujo, foil dorado y reserva UV.',
    tag: 'Línea de Empaques Premium',
    ctaText: 'Ver Empaques',
    linkType: 'CATEGORY',
    linkUrl: '/categoria/empaques-cajas',
    placement: 'hero',
    animationType: 'zoom',
    bgType: 'IMAGE',
    desktopImageUrl: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=2000&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=800&auto=format&fit=crop',
    gradientFrom: '#451a03',
    gradientTo: '#b45309',
    bgColor: '#0f172a',
    textColor: '#ffffff',
    overlayOpacity: 50,
    extraConfig: {
      textAlign: 'left',
      tagBgColor: '#f59e0b',
      tagTextColor: '#451a03',
      ctaBgColor: '#f59e0b',
      ctaTextColor: '#451a03',
      overlayType: 'GRADIENT',
      overlayDirection: '135deg'
    }
  },
  {
    id: 'tpl-w2p-canvas',
    name: 'Personalizador Online Canvas 300 DPI',
    description: 'Diseño directo en navegador con previsualización 3D y guías de sangrado.',
    category: 'Web-To-Print',
    title: 'Personaliza Online con el Editor Canvas W2P',
    subtitle: 'Diseña tus piezas gráficas con guías de corte y resolución 300 DPI lista para imprenta.',
    tag: 'Web-To-Print 300 DPI',
    ctaText: 'Diseñar en Línea',
    linkType: 'PRODUCT',
    linkUrl: '/diseñador/tarjetas-estandar',
    placement: 'hero',
    animationType: 'fade',
    bgType: 'IMAGE',
    desktopImageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2000&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=800&auto=format&fit=crop',
    gradientFrom: '#083344',
    gradientTo: '#0284c7',
    bgColor: '#0f172a',
    textColor: '#ffffff',
    overlayOpacity: 50,
    extraConfig: {
      textAlign: 'left',
      tagBgColor: '#0ea5e9',
      tagTextColor: '#ffffff',
      ctaBgColor: '#0ea5e9',
      ctaTextColor: '#ffffff',
      overlayType: 'GRADIENT',
      overlayDirection: '135deg'
    }
  },
  {
    id: 'tpl-top-bar',
    name: 'Barra Superior: Envíos Gratis Colombia',
    description: 'Cinta fija superior para promociones relámpago y política de despachos.',
    category: 'Avisos',
    title: 'Envíos Gratis a toda Colombia en compras superiores a $200.000 COP',
    subtitle: 'Aplica para tirajes litográficos y gran formato a nivel nacional',
    tag: 'Envío Flash',
    ctaText: 'Ver Catálogo',
    linkType: 'CATEGORY',
    linkUrl: '/categoria/todas',
    placement: 'top_bar',
    animationType: 'fade',
    bgType: 'GRADIENT',
    desktopImageUrl: '',
    mobileImageUrl: '',
    gradientFrom: '#042f2e',
    gradientTo: '#0f766e',
    bgColor: '#0f172a',
    textColor: '#ffffff',
    overlayOpacity: 0,
    extraConfig: {
      textAlign: 'center',
      tagBgColor: '#5eead4',
      tagTextColor: '#042f2e',
      ctaBgColor: '#ffffff',
      ctaTextColor: '#042f2e',
      overlayType: 'NONE',
      overlayDirection: '90deg'
    }
  }
];
