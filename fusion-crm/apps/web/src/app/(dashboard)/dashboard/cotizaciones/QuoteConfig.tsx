import { CONFIG } from './quoteModel';

export function QuoteConfig() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-6 min-h-[400px] max-w-2xl">
      <h2 className="text-xl font-bold mb-6 text-foreground">Configuración del Cotizador</h2>
      <div className="space-y-6">
        <div>
          <h3 className="font-bold text-sm mb-3">Márgenes por defecto</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Propio (%)</label>
              <input type="number" defaultValue={CONFIG.margins.IN_HOUSE} className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Tercerizado (%)</label>
              <input type="number" defaultValue={CONFIG.margins.OUTSOURCED} className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Agencia (%)</label>
              <input type="number" defaultValue={CONFIG.margins.AGENCY} className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" />
            </div>
          </div>
        </div>
        
        <hr className="border-border" />
        
        <div>
          <h3 className="font-bold text-sm mb-3">Impuestos</h3>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="rounded border-input text-primary focus:ring-primary" id="ivaCheck" />
            <label htmlFor="ivaCheck" className="text-sm font-medium">Aplicar IVA por defecto (19%)</label>
          </div>
        </div>

        <hr className="border-border" />
        
        <div>
          <h3 className="font-bold text-sm mb-3">Plantillas Base</h3>
          <div className="space-y-4">
             <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Forma de pago predeterminada</label>
                <input type="text" defaultValue="50% anticipo, 50% contra entrega" className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" />
             </div>
             <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Validez predeterminada</label>
                <input type="text" defaultValue="15 días" className="w-full px-3 py-2 border border-input rounded-md text-sm font-medium bg-background" />
             </div>
          </div>
        </div>

        <div className="pt-4">
          <button className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm">
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
