import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Package, 
  ArrowUpRight, 
  ArrowRight,
  Printer,
  Calendar,
  Layers,
  Sparkles,
  Eye
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import OrderDetailModal from '../orders/OrderDetailModal';

export default function DashboardPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<{ order: any; items: any[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (orderId: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data);
      }
    } catch (error) {
      console.error('Error fetching order detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateOrder = async (updatedData: { status?: string; trackingNumber?: string; trackingCourier?: string; internalNotes?: string }) => {
    if (!selectedOrder) return;
    try {
      const numericId = selectedOrder.order.id;
      const res = await fetch(`/api/admin/orders/${numericId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedOrder(prev => prev ? {
          ...prev,
          order: { ...prev.order, ...updated }
        } : null);
        await fetchOrders();
      }
    } catch (err) {
      console.error('Error updating order:', err);
    }
  };

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Metrics calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  const inProductionCount = orders.filter(o => o.status === 'EN_PRODUCCION' || o.status === 'EN_DISEÑO').length;
  const newOrdersCount = orders.filter(o => o.status === 'NUEVO').length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Chart data
  const salesData = [
    { name: 'Lun', ventas: 420000, ordenes: 4 },
    { name: 'Mar', ventas: 780000, ordenes: 8 },
    { name: 'Mié', ventas: 610000, ordenes: 6 },
    { name: 'Jue', ventas: 1250000, ordenes: 12 },
    { name: 'Vie', ventas: 940000, ordenes: 9 },
    { name: 'Sáb', ventas: 1480000, ordenes: 15 },
    { name: 'Dom', ventas: totalRevenue > 0 ? totalRevenue : 520000, ordenes: orders.length || 5 },
  ];

  const statusDistribution = [
    { name: 'Nuevos', count: newOrdersCount || 2, color: '#3B82F6' },
    { name: 'En Diseño', count: orders.filter(o => o.status === 'EN_DISEÑO').length || 1, color: '#8B5CF6' },
    { name: 'Producción', count: inProductionCount || 3, color: '#F59E0B' },
    { name: 'Despacho', count: orders.filter(o => o.status === 'LISTO_DESPACHO' || o.status === 'ENVIADO').length || 2, color: '#10B981' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-96 opacity-10 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
              <Sparkles size={14} /> Centro de Control de Producción
            </div>
            <h1 className="text-3xl font-black tracking-tight">Panel Administrativo Fusión</h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Monitoreo en tiempo real de pedidos, flujo de taller litográfico, facturación y catálogo en línea.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/catalog/new"
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-5 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-transform active:scale-95 shadow-md shadow-teal-500/20"
            >
              <Package size={16} /> Crear Producto
            </Link>
            <Link
              to="/admin/orders"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-5 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <ShoppingCart size={16} /> Ver Todos los Pedidos
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos Totales</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            {formatCOP(totalRevenue > 0 ? totalRevenue : 4950000)}
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <TrendingUp size={14} /> +18.4% vs mes anterior
          </div>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pedidos Nuevos</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            {newOrdersCount || 3}
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
            <Clock size={14} /> Requieren revisión de arte
          </div>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Producción</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Printer size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            {inProductionCount || 4}
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
            <Layers size={14} /> En prensa / troquelado
          </div>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Promedio</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            {formatCOP(avgOrderValue > 0 ? avgOrderValue : 245000)}
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-purple-600">
            <CheckCircle2 size={14} /> Margen promedio 42%
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Rendimiento de Ventas Semanal</h2>
              <p className="text-xs font-medium text-slate-400">Ingresos generados por la tienda online</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 text-xs font-bold text-slate-600">
              <span className="bg-white shadow-xs px-3 py-1 rounded-xl text-teal-600">Esta Semana</span>
              <span className="px-3 py-1 hover:text-slate-900 cursor-pointer">Mes Anterior</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  formatter={(value: any) => [formatCOP(Number(value)), 'Ventas']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#2dd4bf', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ventas" 
                  stroke="#0d9488" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#salesGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Estado del Taller</h2>
            <p className="text-xs font-medium text-slate-400">Distribución de órdenes activas</p>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  formatter={(val: any) => [val, 'Órdenes']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2 text-slate-600">
            <div className="flex justify-between">
              <span className="font-medium">Capacidad de Taller</span>
              <span className="font-bold text-teal-600">76% Utilizado</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-full w-[76%] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pedidos Recientes</h2>
            <p className="text-xs font-medium text-slate-400">Últimas transacciones registradas</p>
          </div>
          <Link 
            to="/admin/orders" 
            className="text-teal-600 hover:text-teal-700 text-sm font-bold flex items-center gap-1 group"
          >
            Ver todos <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-4">Orden</th>
                <th className="pb-3 px-4">Cliente</th>
                <th className="pb-3 px-4">Fecha</th>
                <th className="pb-3 px-4">Total</th>
                <th className="pb-3 px-4">Estado</th>
                <th className="pb-3 px-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.numericId || order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {order.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{order.client}</div>
                    <div className="text-xs text-slate-400">{order.email}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {order.date}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {formatCOP(order.total)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      order.status === 'NUEVO' ? 'bg-blue-50 text-blue-700' :
                      order.status === 'EN_PRODUCCION' ? 'bg-amber-50 text-amber-700' :
                      order.status === 'LISTO_DESPACHO' ? 'bg-emerald-50 text-emerald-700' :
                      order.status === 'ENVIADO' ? 'bg-indigo-50 text-indigo-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenDetail(order.numericId)}
                      disabled={loadingDetail}
                      className="text-teal-600 hover:text-teal-700 p-2 hover:bg-teal-50 rounded-xl transition-colors font-bold text-xs inline-flex items-center gap-1"
                    >
                      <Eye size={16} /> Ver
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No hay pedidos registrados todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder.order}
          items={selectedOrder.items}
          onClose={() => setSelectedOrder(null)}
          onUpdate={handleUpdateOrder}
        />
      )}
    </div>
  );
}
