import os

with open('src/admin/catalog/ProductBuilderPage.tsx', 'r') as f:
    content = f.read()

# I will rewrite ProductBuilderPage.tsx completely to use the new UI.
NEW_BUILDER = """
import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Plus, Trash2, Save, ArrowLeft, Tag, Layers, Percent, Settings, Image as ImageIcon } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type PricingRule = {
  minQty: number;
  maxQty: number;
  discountPercentage: number;
};

type AttributeValue = {
  valueId: string;
  label: string;
  priceModifier: number;
  weightModifier: number;
  daysModifier: number;
};

type ProductAttribute = {
  attributeId: string;
  name: string;
  values: AttributeValue[];
};

type ProductFormValues = {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  basePrice: number;
  attributes: ProductAttribute[];
  pricingRules: PricingRule[];
};

// Componente hijo para manejar el FieldArray anidado de los valores de un atributo
function AttributeValuesTable({ control, register, attributeIndex, attributeName, onRemove }: any) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `attributes.${attributeIndex}.values`,
  });

  return (
    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center font-bold">
            {attributeName.charAt(0)}
          </div>
          <h4 className="font-extrabold text-lg text-slate-900">{attributeName}</h4>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Valor (Ej. 300g)</th>
              <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Modificador Precio ($)</th>
              <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Peso Adicional (g)</th>
              <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Días Adicionales</th>
              <th className="pb-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fields.map((item, index) => (
              <tr key={item.id} className="group">
                <td className="py-3 pr-2">
                  <input
                    {...register(`attributes.${attributeIndex}.values.${index}.label` as const)}
                    placeholder="Ej. Propalcote 300g"
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 bg-white"
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    {...register(`attributes.${attributeIndex}.values.${index}.priceModifier` as const)}
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 bg-white"
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    {...register(`attributes.${attributeIndex}.values.${index}.weightModifier` as const)}
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 bg-white"
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    {...register(`attributes.${attributeIndex}.values.${index}.daysModifier` as const)}
                    className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 bg-white"
                  />
                </td>
                <td className="py-3 pl-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-slate-300 hover:text-red-500 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4">
        <button
          type="button"
          onClick={() => append({ valueId: '', label: '', priceModifier: 0, weightModifier: 0, daysModifier: 0 })}
          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-colors border border-teal-100"
        >
          <Plus size={16} /> Agregar Opción
        </button>
      </div>
    </div>
  );
}

export default function ProductBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const { register, control, handleSubmit, watch } = useForm<ProductFormValues>({
    defaultValues: {
      name: isNew ? '' : 'Tarjetas de Presentación Pro',
      slug: isNew ? '' : 'tarjetas-pro',
      description: isNew ? '' : 'Impresión offset de alta calidad.',
      categoryId: '1',
      basePrice: 85000,
      attributes: isNew ? [] : [
        {
          attributeId: 'papel',
          name: 'Tipo de Papel',
          values: [
            { valueId: 'v1', label: 'Propalcote 300g', priceModifier: 0, weightModifier: 5, daysModifier: 0 },
            { valueId: 'v2', label: 'Ecológico 250g', priceModifier: 15000, weightModifier: 4, daysModifier: 1 }
          ]
        },
        {
          attributeId: 'acabado',
          name: 'Acabado',
          values: [
            { valueId: 'a1', label: 'Laminado Mate', priceModifier: 0, weightModifier: 1, daysModifier: 0 },
            { valueId: 'a2', label: 'Laminado Brillante', priceModifier: 0, weightModifier: 1, daysModifier: 0 },
            { valueId: 'a3', label: 'Barniz UV Reserva', priceModifier: 30000, weightModifier: 2, daysModifier: 2 }
          ]
        }
      ],
      pricingRules: isNew ? [] : [
        { minQty: 1000, maxQty: 2999, discountPercentage: 0 },
        { minQty: 3000, maxQty: 4999, discountPercentage: 5 },
        { minQty: 5000, maxQty: 10000, discountPercentage: 10 },
      ]
    }
  });

  const { fields: attributeFields, append: appendAttribute, remove: removeAttribute } = useFieldArray({
    control,
    name: 'attributes'
  });

  const { fields: rulesFields, append: appendRule, remove: removeRule } = useFieldArray({
    control,
    name: 'pricingRules'
  });

  const onSubmit = (data: ProductFormValues) => {
    console.log('Guardando producto:', data);
    alert('Producto guardado exitosamente.');
    navigate('/admin/catalog');
  };

  const addAttributePrompt = () => {
    const name = window.prompt('Nombre del nuevo atributo (Ej. Tamaño, Material, Color):');
    if (name) {
      appendAttribute({
        attributeId: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: name,
        values: [{ valueId: '', label: '', priceModifier: 0, weightModifier: 0, daysModifier: 0 }]
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <Link to="/admin/catalog" className="p-3 bg-slate-50 text-slate-500 rounded-full hover:bg-slate-100 hover:text-teal-600 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isNew ? 'Crear Nuevo Producto' : 'Editar Producto'}
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Configura detalles, atributos y reglas de precio.</p>
          </div>
        </div>
        <button 
          type="submit" 
          className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 transition-transform active:scale-95"
        >
          <Save size={20} />
          Guardar Producto
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LADO IZQUIERDO: Info Básica */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-blue-50 text-blue-600 p-2 rounded-xl"><Tag size={20} /></div>
              <h2 className="text-lg font-bold text-slate-900">Info Básica</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre</label>
                <input 
                  {...register('name')} 
                  className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 p-3" 
                  placeholder="Ej. Tarjetas Pro"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">URL Amigable (Slug)</label>
                <input 
                  {...register('slug')} 
                  className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 p-3 bg-slate-50" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Categoría</label>
                <select {...register('categoryId')} className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 p-3">
                  <option value="1">Impresión Comercial</option>
                  <option value="2">Gran Formato</option>
                  <option value="3">Empaques</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Descripción</label>
                <textarea 
                  {...register('description')} 
                  rows={4} 
                  className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 p-3"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Precio Base (COP)</label>
                <input 
                  type="number"
                  {...register('basePrice')} 
                  className="w-full rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500 p-3 text-lg font-bold" 
                />
                <p className="text-xs text-slate-400 mt-2">Precio de partida antes de aplicar modificadores.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-purple-50 text-purple-600 p-2 rounded-xl"><ImageIcon size={20} /></div>
              <h2 className="text-lg font-bold text-slate-900">Imágenes</h2>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-600 transition-colors cursor-pointer">
               <ImageIcon size={32} className="mb-2" />
               <p className="text-sm font-bold">Subir Imagen</p>
               <p className="text-xs">PNG, JPG hasta 5MB</p>
            </div>
          </div>
          
        </div>

        {/* LADO DERECHO: Atributos y Reglas */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* MATRIZ DE ATRIBUTOS */}
          <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-50 text-orange-500 p-2 rounded-xl"><Layers size={24} /></div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Matriz de Atributos</h2>
                  <p className="text-sm font-medium text-slate-500">Configura opciones como papel, acabados o tamaño.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={addAttributePrompt}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
              >
                <Plus size={16} /> Nuevo Atributo
              </button>
            </div>

            <div className="space-y-6">
              {attributeFields.length === 0 ? (
                <div className="text-center p-12 border-2 border-dashed border-slate-100 rounded-3xl">
                  <p className="text-slate-500 mb-2 font-medium">Este producto no tiene atributos configurados.</p>
                  <p className="text-sm text-slate-400">Haz clic en "Nuevo Atributo" para comenzar.</p>
                </div>
              ) : (
                attributeFields.map((field, index) => (
                  <AttributeValuesTable 
                    key={field.id}
                    control={control}
                    register={register}
                    attributeIndex={index}
                    attributeName={field.name}
                    onRemove={() => removeAttribute(index)}
                  />
                ))
              )}
            </div>
          </div>

          {/* REGLAS DE PRECIO POR VOLUMEN */}
          <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-50 text-green-600 p-2 rounded-xl"><Percent size={24} /></div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Descuentos por Volumen</h2>
                  <p className="text-sm font-medium text-slate-500">Aplica reglas automáticas de descuento según la cantidad.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => appendRule({ minQty: 0, maxQty: 0, discountPercentage: 0 })}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <Plus size={16} /> Añadir Escala
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase rounded-tl-xl">Rango Mínimo</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Rango Máximo</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Descuento (%)</th>
                    <th className="py-3 px-4 w-16 rounded-tr-xl"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rulesFields.length === 0 ? (
                    <tr>
                       <td colSpan={4} className="text-center py-8 text-slate-400 font-medium">No hay descuentos configurados.</td>
                    </tr>
                  ) : rulesFields.map((field, index) => (
                    <tr key={field.id} className="group hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <input 
                          type="number" 
                          {...register(`pricingRules.${index}.minQty`)}
                          className="w-full rounded-xl border-slate-200 focus:border-teal-500 p-2.5" 
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input 
                          type="number" 
                          {...register(`pricingRules.${index}.maxQty`)}
                          className="w-full rounded-xl border-slate-200 focus:border-teal-500 p-2.5" 
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="relative">
                          <input 
                            type="number" 
                            {...register(`pricingRules.${index}.discountPercentage`)}
                            className="w-full rounded-xl border-slate-200 focus:border-teal-500 p-2.5 pr-8" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button 
                          type="button"
                          onClick={() => removeRule(index)}
                          className="text-slate-300 hover:text-red-500 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-4">
              Nota: El descuento se aplica al subtotal (precio base + modificadores) antes de IVA.
            </p>
          </div>

        </div>
      </div>
    </form>
  );
}
"""

with open('src/admin/catalog/ProductBuilderPage.tsx', 'w') as f:
    f.write(NEW_BUILDER)
