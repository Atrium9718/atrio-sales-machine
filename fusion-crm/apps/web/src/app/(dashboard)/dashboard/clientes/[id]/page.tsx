"use client";

import * as React from "react";
import { Download, Building2, Phone, Mail, MapPin, CheckCircle, Tag, Clock, Calendar, Users, FileText, ArrowRight, AlertCircle } from "lucide-react";

export default function ClientProfilePage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shrink-0">
        <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5 relative">
          <div className="absolute -bottom-8 left-6">
            <div className="w-16 h-16 bg-background rounded-xl border-2 border-border flex items-center justify-center shadow-sm">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>
        <div className="px-6 pt-10 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">Fusión Comunicación Gráfica S.A.S.</h1>
                <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-green-500/10 text-green-600 dark:text-green-400">Activo</span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-red-500/10 text-red-600 dark:text-red-400">Hot</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
                <span>NIT: 900.595.222-9</span>
                <span>CLI-00124</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium text-sm transition-colors">
                Editar
              </button>
              <button 
                onClick={() => alert("MOCK: Abre el modal de la agenda (AppointmentModal) pre-cargado con este cliente.")}
                className="px-4 py-2 rounded-md bg-muted text-foreground hover:bg-muted/80 font-medium text-sm transition-colors"
              >
                Agendar Cita
              </button>
              <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm transition-colors">
                Nueva Cotización
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación por pestañas (Estática para demo) */}
      <div className="border-b border-border">
        <nav className="flex space-x-6 px-4" aria-label="Tabs">
          {["Resumen", "Contactos", "Cotizaciones", "Oportunidades", "Proyectos", "Comunicaciones", "Archivos", "Notas"].map((tab, i) => (
            <button
              key={tab}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                i === 0 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de la pestaña (Resumen) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
        {/* Columna Izquierda: Detalles e Info Rápida */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Información de Contacto</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">ventas@fusiongrafica.co</div>
                  <div className="text-muted-foreground text-xs">Correo principal</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">+57 300 123 4567</div>
                  <div className="text-muted-foreground text-xs">Móvil</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Cra 43A # 1-50, Medellín</div>
                  <div className="text-muted-foreground text-xs">Antioquia, Colombia</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Clasificación</h3>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                <Tag className="w-3 h-3 text-muted-foreground" />
                Sector: <strong>Publicidad</strong>
              </div>
              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                <Users className="w-3 h-3 text-muted-foreground" />
                Origen: <strong>Referido</strong>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground">Responsable Comercial</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">CG</div>
                <span className="text-sm font-medium">Carlos Gómez</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha (2 col width): Métricas y Actividad */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Métricas Hero */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center text-center justify-center">
              <div className="text-2xl font-bold text-foreground">$ 45.2M</div>
              <div className="text-xs text-muted-foreground mt-1">Valor Ganado</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center text-center justify-center">
              <div className="text-2xl font-bold text-foreground">32</div>
              <div className="text-xs text-muted-foreground mt-1">Cotizaciones</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center text-center justify-center">
              <div className="text-2xl font-bold text-green-500">84%</div>
              <div className="text-xs text-muted-foreground mt-1">Tasa de Cierre</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center text-center justify-center">
              <div className="text-2xl font-bold text-foreground">12 días</div>
              <div className="text-xs text-muted-foreground mt-1">Desde últ. contacto</div>
            </div>
          </div>

          {/* Calidad de Datos (Alerta) */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-4 items-start">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-500">Problema de calidad de datos detectado</h4>
              <p className="text-sm text-amber-600/80 dark:text-amber-500/80 mt-1">
                El Dígito de Verificación (DV) del NIT no coincide. Esperado: 9, Actual: nulo.
              </p>
              <button className="text-sm font-medium text-amber-700 dark:text-amber-400 mt-2 underline hover:no-underline">
                Solucionar ahora
              </button>
            </div>
          </div>

          {/* Actividad Reciente */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Línea de Tiempo</h3>
            <div className="space-y-6 pl-4 border-l-2 border-muted relative">
              {[
                { type: "quote", title: "Cotización COT-0294 aprobada", date: "Hoy, 10:30 AM", icon: CheckCircle, color: "text-green-500" },
                { type: "email", title: "Correo enviado: Propuesta Comercial", date: "Ayer, 04:15 PM", icon: Mail, color: "text-blue-500" },
                { type: "meeting", title: "Cita presencial realizada", date: "15 de Ago, 2026", icon: Calendar, color: "text-primary" },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className={`absolute -left-[27px] w-5 h-5 rounded-full bg-background border-2 border-muted flex items-center justify-center`}>
                    <div className={`w-2 h-2 rounded-full ${item.color.replace('text-', 'bg-')}`} />
                  </div>
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> {item.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
