import os

NEW_CONTENT = """
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, Search, LayoutTemplate } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) fetchTemplates();
  }, [token]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createDummyTemplate = async () => {
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'Plantilla de Prueba ' + Date.now(),
          canvasData: { version: '1.0.0', objects: [] },
          active: true
        })
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!window.confirm('¿Eliminar plantilla?')) return;
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando plantillas...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Gestor de Plantillas</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Administra las plantillas editables (Fabric.js) para los productos</p>
        </div>
        <button 
          onClick={createDummyTemplate}
          className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
        >
          <Plus size={18} /> Nueva Plantilla
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
           <div className="relative w-full sm:w-96">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Buscar plantilla por nombre..."
               className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
             />
           </div>
           <select className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
             <option value="">Todas las Categorías</option>
           </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Plantilla</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {templates.length === 0 ? (
                <tr>
                   <td colSpan={3} className="py-12 text-center text-slate-500">No hay plantillas creadas.</td>
                </tr>
              ) : templates.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                        <LayoutTemplate size={20} />
                      </div>
                      <span className="font-bold text-slate-900">{tpl.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-lg ${tpl.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {tpl.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-slate-400 hover:text-teal-500 p-2 rounded-xl hover:bg-teal-50 transition-colors" title="Editar en Editor Visual">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => deleteTemplate(tpl.id)} className="text-slate-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
"""

with open('src/admin/templates/TemplatesPage.tsx', 'w') as f:
    f.write(NEW_CONTENT)
