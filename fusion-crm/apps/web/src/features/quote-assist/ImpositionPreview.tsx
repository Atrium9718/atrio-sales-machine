import React from 'react';

interface ImpositionPreviewProps {
  sheetWidthCm: number;
  sheetHeightCm: number;
  artWidthCm: number;
  artHeightCm: number;
  applyBleed: boolean;
  bleedCm?: number;
  gripMarginCm?: number;
  impositionCount: number;
  orientationA: number;
  orientationB: number;
  sheetLabel?: string;
}

export const ImpositionPreview: React.FC<ImpositionPreviewProps> = ({
  sheetWidthCm,
  sheetHeightCm,
  artWidthCm,
  artHeightCm,
  applyBleed,
  bleedCm = 0.6,
  gripMarginCm = 1.0,
  impositionCount,
  orientationA,
  orientationB,
  sheetLabel = 'Formato Útil',
}) => {
  const effectiveArtW = applyBleed ? artWidthCm + bleedCm : artWidthCm;
  const effectiveArtH = applyBleed ? artHeightCm + bleedCm : artHeightCm;

  // Orientación ganadora
  const isRotated = orientationB > orientationA;
  const fittedW = isRotated ? effectiveArtH : effectiveArtW;
  const fittedH = isRotated ? effectiveArtW : effectiveArtH;

  const cols = fittedW > 0 ? Math.floor((sheetWidthCm - gripMarginCm) / fittedW) : 0;
  const rows = fittedH > 0 ? Math.floor(sheetHeightCm / fittedH) : 0;

  // Viewport SVG proportions
  const maxViewW = 320;
  const maxViewH = 180;
  const scale = Math.min(
    maxViewW / Math.max(sheetWidthCm, 1),
    maxViewH / Math.max(sheetHeightCm, 1)
  ) * 0.9;

  const svgW = Math.max(sheetWidthCm * scale, 60);
  const svgH = Math.max(sheetHeightCm * scale, 60);
  const gripW = gripMarginCm * scale;

  const artSvgW = fittedW * scale;
  const artSvgH = fittedH * scale;

  const items: Array<{ x: number; y: number; index: number }> = [];
  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (count < impositionCount) {
        items.push({
          x: gripW + c * artSvgW,
          y: r * artSvgH,
          index: count + 1,
        });
        count++;
      }
    }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <span>Vista Previa de Imposición</span>
          <span className="text-[11px] font-normal text-muted-foreground">
            ({sheetLabel}: {sheetWidthCm} × {sheetHeightCm} cm)
          </span>
        </span>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
          Cabida: {impositionCount} {impositionCount === 1 ? 'unidad' : 'unidades'}
        </span>
      </div>

      <div className="relative flex items-center justify-center min-h-[140px] bg-background/80 rounded-lg border border-dashed border-border/80 p-2 overflow-hidden">
        {impositionCount === 0 || sheetWidthCm <= 0 || sheetHeightCm <= 0 ? (
          <div className="text-center py-4 px-2">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
              El arte ({artWidthCm}×{artHeightCm} cm) excede el tamaño del formato.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Ajusta las dimensiones del arte o selecciona un corte más amplio.
            </p>
          </div>
        ) : (
          <svg
            width={svgW}
            height={svgH}
            className="border border-border/80 shadow-xs bg-slate-50 dark:bg-slate-900 rounded"
            viewBox={`0 0 ${svgW} ${svgH}`}
          >
            {/* Margen de pinza */}
            <rect
              x="0"
              y="0"
              width={gripW}
              height={svgH}
              fill="rgba(245, 158, 11, 0.15)"
              stroke="rgba(245, 158, 11, 0.4)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />

            {/* Artes individuales */}
            {items.map((item) => (
              <g key={item.index}>
                <rect
                  x={item.x + 1}
                  y={item.y + 1}
                  width={Math.max(artSvgW - 2, 2)}
                  height={Math.max(artSvgH - 2, 2)}
                  fill="rgba(37, 99, 235, 0.15)"
                  stroke="rgba(37, 99, 235, 0.6)"
                  strokeWidth="1"
                  rx="1"
                />
                {artSvgW > 18 && artSvgH > 14 && (
                  <text
                    x={item.x + artSvgW / 2}
                    y={item.y + artSvgH / 2 + 3}
                    textAnchor="middle"
                    fontSize="9"
                    fill="currentColor"
                    className="text-primary font-bold select-none pointer-events-none"
                  >
                    #{item.index}
                  </text>
                )}
              </g>
            ))}
          </svg>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/60 inline-block" />
            Pinza (1 cm)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary/20 border border-primary/60 inline-block" />
            Arte {isRotated ? '(girado 90°)' : '(directo)'}
          </span>
        </div>
        <span>
          Arte final: {effectiveArtW.toFixed(1)} × {effectiveArtH.toFixed(1)} cm {applyBleed ? '(c/sangría)' : ''}
        </span>
      </div>
    </div>
  );
};
