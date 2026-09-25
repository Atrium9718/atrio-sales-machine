'use client';
import { useState } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, CheckCircle2, TrendingUp, Search, Play, Pause } from 'lucide-react';

export default function VoiceDashboard() {
  const [calls] = useState([
    { id: '1', dir: 'INBOUND', from: '+57 300 1234567', to: 'Soporte Ventas', status: 'COMPLETED', duration: 345, agent: 'Ana', sentiment: 'POSITIVE', disposition: 'COTIZACION', date: 'Hace 10 min' },
    { id: '2', dir: 'OUTBOUND', from: 'Línea Principal', to: '+57 320 9876543', status: 'VOICEMAIL', duration: 15, agent: 'Carlos', sentiment: 'NEUTRAL', disposition: 'SEGUIMIENTO', date: 'Hace 1 hora' },
    { id: '3', dir: 'INBOUND', from: '+57 311 5554433', to: 'Soporte Ventas', status: 'MISSED', duration: 0, agent: 'N/A', sentiment: null, disposition: null, date: 'Hace 2 horas' }
  ]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl flex items-center gap-2"><Phone className="text-primary"/> Panel de Voz</h1>
          <p className="text-muted-foreground">Métricas, grabaciones y transcripciones de llamadas telefónicas.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 shrink-0">
        <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
          <div className="text-muted-foreground text-sm font-bold uppercase">Llamadas Hoy</div>
          <div className="text-3xl font-bold mt-2">142</div>
          <div className="text-xs text-success flex items-center gap-1 mt-1"><TrendingUp className="w-3 h-3"/> +12% vs ayer</div>
        </div>
        <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
          <div className="text-muted-foreground text-sm font-bold uppercase">Duración Media</div>
          <div className="text-3xl font-bold mt-2">04:12</div>
          <div className="text-xs text-muted-foreground mt-1">Minutos por llamada</div>
        </div>
        <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
          <div className="text-muted-foreground text-sm font-bold uppercase">Tasa de Contestación</div>
          <div className="text-3xl font-bold mt-2 text-primary">85%</div>
        </div>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl shadow-sm">
          <div className="text-destructive font-bold text-sm uppercase">Perdidas sin Devolver</div>
          <div className="text-3xl font-bold mt-2 text-destructive">4</div>
          <div className="text-xs text-destructive mt-1 font-medium underline cursor-pointer">Ver tareas pendientes</div>
        </div>
      </div>

      <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex gap-4 items-center bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input type="text" placeholder="Buscar en transcripciones..." className="w-full bg-background border border-border rounded-md pl-9 pr-4 h-9 text-sm focus:border-primary outline-none" />
          </div>
          <select className="border border-border rounded-md px-3 h-9 text-sm bg-background focus:border-primary outline-none">
            <option>Todos los agentes</option>
            <option>Ana</option>
            <option>Carlos</option>
          </select>
          <select className="border border-border rounded-md px-3 h-9 text-sm bg-background focus:border-primary outline-none">
            <option>Cualquier Sentimiento</option>
            <option>Positivo</option>
            <option>Negativo</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Agente</th>
                <th className="px-4 py-3">Duración</th>
                <th className="px-4 py-3">Disposición</th>
                <th className="px-4 py-3">IA Analysis</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    {c.dir === 'INBOUND' ? <PhoneIncoming className="w-4 h-4 text-primary" /> : <PhoneOutgoing className="w-4 h-4 text-muted-foreground" />}
                    <div className="text-[10px] text-muted-foreground mt-1">{c.date}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{c.dir === 'INBOUND' ? c.from : c.to}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.agent}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.status === 'MISSED' ? <span className="text-destructive font-bold text-xs">Perdida</span> : `${Math.floor(c.duration/60)}:${(c.duration%60).toString().padStart(2,'0')}`}
                  </td>
                  <td className="px-4 py-3">
                    {c.disposition ? <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">{c.disposition}</span> : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {c.sentiment === 'POSITIVE' && <span className="text-success text-xs font-bold bg-success/10 px-2 py-1 rounded-full">😊 Positivo</span>}
                    {c.sentiment === 'NEUTRAL' && <span className="text-muted-foreground text-xs font-bold bg-muted px-2 py-1 rounded-full">😐 Neutral</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === 'COMPLETED' && (
                       <button className="text-primary hover:bg-primary/10 px-3 py-1.5 rounded-md text-xs flex items-center gap-1 ml-auto font-medium transition-colors"><Play className="w-3 h-3"/> Escuchar / Leer</button>
                    )}
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
