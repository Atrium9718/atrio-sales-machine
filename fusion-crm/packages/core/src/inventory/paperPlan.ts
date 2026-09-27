import { paperItemId, type SheetFormat } from './stock';

/**
 * Papel de una OT calculado con la ficha de la Ayuda para cotizar: por cada papel, pliego y
 * corte, cuántas hojas se imprimen (con mácula) y cuántos pliegos hay que sacar de bodega.
 * Se reserva al aprobar la cotización y se descarga del inventario al entrar a producción.
 */

export interface PaperPlanLine {
  key: string;
  paperName: string;
  sheetFormat: SheetFormat;
  cutCode: string;
  divisor: number;
  /** Pliegos que hay que sacar de bodega. */
  pliegos: number;
  /** Hojas del corte que se imprimen (incluye mácula). */
  cutSheets: number;
  /** Ítem del pliego entero y del corte en el inventario. */
  sourceItemId: string;
  cutItemId: string;
  items: string[];
  /** Pliegos reservados en bodega para esta OT (0 si el papel no está en el inventario). */
  reserved?: number;
  inInventory?: boolean;
}

export interface PaperPlan {
  status: 'PENDIENTE' | 'RESERVADO' | 'DESCARGADO' | 'SIN_PAPEL';
  lines: PaperPlanLine[];
  /** Impresión digital: la cotización no dice el papel; se registra a mano. */
  digital: { format: string; sheets: number; description: string }[];
  notes: string[];
  computedAt: string;
  reservedAt?: string;
  dischargedAt?: string;
  dischargedBy?: string;
  /** Lo que salió realmente al descargar. */
  discharged?: { itemName: string; quantity: number; unit: string; cost: number }[];
}

const firstLine = (s: unknown) => String(s ?? '').split('\n')[0].slice(0, 80) || 'Ítem';

export function paperPlanFromItems(items: any[], cuts: { code: string; divisor: number }[], now = new Date()): PaperPlan {
  const lines = new Map<string, PaperPlanLine>();
  const digital: PaperPlan['digital'] = [];
  const notes: string[] = [];

  for (const it of Array.isArray(items) ? items : []) {
    const form = it?.assistInput ?? {};
    const technique = it?.printTechnique ?? form.technique;
    const label = firstLine(it?.description || it?.name);
    if (technique === 'DIGITAL') {
      if (Number(it.sheetsNeeded) > 0) digital.push({ format: String(form.digitalFormatName || 'Digital'), sheets: Number(it.sheetsNeeded), description: label });
      continue;
    }
    if (technique !== 'LITHO') {
      if (it?.assistInput) notes.push(`${label}: técnica sin papel calculado`);
      continue;
    }
    const paperName = String(it.paperTypeId || form.paperName || '').trim();
    const sheetFormat = (form.sheetFormat || it.sheetFormat) as SheetFormat;
    const cutCode = String(form.sheetCutCode || it.sheetCutCode || '.1');
    const divisor = cuts.find((c) => c.code === cutCode)?.divisor ?? 0;
    const cutSheets = Math.ceil(Number(it.sheetsNeeded) || 0);
    if (!paperName || !sheetFormat || !divisor || cutSheets <= 0) {
      notes.push(`${label}: faltan datos de papel en la cotización (papel, pliego, corte u hojas)`);
      continue;
    }
    const pliegos = Math.ceil(Number(it.paperSheets) || cutSheets / divisor);
    const key = `${paperName}|${sheetFormat}|${cutCode}`;
    const line = lines.get(key) ?? {
      key,
      paperName,
      sheetFormat,
      cutCode,
      divisor,
      pliegos: 0,
      cutSheets: 0,
      sourceItemId: paperItemId({ name: paperName, sheetFormat, cutCode: '.1' }),
      cutItemId: paperItemId({ name: paperName, sheetFormat, cutCode }),
      items: [],
    };
    line.pliegos += pliegos;
    line.cutSheets += cutSheets;
    line.items.push(`${label} · ${Number(it.quantity || 0).toLocaleString('es-CO')} un.`);
    lines.set(key, line);
  }

  const list = [...lines.values()];
  return { status: list.length ? 'PENDIENTE' : 'SIN_PAPEL', lines: list, digital, notes, computedAt: now.toISOString() };
}

/** Pliegos que hay que cortar para completar las hojas, usando primero las hojas ya cortadas. */
export function pliegosToCut(line: Pick<PaperPlanLine, 'cutSheets' | 'divisor'>, cutAvailable: number): number {
  if (line.divisor <= 1) return 0;
  return Math.ceil(Math.max(0, line.cutSheets - Math.max(0, cutAvailable)) / line.divisor);
}
