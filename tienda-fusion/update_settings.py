import os

NEW_CONTENT = """
import { useState } from 'react';
import { Save, Store, Truck, CreditCard, Users, Bell, Shield, Mail } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General', icon: Store },
    { id: 'shipping', name: 'Envíos', icon: Truck },
    { id: 'payments', name: 'Pagos API', icon: CreditCard },
    { id: 'users', name: 'Usuarios y Roles', icon: Users },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Configuración</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Administra los ajustes globales de la plataforma</p>
        </div>
        <button className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95">
          <Save size={18} /> Guardar Cambios
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-teal-600 shadow-sm border border-slate-100'
                  : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm border border-transparent'
              }`}
            >
              <tab.icon size={20} className={activeTab === tab.id ? 'text-teal-500' : 'text-slate-400'} />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[32px] shadow-sm border border-slate-100 p-6 md:p-8">
          
          {activeTab === 'general' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Información de la Tienda</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de la Empresa</label>
                    <input type="text" defaultValue="Fusión Comunicación Gráfica" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">NIT / Documento</label>
                    <input type="text" defaultValue="900.123.456-7" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Dirección Principal</label>
                    <input type="text" defaultValue="Manizales, Caldas, Colombia" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Configuración Regional</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Moneda por Defecto</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                      <option value="COP">Peso Colombiano (COP)</option>
                      <option value="USD">Dólar (USD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Impuesto por Defecto (IVA)</label>
                    <div className="relative">
                      <input type="number" defaultValue="19" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Reglas de Envío</h2>
              
              <div className="p-6 rounded-2xl border border-teal-100 bg-teal-50/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-teal-800">Tarifa Plana Urbana</h3>
                  <div className="w-12 h-6 bg-teal-500 rounded-full flex items-center p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full translate-x-6"></div>
                  </div>
                </div>
                <p className="text-sm text-teal-600 mb-4">Aplica para Manizales, Villamaría y Chinchiná.</p>
                <div className="max-w-xs">
                  <label className="block text-xs font-bold text-teal-800 mb-1">Costo Fijo (COP)</label>
                  <input type="number" defaultValue="10000" className="w-full bg-white border border-teal-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold" />
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800">Envíos Nacionales (Calculado por peso)</h3>
                  <div className="w-12 h-6 bg-slate-300 rounded-full flex items-center p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                <p className="text-sm text-slate-500">Calcula automáticamente usando el peso de los productos.</p>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Integración de Pagos</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-teal-200 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">W</div>
                      <h3 className="font-bold text-slate-800">Wompi API</h3>
                    </div>
                    <div className="w-12 h-6 bg-teal-500 rounded-full flex items-center p-1 cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full translate-x-6"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Llave Pública (Public Key)</label>
                      <input type="text" placeholder="pub_test_..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Llave Privada (Prv Key)</label>
                      <input type="password" placeholder="prv_test_..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-teal-200 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold">B</div>
                      <h3 className="font-bold text-slate-800">Bold API</h3>
                    </div>
                    <div className="w-12 h-6 bg-slate-200 rounded-full flex items-center p-1 cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-4 opacity-50 pointer-events-none">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">API Key</label>
                      <input type="text" placeholder="bold_..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Secret</label>
                      <input type="password" placeholder="***" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-lg font-bold text-slate-900">Usuarios y Roles</h2>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Invitar Usuario</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase rounded-l-xl">Usuario</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Rol</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Último Acceso</th>
                      <th className="py-3 px-4 text-right rounded-r-xl"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center font-bold">A</div>
                          <span className="font-bold text-slate-900">andresepulveda718@gmail.com</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs font-bold">ADMINISTRADOR</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">Hace 5 minutos</td>
                      <td className="py-3 px-4 text-right text-slate-400"><Shield size={16} className="inline" /></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold">D</div>
                          <span className="font-bold text-slate-900">diseno@fusion.com</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold">DISEÑADOR</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">Ayer</td>
                      <td className="py-3 px-4 text-right"><button className="text-teal-600 font-bold text-sm">Editar</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Notificaciones Automáticas</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Mail size={20} /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Nuevo Pedido Recibido</h4>
                      <p className="text-sm text-slate-500">Enviar correo al cliente confirmando su orden.</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-teal-500 rounded-full flex items-center p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full translate-x-6"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-50 text-orange-500 rounded-xl"><Mail size={20} /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Pedido en Producción</h4>
                      <p className="text-sm text-slate-500">Avisar al cliente cuando el pedido pase a producción.</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-teal-500 rounded-full flex items-center p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full translate-x-6"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl"><Mail size={20} /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">Pedido Enviado</h4>
                      <p className="text-sm text-slate-500">Notificar al cliente el envío con número de guía.</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-slate-200 rounded-full flex items-center p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
"""

with open('src/admin/settings/SettingsPage.tsx', 'w') as f:
    f.write(NEW_CONTENT)
