import os

NEW_CONTENT = """
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { UploadCloud, Palette } from 'lucide-react';

export default function BannerForm({ initialData, onSubmit, onCancel }: { initialData: any, onSubmit: (data: any) => void, onCancel: () => void }) {
  const { register, handleSubmit, control, watch, setValue } = useForm({
    defaultValues: initialData || {
      title: '',
      subtitle: '',
      bgType: 'IMAGE', // 'IMAGE' | 'COLOR'
      bgColor: '#14b8a6', // default teal
      desktopImageUrl: '',
      mobileImageUrl: '',
      linkType: 'CATEGORY',
      linkUrl: '',
      startDate: '',
      endDate: '',
      active: true,
    }
  });

  const linkType = watch('linkType');
  const bgType = watch('bgType');
  const desktopImageUrl = watch('desktopImageUrl');
  const mobileImageUrl = watch('mobileImageUrl');
  const bgColor = watch('bgColor');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'desktopImageUrl' | 'mobileImageUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      // Create local preview URL. 
      // In production, upload to R2/S3 and get real URL here.
      const localUrl = URL.createObjectURL(file);
      setValue(field, localUrl);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 gap-y-6 gap-x-8 md:grid-cols-2">
        
        {/* Título y Subtítulo */}
        <div className="col-span-1">
          <label className="block text-sm font-bold text-slate-700 mb-2">Título Principal</label>
          <input 
            type="text" 
            {...register('title')} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors" 
            placeholder="Ej: Gran Promoción"
          />
        </div>
        
        <div className="col-span-1">
          <label className="block text-sm font-bold text-slate-700 mb-2">Subtítulo (Opcional)</label>
          <input 
            type="text" 
            {...register('subtitle')} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors" 
            placeholder="Ej: Descuentos en tarjetas de presentación"
          />
        </div>

        {/* Selección de Fondo */}
        <div className="col-span-1 md:col-span-2">
           <label className="block text-sm font-bold text-slate-700 mb-3">Estilo de Fondo del Banner</label>
           <div className="flex gap-4">
              <label className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${bgType === 'IMAGE' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                 <input type="radio" value="IMAGE" {...register('bgType')} className="hidden" />
                 <UploadCloud size={18} /> <span className="font-bold">Usar Imagen</span>
              </label>
              <label className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${bgType === 'COLOR' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                 <input type="radio" value="COLOR" {...register('bgType')} className="hidden" />
                 <Palette size={18} /> <span className="font-bold">Color Sólido</span>
              </label>
           </div>
        </div>

        {/* Imágenes / Color Picker */}
        {bgType === 'IMAGE' ? (
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Subir Imagen Escritorio (1920x600 px)</label>
              <div className="relative h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-white hover:border-teal-400 transition-colors overflow-hidden group">
                 {desktopImageUrl ? (
                    <img src={desktopImageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                 ) : (
                    <>
                      <UploadCloud className="text-slate-400 mb-2" size={24} />
                      <span className="text-xs font-bold text-slate-500">Clic para subir imagen</span>
                    </>
                 )}
                 <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'desktopImageUrl')} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
                 {desktopImageUrl && (
                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                     <span className="text-white font-bold text-sm">Cambiar Imagen</span>
                   </div>
                 )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Subir Imagen Móvil (800x800 px)</label>
              <div className="relative h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-white hover:border-teal-400 transition-colors overflow-hidden group">
                 {mobileImageUrl ? (
                    <img src={mobileImageUrl} alt="Preview Mobile" className="absolute inset-0 w-full h-full object-cover" />
                 ) : (
                    <>
                      <UploadCloud className="text-slate-400 mb-2" size={24} />
                      <span className="text-xs font-bold text-slate-500">Clic para subir imagen</span>
                    </>
                 )}
                 <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'mobileImageUrl')} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
                 {mobileImageUrl && (
                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                     <span className="text-white font-bold text-sm">Cambiar Imagen</span>
                   </div>
                 )}
              </div>
            </div>
          </div>
        ) : (
          <div className="col-span-1 md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-100">
             <label className="block text-sm font-bold text-slate-700 mb-2">Selecciona el Color de Fondo</label>
             <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  {...register('bgColor')}
                  className="w-16 h-16 rounded-xl cursor-pointer border-0 p-0"
                />
                <input 
                  type="text" 
                  value={bgColor}
                  readOnly
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-mono text-slate-600"
                />
             </div>
             <p className="text-xs text-slate-400 mt-2 font-medium">El texto del banner se adaptará para mantener el contraste.</p>
          </div>
        )}

        {/* Redirección */}
        <div className="col-span-1">
          <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Redirección</label>
          <select 
            {...register('linkType')} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
          >
            <option value="CATEGORY">Categoría del Catálogo</option>
            <option value="PRODUCT">Producto Específico</option>
            <option value="EXTERNAL">Enlace Externo</option>
          </select>
        </div>
        
        <div className="col-span-1">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Destino ({linkType === 'EXTERNAL' ? 'URL completa' : 'ID o Slug del destino'})
          </label>
          <input 
            type="text" 
            {...register('linkUrl')} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors" 
            placeholder={linkType === 'EXTERNAL' ? "https://..." : "ej: tarjetas-presentacion"}
          />
        </div>

        {/* Fechas de Campaña */}
        <div className="col-span-1">
          <label className="block text-sm font-bold text-slate-700 mb-2">Fecha de Inicio (Opcional)</label>
          <input 
            type="date" 
            {...register('startDate')} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors" 
          />
        </div>
        
        <div className="col-span-1">
          <label className="block text-sm font-bold text-slate-700 mb-2">Fecha de Fin (Opcional)</label>
          <input 
            type="date" 
            {...register('endDate')} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors" 
          />
          <p className="mt-2 text-xs font-medium text-slate-400">Dejar en blanco si el banner es permanente.</p>
        </div>

        {/* Switch Activo */}
        <div className="col-span-1 md:col-span-2 pt-2">
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <label className="flex items-center cursor-pointer p-4 bg-white rounded-xl border border-slate-200 w-max hover:border-teal-200 transition-colors">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={field.value} onChange={field.onChange} />
                  <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ease-in-out ${field.value ? 'bg-teal-500' : 'bg-slate-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out shadow-sm ${field.value ? 'transform translate-x-6' : ''}`}></div>
                </div>
                <div className="ml-4 text-sm font-bold text-slate-800">
                  Estado: {field.value ? 'Banner Visible' : 'Banner Oculto'}
                </div>
              </label>
            )}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-8">
        <button 
          type="button" 
          onClick={onCancel} 
          className="px-6 py-2.5 rounded-full font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-2.5 rounded-full font-bold shadow-sm shadow-teal-500/20 transition-transform active:scale-95"
        >
          Guardar Banner
        </button>
      </div>
    </form>
  );
}
"""

with open('src/admin/banners/BannerForm.tsx', 'w') as f:
    f.write(NEW_CONTENT)
