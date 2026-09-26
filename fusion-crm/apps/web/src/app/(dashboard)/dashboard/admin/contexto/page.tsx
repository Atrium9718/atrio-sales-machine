import React, { useState } from 'react';
import { Book, FileText, HardDrive, RefreshCw, Plus, Link } from 'lucide-react';

export default function ContextoPage() {
  const sources = [
    { id: '1', name: 'Fichas técnicas de materiales', type: 'DOCUMENT', status: 'SYNCED', lastSync: '2026-09-12 08:00', chunks: 145 },
    { id: '2', name: 'Tiempos estándar por máquina', type: 'SPREADSHEET', status: 'SYNCED', lastSync: '2026-09-11 15:30', chunks: 32 },
    { id: '3', name: 'Fórmulas de desperdicio vigentes', type: 'KNOWLEDGE_ARTICLE', status: 'SYNCED', lastSync: '2026-09-01 10:00', chunks: 8 },
    { id: '4', name: 'Manuales de Operación (Drive)', type: 'DRIVE_FOLDER', status: 'SYNCING', lastSync: 'En progreso...', chunks: 0 }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'DOCUMENT': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'SPREADSHEET': return <Database className="w-5 h-5 text-green-500" />;
      case 'DRIVE_FOLDER': return <HardDrive className="w-5 h-5 text-amber-500" />;
      default: return <Book className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fuentes de Contexto</h1>
          <p className="text-muted-foreground mt-1">Administra los documentos, bases de datos y artículos que alimentan el RAG de la IA.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Fuente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Fuentes Activas</div>
          <div className="text-2xl font-bold">12</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Fragmentos (Chunks)</div>
          <div className="text-2xl font-bold">4,892</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Última Sincronización</div>
          <div className="text-2xl font-bold">Hace 2h</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Fuente</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Última Sincronización</th>
              <th className="px-4 py-3 font-medium text-right">Fragmentos</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sources.map(s => (
              <tr key={s.id} className="hover:bg-muted/20">
                <td className="px-4 py-4 font-medium flex items-center gap-3">
                  {getIcon(s.type)} {s.name}
                </td>
                <td className="px-4 py-4 text-xs font-mono text-muted-foreground">{s.type}</td>
                <td className="px-4 py-4">
                  {s.status === 'SYNCED' ? (
                    <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-full">Sincronizado</span>
                  ) : (
                    <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full flex items-center gap-1 w-fit"><RefreshCw className="w-3 h-3 animate-spin"/> Sincronizando</span>
                  )}
                </td>
                <td className="px-4 py-4 text-muted-foreground">{s.lastSync}</td>
                <td className="px-4 py-4 text-right font-mono">{s.chunks}</td>
                <td className="px-4 py-4 text-right">
                  <button className="text-muted-foreground hover:text-primary transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// This requires a minor fix for missing icon
import { Database } from 'lucide-react';
