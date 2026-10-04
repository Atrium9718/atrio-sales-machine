import os

NEW_CONTENT = """
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, LayoutTemplate, Upload, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [jsonFileName, setJsonFileName] = useState('');
  const [jsonContent, setJsonContent] = useState<any>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setJsonFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = JSON.parse(event.target?.result as string);
        setJsonContent(content);
      } catch (err) {
        alert('El archivo no es un JSON válido de Fabric.js');
        setJsonFileName('');
        setJsonContent(null);
      }
    };
    reader.readAsText(file);
  };

  const createTemplate = async () => {
    if (!newTemplateName) {
      alert('Debes ingresar un nombre para la plantilla.');
      return;
    }
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTemplateName,
          canvasData: jsonContent || { version: '1.0.0', objects: [] },
          active: true
        })
      });
      if (res.ok) {
        fetchTemplates();
        setIsModalOpen(false);
        setNewTemplateName('');
        setJsonFileName('');
        setJsonContent(null);
      }
    } catch (error) {
      console.error(error);
      alert('Error al subir plantilla');
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
          <p className="text-sm font-medium text-slate-500 mt-1">Sube archivos JSON de Fabric.js para habilitar el editor gráfico online</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
        >
          <Plus size={18} /> Subir Plantilla
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
                   <td colSpan={3} className="py-12 text-center text-slate-500">
                     <LayoutTemplate size={32} className="mx-auto mb-3 text-slate-300" />
                     No hay plantillas subidas. Haz clic en "Subir Plantilla".
                   </td>
                </tr>
              ) : templates.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                        <LayoutTemplate size={20} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{tpl.name}</span>
                        <span className="text-xs text-slate-400 font-medium">Archivo JSON guardado</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-lg ${tpl.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {tpl.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-slate-400 hover:text-teal-500 p-2 rounded-xl hover:bg-teal-50 transition-colors" title="Editar Nombre">
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

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[32px] w-full max-w-md relative p-8 shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-black text-slate-900 mb-6">Subir Nueva Plantilla</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de la Plantilla</label>
                <input 
                  type="text" 
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Ej: Tarjeta Presentación Frontal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Archivo JSON (Fabric.js)</label>
                <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-teal-400 hover:bg-teal-50 transition-colors cursor-pointer">
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                  <p className="text-sm font-bold text-slate-700">
                    {jsonFileName ? jsonFileName : 'Haz clic o arrastra un archivo .json'}
                  </p>
                  {!jsonFileName && <p className="text-xs text-slate-400 mt-1">Exportado desde el editor Fabric.js</p>}
                </div>
              </div>

              <button 
                onClick={createTemplate}
                disabled={!newTemplateName}
                className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-3 rounded-full font-bold transition-colors mt-4"
              >
                Guardar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open('src/admin/templates/TemplatesPage.tsx', 'w') as f:
    f.write(NEW_CONTENT)
