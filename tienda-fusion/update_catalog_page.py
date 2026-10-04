import os

with open('src/admin/catalog/CatalogPage.tsx', 'r') as f:
    content = f.read()

import re

NEW_CONTENT = """
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function CatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const fetchProducts = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/admin/catalog/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      const response = await fetch(`/api/admin/catalog/product/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Catálogo de Productos</h1>
          <p className="text-slate-500 font-medium mt-1">Administra tus productos, precios y matriz de atributos.</p>
        </div>
        <Link 
          to="/admin/catalog/new"
          className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-teal-500/20 font-bold"
        >
          <Plus size={20} /> Crear Producto
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar productos por nombre o ID..." 
              className="w-full pl-12 pr-4 py-3.5 rounded-full border-none bg-white shadow-sm ring-1 ring-slate-100 focus:ring-2 focus:ring-teal-500 transition-shadow outline-none text-slate-700 font-medium"
            />
         </div>
         <button className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white rounded-full shadow-sm ring-1 ring-slate-100 text-slate-600 hover:text-teal-600 font-bold hover:bg-slate-50 transition-colors">
            <Filter size={20} />
            Filtrar
         </button>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-8 text-center text-slate-500">Cargando productos...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Precio Base</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">No hay productos en el catálogo.</td>
                  </tr>
                ) : products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{product.name}</div>
                          <div className="text-xs font-medium text-slate-400">ID: #{product.id.toString().padStart(4, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500">
                      <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-600">{product.category}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      {formatCOP(product.basePrice)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-lg ${
                        product.status === 'Activo' 
                          ? 'bg-teal-50 text-teal-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link 
                          to={`/admin/catalog/${product.id}`}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                          title="Editar"
                        >
                          <Edit size={20} />
                        </Link>
                        <button onClick={() => deleteProduct(product.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Eliminar">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
"""

with open('src/admin/catalog/CatalogPage.tsx', 'w') as f:
    f.write(NEW_CONTENT)
