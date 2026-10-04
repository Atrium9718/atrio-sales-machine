import os

with open('src/admin/banners/BannersPage.tsx', 'r') as f:
    content = f.read()

import re

NEW_CONTENT = """
import { useState, useEffect } from 'react';
import BannerForm from './BannerForm';
import { Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function BannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchBanners();
    }
  }, [token]);

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/admin/banners', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // format dates for form
        const formatted = data.map((b: any) => ({
          ...b,
          startDate: b.startDate ? b.startDate.split('T')[0] : '',
          endDate: b.endDate ? b.endDate.split('T')[0] : ''
        }));
        setBanners(formatted);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    try {
      const url = editingBanner ? `/api/admin/banners/${editingBanner.id}` : '/api/admin/banners';
      const method = editingBanner ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        await fetchBanners();
        setIsFormOpen(false);
        setEditingBanner(null);
      } else {
        alert('Error al guardar el banner');
      }
    } catch (error) {
      console.error(error);
      alert('Error guardando banner');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este banner?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchBanners();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando banners...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Gestión de Banners</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Administra los banners publicitarios de la página principal</p>
        </div>
        <button 
          onClick={() => { setEditingBanner(null); setIsFormOpen(true); }}
          className="bg-teal-500 hover:bg-teal-600 text-white px-5 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
        >
          <Plus size={18} /> Nuevo Banner
        </button>
      </div>

      {isFormOpen ? (
        <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100">
          <h2 className="text-xl font-extrabold mb-6 text-slate-900 border-b border-slate-100 pb-4">
            {editingBanner ? 'Editar Banner' : 'Crear Nuevo Banner'}
          </h2>
          <BannerForm 
            initialData={editingBanner}
            onCancel={() => { setIsFormOpen(false); setEditingBanner(null); }}
            onSubmit={handleSave}
          />
        </div>
      ) : (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Visualización</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Detalles</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Redirección</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="h-14 w-32 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
                        {banner.desktopImageUrl ? (
                          <img className="h-full w-full object-cover" src={banner.desktopImageUrl} alt={banner.title} />
                        ) : (
                          <ImageIcon size={20} />
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{banner.title || 'Sin Título'}</div>
                      <div className="text-sm font-medium text-slate-500">{banner.subtitle || 'Sin subtítulo'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 mb-1">
                        {banner.linkType}
                      </span>
                      <div className="text-xs font-medium text-slate-400 truncate max-w-[150px]">{banner.linkUrl}</div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-lg ${banner.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {banner.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingBanner(banner); setIsFormOpen(true); }}
                          className="text-slate-400 hover:text-blue-500 p-2 rounded-xl hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(banner.id)}
                          className="text-slate-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {banners.length === 0 && (
            <div className="p-12 text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                 <ImageIcon size={32} />
               </div>
               <h3 className="text-lg font-bold text-slate-900 mb-2">No hay banners</h3>
               <p className="text-slate-500 max-w-sm mx-auto">No has creado ningún banner todavía. Haz clic en "Nuevo Banner" para comenzar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
"""

with open('src/admin/banners/BannersPage.tsx', 'w') as f:
    f.write(NEW_CONTENT)
