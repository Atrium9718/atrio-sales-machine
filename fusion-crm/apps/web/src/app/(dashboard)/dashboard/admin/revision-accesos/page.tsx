import React, { useEffect, useState } from 'react';
import { FileCheck, Download, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function RevisionAccesosPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/access-reviews')
      .then(r => r.json())
      .then(data => {
        setReviews(data);
        setLoading(false);
      });
  }, []);

  const startNewReview = async () => {
    try {
      const res = await fetch('/api/admin/access-reviews', { method: 'POST' });
      if(res.ok) {
        const review = await res.json();
        setReviews([review, ...reviews]);
      }
    } catch(e) {
      alert("Error iniciando revisión");
    }
  };

  if (loading) return <div className="p-8">Cargando revisiones...</div>;

  return (
    <div className="p-6 h-full flex flex-col bg-background">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileCheck className="text-primary" /> Revisión de Accesos</h1>
          <p className="text-muted-foreground mt-1">Auditorías trimestrales de acceso y privilegios (Compliance).</p>
        </div>
        <button onClick={startNewReview} className="bg-primary text-primary-foreground px-4 py-2 rounded flex items-center gap-2 hover:bg-primary/90">
          Iniciar Nueva Revisión
        </button>
      </div>

      <div className="space-y-4 max-w-4xl">
        {reviews.length === 0 && (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
            No se han realizado revisiones de acceso.
          </div>
        )}
        {reviews.map((review, i) => (
          <div key={review.id} className="border border-border bg-card rounded-lg p-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  Revisión Trimestral Q{Math.floor(new Date(review.periodStart).getMonth()/3) + 1}
                  <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold tracking-wider ${review.status === 'OPEN' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                    {review.status}
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Periodo: {new Date(review.periodStart).toLocaleDateString()} al {new Date(review.periodEnd).toLocaleDateString()}</p>
              </div>
              {review.status === 'COMPLETED' && (
                <button className="flex items-center gap-1 text-primary hover:underline text-sm font-medium">
                  <Download className="w-4 h-4" /> Exportar PDF (Firmado)
                </button>
              )}
            </div>

            {review.status === 'OPEN' && (
              <div className="mt-5 border-t border-border pt-4">
                <h4 className="font-medium mb-3">Hallazgos Pendientes de Resolución:</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-border rounded bg-muted/20">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="text-yellow-500 w-5 h-5" />
                      <div>
                        <div className="font-medium text-sm">3 usuarios inactivos por más de 90 días</div>
                        <div className="text-xs text-muted-foreground">Último acceso detectado: Vendedor Remoto (Hace 120 días).</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-red-500/10 text-red-500 rounded text-xs font-bold hover:bg-red-500/20">DESACTIVAR</button>
                      <button className="px-3 py-1 bg-background border border-border rounded text-xs font-medium hover:bg-muted">MANTENER</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded bg-muted/20">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="text-primary w-5 h-5" />
                      <div>
                        <div className="font-medium text-sm">Validación de cuentas Admin (2)</div>
                        <div className="text-xs text-muted-foreground">Todos poseen 2FA configurado.</div>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-bold hover:bg-primary/90">VALIDADO</button>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:bg-primary/90">
                    Finalizar Revisión
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
