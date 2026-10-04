import os

NEW_CONTENT = """
import { useState, useEffect } from 'react';
import { Eye, Search, Package, Download, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NUEVO': return 'bg-blue-100 text-blue-700';
      case 'EN_PRODUCCION': return 'bg-amber-100 text-amber-700';
      case 'ENVIADO': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando pedidos...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bandeja de Pedidos</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Gestiona las órdenes de compra y descarga los archivos de impresión</p>
        </div>
        <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95">
          <Download size={18} /> Exportar Reporte
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
           <div className="relative w-full sm:w-96">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Buscar por ID de orden o cliente..."
               className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
             />
           </div>
           <div className="flex items-center gap-3 w-full sm:w-auto">
             <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-teal-600 transition-colors">
               <Filter size={18} />
             </button>
             <select className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
               <option value="">Todos los Estados</option>
               <option value="NUEVO">Nuevos</option>
               <option value="EN_PRODUCCION">En Producción</option>
               <option value="ENVIADO">Enviados</option>
             </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Orden</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.length === 0 ? (
                <tr>
                   <td colSpan={6} className="py-12 text-center text-slate-500">No hay pedidos registrados.</td>
                </tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <Package size={20} />
                      </div>
                      <span className="font-bold text-slate-900">{order.id}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-700">
                    {order.client}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500 font-medium">
                    {order.date}
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-900">
                    ${order.total.toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <select 
                      value={order.status} 
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border-0 cursor-pointer focus:ring-0 ${getStatusColor(order.status)}`}
                    >
                      <option value="NUEVO">NUEVO</option>
                      <option value="EN_PRODUCCION">EN PRODUCCIÓN</option>
                      <option value="ENVIADO">ENVIADO</option>
                    </select>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-slate-400 hover:text-teal-500 p-2 rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-2 text-sm font-bold border border-transparent hover:border-teal-100" title="Ver Detalles">
                        <Eye size={18} /> <span className="hidden sm:inline">Ver</span>
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

with open('src/admin/orders/OrdersPage.tsx', 'w') as f:
    f.write(NEW_CONTENT)
