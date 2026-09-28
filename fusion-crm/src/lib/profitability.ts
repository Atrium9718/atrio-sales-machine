/**
 * Rentabilidad por orden de producción: venta (cotización), costo estimado (el que calculó el
 * cotizador para cada ítem) y costo real (lo que producción registra: mano de obra, materiales,
 * terceros y otros).
 */

export interface ProfitabilityRow {
  projectId: string;
  number: string;
  client: string;
  name: string;
  createdAt?: string;
  completed: boolean;
  sale: number;
  estimatedCost: number | null;
  /** Parte del costo estimado que se dedujo del margen (ítems sin costo del motor). */
  estimatedFromMargin: boolean;
  realCost: number;
  realBreakdown: { labor: number; material: number; outsourced: number; other: number };
  realHours: number;
  estimatedMargin: number | null;
  realMargin: number | null;
  /** Costo real / costo estimado - 1 (positivo = gastó más de lo previsto). */
  costDeviation: number | null;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const lineSubtotal = (it: any) => num(it.lineSubtotal ?? it.subtotal ?? num(it.quantity) * num(it.unitPrice));

/** Costo estimado de un ítem de cotización (total de la línea). */
export function estimateItemCost(it: any): { cost: number; fromMargin: boolean } | null {
  if (num(it.internalCost) > 0) return { cost: num(it.internalCost), fromMargin: false };
  const m = num(it.marginPercent);
  const sub = lineSubtotal(it);
  // Cotizador manual: precio = costo × (1 + margen)
  if (sub > 0 && m > 0) return { cost: sub / (1 + m / 100), fromMargin: true };
  return null;
}

export function quoteSale(quote: any, project: any): number {
  if (quote) {
    if (num(quote.subtotal) > 0) return num(quote.subtotal);
    const items = Array.isArray(quote.items) ? quote.items : [];
    const sum = items.reduce((s: number, it: any) => s + lineSubtotal(it), 0);
    if (sum > 0) return sum;
    if (num(quote.total) > 0) return num(quote.total) / 1.19;
  }
  return num(project?.quoteTotal) / 1.19;
}

export function findQuoteFor(project: any, quotes: any[]) {
  return (
    quotes.find((q) => project.quoteId && q.id === project.quoteId) ||
    quotes.find((q) => project.quoteNumber && q.number && String(q.number).trim().toLowerCase() === String(project.quoteNumber).trim().toLowerCase()) ||
    null
  );
}

export function computeProfitability(projects: any[], quotes: any[]): ProfitabilityRow[] {
  return projects.map((p) => {
    const quote = findQuoteFor(p, quotes);
    const sale = quoteSale(quote, p);
    const items: any[] = Array.isArray(quote?.items) ? quote.items : [];
    const estimates = items.map(estimateItemCost);
    const known = estimates.filter((e): e is { cost: number; fromMargin: boolean } => e !== null);
    const estimatedCost = items.length && known.length === items.length ? known.reduce((s, e) => s + e.cost, 0) : null;
    const realBreakdown = { labor: num(p.laborCost), material: num(p.materialCost), outsourced: num(p.outsourcedCost), other: num(p.otherCost) };
    const realCost = realBreakdown.labor + realBreakdown.material + realBreakdown.outsourced + realBreakdown.other;
    const margin = (cost: number | null) => (cost === null || sale <= 0 ? null : (sale - cost) / sale);
    return {
      projectId: p.id,
      number: p.number || p.id,
      client: p.client || quote?.clientName || '',
      name: p.name || '',
      createdAt: p.createdAt,
      completed: !!p.completedAt,
      sale,
      estimatedCost,
      estimatedFromMargin: known.some((e) => e.fromMargin),
      realCost,
      realBreakdown,
      realHours: num(p.totalRealHours),
      estimatedMargin: margin(estimatedCost),
      realMargin: realCost > 0 ? margin(realCost) : null,
      costDeviation: estimatedCost && realCost > 0 ? realCost / estimatedCost - 1 : null,
    };
  });
}

export function summarize(rows: ProfitabilityRow[]) {
  const withReal = rows.filter((r) => r.realCost > 0);
  const sale = withReal.reduce((s, r) => s + r.sale, 0);
  const real = withReal.reduce((s, r) => s + r.realCost, 0);
  const withEst = withReal.filter((r) => r.estimatedCost !== null);
  const est = withEst.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
  const estSale = withEst.reduce((s, r) => s + r.sale, 0);
  return {
    orders: rows.length,
    withRealCosts: withReal.length,
    sale,
    realCost: real,
    realMargin: sale > 0 ? (sale - real) / sale : null,
    estimatedMargin: estSale > 0 ? (estSale - est) / estSale : null,
    overBudget: rows.filter((r) => (r.costDeviation ?? 0) > 0.1).length,
    breakdown: withReal.reduce(
      (acc, r) => ({
        labor: acc.labor + r.realBreakdown.labor,
        material: acc.material + r.realBreakdown.material,
        outsourced: acc.outsourced + r.realBreakdown.outsourced,
        other: acc.other + r.realBreakdown.other,
      }),
      { labor: 0, material: 0, outsourced: 0, other: 0 }
    ),
  };
}
