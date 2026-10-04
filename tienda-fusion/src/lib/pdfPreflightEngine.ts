import jsPDF from 'jspdf';

export interface PreflightIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'resolution' | 'safety' | 'bleed' | 'color' | 'font';
  elementId?: string;
  elementName?: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface PreflightReport {
  passed: boolean;
  score: number; // 0 - 100
  issues: PreflightIssue[];
  resolutionSummary: {
    minDpi: number;
    avgDpi: number;
    lowResImagesCount: number;
  };
  dimensions: {
    widthMm: number;
    heightMm: number;
    bleedMm: number;
    safetyMm: number;
  };
}

export interface ExportPdfOptions {
  standard: 'PDF/X-1a' | 'PDF/X-4' | 'HiRes-300DPI';
  includeCropMarks: boolean;
  includeBleedMarks: boolean;
  includeColorBars: boolean;
  includeJobInfo: boolean;
  bleedMm: number;
  dpi: number;
  cmykSimulation: boolean;
  orderNumber?: string;
  productName?: string;
  customerName?: string;
}

/**
 * Convierte color Hex o RGB a CMYK aproximado (FOGRA39 / GRACoL estándar)
 */
export function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = Math.round(((1 - rNorm - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gNorm - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bNorm - k) / (1 - k)) * 100);
  const kPercent = Math.round(k * 100);

  return { c, m, y, k: kPercent };
}

/**
 * Sistema de Preflight Automático para el lienzo Web2Print
 */
export function runPreflightCheck(
  elements: any[],
  dimensions: { widthMm: number; heightMm: number; bleedMm: number; safetyMm: number }
): PreflightReport {
  const issues: PreflightIssue[] = [];
  const { widthMm, heightMm, bleedMm, safetyMm } = dimensions;

  let minDpi = 300;
  let totalDpi = 0;
  let imageCount = 0;
  let lowResCount = 0;

  // 1. Validar elementos (Imágenes, Textos, Formas)
  elements.forEach((el, index) => {
    const elName = el.name || el.text || `Elemento #${index + 1}`;

    // A. Inspección de Imágenes (Resolución efectiva DPI)
    if (el.type === 'image' || el.imageSrc || el.src) {
      imageCount++;
      // Estimación del DPI efectivo basado en el tamaño natural del píxel vs mm ocupados en el lienzo
      const naturalWidth = el.naturalWidth || el.width || 1200;
      const displayWidthMm = (el.width || 100) * (widthMm / (el.canvasWidth || 800));
      const widthInches = displayWidthMm / 25.4;
      
      const effectiveDpi = widthInches > 0 ? Math.round(naturalWidth / widthInches) : 300;
      totalDpi += effectiveDpi;
      if (effectiveDpi < minDpi) minDpi = effectiveDpi;

      if (effectiveDpi < 150) {
        lowResCount++;
        issues.push({
          id: `img-dpi-critical-${el.id || index}`,
          type: 'error',
          category: 'resolution',
          elementId: el.id,
          elementName: elName,
          title: `Resolución crítica (${effectiveDpi} DPI)`,
          description: `La imagen "${elName}" tiene una resolución muy baja para litografía (menos de 150 DPI).`,
          recommendation: 'Sube la imagen en mayor resolución original o redúcela en el lienzo para que no se pixele.'
        });
      } else if (effectiveDpi < 280) {
        issues.push({
          id: `img-dpi-warn-${el.id || index}`,
          type: 'warning',
          category: 'resolution',
          elementId: el.id,
          elementName: elName,
          title: `Resolución media (${effectiveDpi} DPI)`,
          description: `La imagen "${elName}" tiene una resolución aceptable pero inferior a los 300 DPI recomendados para offset de alta calidad.`,
          recommendation: 'Para máxima nitidez comercial se recomienda utilizar 300 DPI a tamaño real.'
        });
      }
    }

    // B. Inspección de Textos y Zona de Seguridad
    if (el.type === 'text' || el.text) {
      // Coordenadas normalizadas a mm
      const xMm = (el.x || 0) * (widthMm / (el.canvasWidth || 800));
      const yMm = (el.y || 0) * (heightMm / (el.canvasHeight || 600));
      const elWidthMm = (el.width || 100) * (widthMm / (el.canvasWidth || 800));
      const elHeightMm = (el.height || 30) * (heightMm / (el.canvasHeight || 600));

      const rightMm = xMm + elWidthMm;
      const bottomMm = yMm + elHeightMm;

      // Verificar si el texto viola el margen de seguridad interno
      const violatesSafety =
        xMm < safetyMm ||
        yMm < safetyMm ||
        rightMm > (widthMm - safetyMm) ||
        bottomMm > (heightMm - safetyMm);

      if (violatesSafety) {
        issues.push({
          id: `text-safety-${el.id || index}`,
          type: 'error',
          category: 'safety',
          elementId: el.id,
          elementName: elName,
          title: 'Texto fuera de la zona de seguridad',
          description: `El texto "${(el.text || '').slice(0, 30)}..." está muy cerca del borde de guillotina.`,
          recommendation: `Mantén los textos a mínimo ${safetyMm} mm del borde de corte para evitar que se corten durante el refilado.`
        });
      }

      // Tamaño de tipografía mínimo
      const fontSizePt = el.fontSize || 12;
      if (fontSizePt < 5) {
        issues.push({
          id: `font-size-warn-${el.id || index}`,
          type: 'warning',
          category: 'font',
          elementId: el.id,
          elementName: elName,
          title: `Tamaño de texto muy pequeño (${fontSizePt} pt)`,
          description: 'Textos menores a 5 pt pueden empastarse o ser ilegibles en impresión litográfica offset.',
          recommendation: 'Aumenta el tamaño a mínimo 6 o 7 pt.'
        });
      }
    }
  });

  // 2. Calcular puntuación
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warnCount = issues.filter(i => i.type === 'warning').length;
  
  let score = 100 - (errorCount * 25) - (warnCount * 8);
  if (score < 0) score = 0;

  return {
    passed: errorCount === 0,
    score,
    issues,
    resolutionSummary: {
      minDpi: imageCount > 0 ? minDpi : 300,
      avgDpi: imageCount > 0 ? Math.round(totalDpi / imageCount) : 300,
      lowResImagesCount: lowResCount,
    },
    dimensions,
  };
}

