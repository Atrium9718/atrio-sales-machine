import React, { useState } from 'react';
import { Download, BarChart2, Calendar as CalendarIcon, Clock, Percent, Filter, Users } from 'lucide-react';

export function AgendaReportsTab() {
  const [period, setPeriod] = useState('MONTH');
  const [comercial, setComercial] = useState('ALL');

  const handleExport = () => {
    alert("Mock: Exportando reporte a Excel respetando los filtros activos...");
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Rendimiento de Agenda
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Métricas de cumplimiento y actividad por comercial</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer">
              <option value="WEEK">Esta Semana</option>
              <option value="MONTH">Este Mes</option>
              <option value="QUARTER">Este Trimestre</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <select value={comercial} onChange={e => setComercial(e.target.value)} className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer">
              <option value="ALL">Todo el equipo</option>
              <option value="u1">Andrés (Tú)</option>
              <option value="u2">Ana Gómez</option>
              <option value="u3">Carlos Ruiz</option>
            </select>
          </div>

          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-muted/80 transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Cards */}
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-2">
            <CalendarIcon className="w-4 h-4" /> Agendadas
          </div>
          <div className="text-3xl font-black text-foreground">145</div>
          <div className="text-xs text-muted-foreground mt-2">+12% vs {period === 'WEEK' ? 'semana' : period === 'MONTH' ? 'mes' : 'trimestre'} anterior</div>
        </div>
        
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-2">
            <CheckCircleIcon className="w-4 h-4" /> Realizadas
          </div>
          <div className="text-3xl font-black text-success">118</div>
          <div className="text-xs text-muted-foreground mt-2">12 canceladas / 15 no asistió</div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4" /> Cumplimiento
          </div>
          <div className="text-3xl font-black text-primary">81%</div>
          <div className="text-xs text-muted-foreground mt-2">Tasa de realizadas / agendadas</div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" /> Tiempo de espera
          </div>
          <div className="text-3xl font-black text-foreground">3.2<span className="text-lg font-bold text-muted-foreground ml-1">días</span></div>
          <div className="text-xs text-muted-foreground mt-2">Promedio entre agendar y realizar</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Type Distribution */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <h3 className="font-bold text-foreground mb-4">Distribución por Tipo</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold">Visitas Presenciales</span>
                <span className="text-muted-foreground">45%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold">Llamadas</span>
                <span className="text-muted-foreground">30%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold">Demos Virtuales</span>
                <span className="text-muted-foreground">15%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold">Reuniones Internas</span>
                <span className="text-muted-foreground">10%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Mock */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm lg:col-span-2">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-foreground">Mapa de Calor (Horarios más usados)</h3>
              <p className="text-xs text-muted-foreground mt-1">Útil para sugerir disponibilidad y huecos comunes</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold hidden sm:flex">
              <span>Menos</span>
              <div className="w-3 h-3 bg-primary/10 rounded-sm border border-border/50"></div>
              <div className="w-3 h-3 bg-primary/40 rounded-sm border border-border/50"></div>
              <div className="w-3 h-3 bg-primary/70 rounded-sm border border-border/50"></div>
              <div className="w-3 h-3 bg-primary rounded-sm border border-border/50"></div>
              <span>Más</span>
            </div>
          </div>
          
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[500px]">
              <div className="grid grid-cols-6 gap-1 mb-1">
                <div className="text-xs font-bold text-muted-foreground text-right pr-2">Hora</div>
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map(d => (
                  <div key={d} className="text-xs font-bold text-center text-muted-foreground">{d}</div>
                ))}
              </div>
              {[8, 9, 10, 11, 14, 15, 16, 17].map(h => (
                <div key={h} className="grid grid-cols-6 gap-1 mb-1 items-center">
                  <div className="text-[10px] font-bold text-muted-foreground text-right pr-2">{h}:00</div>
                  {[...Array(5)].map((_, i) => {
                    const intensity = [5, 30, 60, 90][Math.floor(Math.random() * 4)];
                    return (
                      <div 
                        key={i} 
                        className="h-8 rounded-md border border-border/20 transition-all hover:scale-[1.02] cursor-pointer"
                        style={{ backgroundColor: `hsl(var(--primary) / ${intensity}%)` }}
                        title={`Horario con ${intensity}% de ocupación histórica`}
                      ></div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
