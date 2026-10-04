import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Download,
  FileText,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Filter,
  Search,
  Wallet
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

export default function FinanceAdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'b2b_receivables' | 'gateways'>('overview');
  
  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const revenueData = [
    { name: 'Ene', ingresos: 12500000, egresos: 4200000 },
    { name: 'Feb', ingresos: 14800000, egresos: 5100000 },
    { name: 'Mar', ingresos: 18200000, egresos: 6800000 },
    { name: 'Abr', ingresos: 16500000, egresos: 5400000 },
    { name: 'May', ingresos: 21000000, egresos: 7100000 },
    { name: 'Jun', ingresos: 25400000, egresos: 8500000 },
  ];

  const gatewayDistribution = [
    { name: 'Wompi', value: 45, color: '#4f46e5' },
    { name: 'Bold', value: 25, color: '#ef4444' },
    { name: 'Transferencia', value: 20, color: '#10b981' },
    { name: 'Efectivo', value: 10, color: '#f59e0b' },
  ];

  const recentTransactions = [
    { id: 'TRX-1092', date: '2026-08-23 14:30', client: 'Editorial Andina', amount: 1250000, status: 'completed', method: 'Bancolombia' },
    { id: 'TRX-1093', date: '2026-08-23 15:45', client: 'María Fernanda Restrepo', amount: 145000, status: 'completed', method: 'Wompi' },
    { id: 'TRX-1094', date: '2026-08-23 16:10', client: 'Agencia Creativa S.A.S', amount: 850000, status: 'pending', method: 'Bold' },
    { id: 'TRX-1095', date: '2026-08-23 17:05', client: 'Carlos Gómez', amount: 65000, status: 'completed', method: 'Wompi' },
  ];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Finanzas & Facturación</h2>
              <p className="text-xs text-slate-500">Gestión de ingresos, pasarelas de pago, facturación electrónica y cuentas B2B</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
            <Download size={14} /> Exportar Reporte
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-colors">
            <FileText size={14} /> Nueva Factura
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={12} /> +12.5%
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ingresos (Mes)</p>
          <h3 className="text-2xl font-black text-slate-900">{formatCOP(25400000)}</h3>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown size={20} />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
              <TrendingUp size={12} /> +2.1%
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gastos Operativos</p>
          <h3 className="text-2xl font-black text-slate-900">{formatCOP(8500000)}</h3>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cuentas por Cobrar (B2B)</p>
          <h3 className="text-2xl font-black text-slate-900">{formatCOP(12350000)}</h3>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo en Pasarelas</p>
          <h3 className="text-2xl font-black text-slate-900">{formatCOP(4850000)}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors whitespace-nowrap ${
            activeTab === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Resumen Financiero
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors whitespace-nowrap ${
            activeTab === 'invoices' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Facturación Electrónica DIAN
        </button>
        <button
          onClick={() => setActiveTab('b2b_receivables')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors whitespace-nowrap ${
            activeTab === 'b2b_receivables' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Cartera B2B
        </button>
        <button
          onClick={() => setActiveTab('gateways')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors whitespace-nowrap ${
            activeTab === 'gateways' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          Pasarelas de Pago
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-6">Flujo de Caja (Últimos 6 Meses)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val/1000000).toFixed(0)}M`} />
                  <Tooltip 
                    formatter={(value: any) => formatCOP(value)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="ingresos" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" name="Ingresos" />
                  <Area type="monotone" dataKey="egresos" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorEgresos)" name="Egresos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-6">Distribución de Pagos</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gatewayDistribution} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: any) => `${value}%`} cursor={{fill: '#f8fafc'}}/>
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                      {gatewayDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden border border-slate-700">
              <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500 rounded-full blur-[64px] opacity-20"></div>
              <h3 className="text-sm font-bold text-slate-300 mb-2">Liquidez Disponible</h3>
              <div className="text-3xl font-black text-white mb-4">{formatCOP(16900000)}</div>
              <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors">
                Solicitar Desembolso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transacciones Recientes */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Transacciones Recientes</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar transacción..." className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-500" />
            </div>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 border border-slate-200 rounded-lg">
              <Filter size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Método</th>
                <th className="px-5 py-3">Monto</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentTransactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 font-bold text-slate-700">{trx.id}</td>
                  <td className="px-5 py-3.5 text-slate-500">{trx.date}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{trx.client}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                      {trx.method}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-black text-slate-900">{formatCOP(trx.amount)}</td>
                  <td className="px-5 py-3.5">
                    {trx.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 size={12} /> Completado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                        <Clock size={12} /> Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="text-teal-600 hover:text-teal-700 font-bold text-xs inline-flex items-center gap-1">
                      Ver <ArrowUpRight size={14} />
                    </button>
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