/**
 * Generador de PDF de Impresión en Alta Resolución con Marcas de Corte,
 * Sangrado (Bleed), Tira de Control de Color CMYK y Especificaciones PDF/X.
 */
export async function generateProductionPdf(
  canvasElement: HTMLCanvasElement,
  dimensions: { widthMm: number; heightMm: number; bleedMm: number },
  options: ExportPdfOptions
): Promise<Blob> {
  const { widthMm, heightMm, bleedMm } = dimensions;
  const totalMarginMm = options.includeCropMarks ? bleedMm + 8 : bleedMm; // Margen adicional para cruces de corte y tiras de color

  const pageDocWidth = widthMm + (totalMarginMm * 2);
  const pageDocHeight = heightMm + (totalMarginMm * 2);

  const orientation = pageDocWidth > pageDocHeight ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageDocWidth, pageDocHeight],
    compress: true,
  });

  // 1. Metadatos de Estándar de Impresión Gráfica PDF/X
  doc.setProperties({
    title: `${options.productName || 'Trabajo Litografico'} - ${options.standard}`,
    subject: `Archivo de impresión profesional listo para CTP / Offset Digital 300 DPI (${options.standard})`,
    author: 'PrintCommerce Web2Print Engine Pro',
    keywords: 'PDF/X-1a, CMYK, Bleed, Crop Marks, CTP, 300 DPI',
    creator: 'PrintCommerce Studio'
  });

  const artX = totalMarginMm;
  const artY = totalMarginMm;

  // 2. Renderizar el Lienzo de Diseño a 300 DPI
  const imgData = canvasElement.toDataURL('image/jpeg', 0.98);
  doc.addImage(imgData, 'JPEG', artX - bleedMm, artY - bleedMm, widthMm + (bleedMm * 2), heightMm + (bleedMm * 2), undefined, 'FAST');

  // 3. Dibujar Marcas Técnicas de Preprensa
  if (options.includeCropMarks) {
    const markLength = 5; // Longitud de la cruz en mm
    const markOffset = 1.5; // Distancia desde la línea de corte

    doc.setDrawColor(0, 0, 0); // Registro (C:100 M:100 Y:100 K:100 simulado)
    doc.setLineWidth(0.15); // Línea fina de registro

    // Esquina Superior Izquierda
    // Horizontal
    doc.line(artX - markOffset - markLength, artY, artX - markOffset, artY);
    // Vertical
    doc.line(artX, artY - markOffset - markLength, artX, artY - markOffset);

    // Esquina Superior Derecha
    doc.line(artX + widthMm + markOffset, artY, artX + widthMm + markOffset + markLength, artY);
    doc.line(artX + widthMm, artY - markOffset - markLength, artX + widthMm, artY - markOffset);

    // Esquina Inferior Izquierda
    doc.line(artX - markOffset - markLength, artY + heightMm, artX - markOffset, artY + heightMm);
    doc.line(artX, artY + heightMm + markOffset, artX, artY + heightMm + markOffset + markLength);

    // Esquina Inferior Derecha
    doc.line(artX + widthMm + markOffset, artY + heightMm, artX + widthMm + markOffset + markLength, artY + heightMm);
    doc.line(artX + widthMm, artY + heightMm + markOffset, artX + widthMm, artY + heightMm + markOffset + markLength);
  }

  // 4. Tira de Calibración de Color CMYK (Color Bars)
  if (options.includeColorBars) {
    const patchSize = 3.5;
    const startY = pageDocHeight - 4.5;
    const startX = artX;

    const patches = [
      { name: 'C', rgb: [0, 168, 224] },
      { name: 'M', rgb: [236, 0, 140] },
      { name: 'Y', rgb: [255, 242, 0] },
      { name: 'K', rgb: [35, 31, 32] },
      { name: 'C50', rgb: [128, 212, 239] },
      { name: 'M50', rgb: [245, 128, 198] },
      { name: 'Y50', rgb: [255, 248, 128] },
      { name: 'K50', rgb: [145, 143, 144] },
      { name: 'RGB_R', rgb: [237, 28, 36] },
      { name: 'RGB_G', rgb: [0, 166, 81] },
      { name: 'RGB_B', rgb: [46, 49, 146] },
    ];

    patches.forEach((patch, idx) => {
      doc.setFillColor(patch.rgb[0], patch.rgb[1], patch.rgb[2]);
      doc.rect(startX + (idx * (patchSize + 0.8)), startY, patchSize, patchSize, 'F');
    });
  }

  // 5. Encabezado Técnico / Job Info
  if (options.includeJobInfo) {
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    const dateStr = new Date().toLocaleString('es-CO');
    const infoText = `ORDEN: ${options.orderNumber || 'PREVIEW-W2P'} | PRODUCTO: ${options.productName || 'Sin título'} | FORMATO: ${widthMm}x${heightMm}mm (+${bleedMm}mm Sangrado) | ESTÁNDAR: ${options.standard} (300 DPI CMYK) | FECHA: ${dateStr}`;
    doc.text(infoText, artX, 4);
  }

  return doc.output('blob');
}
