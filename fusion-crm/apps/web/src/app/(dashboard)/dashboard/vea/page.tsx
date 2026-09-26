"use client";

import * as React from "react";
import { Users, FileText, Target, Activity, MessageSquare, Check, ArrowRight, Plus, Calendar } from "lucide-react";

export default function VeaRitualPage() {
  const [sessionActive, setSessionActive] = React.useState(false);
  const [weeklyGoal, setWeeklyGoal] = React.useState('');
  const [strategicFocus, setStrategicFocus] = React.useState<string[]>([]);
  const [focusInput, setFocusInput] = React.useState('');
  const [commitments, setCommitments] = React.useState<Array<{ id: string; text: string; assignee: string; done: boolean }>>([]);
  const [newCommitmentText, setNewCommitmentText] = React.useState('');
  const [newCommitmentAssignee, setNewCommitmentAssignee] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);

  const toggleCommitment = (id: string) => {
    setCommitments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c))
    );
  };

  const addFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusInput.trim()) return;
    setStrategicFocus((prev) => [...prev, focusInput.trim()]);
    setFocusInput('');
  };

  const addCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitmentText.trim()) return;
    setCommitments((prev) => [
      ...prev,
      {
        id: `com-${Date.now()}`,
        text: newCommitmentText.trim(),
        assignee: newCommitmentAssignee.trim() || 'Sin asignar',
        done: false,
      },
    ]);
    setNewCommitmentText('');
    setNewCommitmentAssignee('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-8 text-primary-foreground shrink-0 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-3">
              Ritual Comercial
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Reunión V.E.A. (Visión • Evaluación • Agenda)</h1>
            <p className="text-primary-foreground/80 mt-1">
              Ritual semanal de alineación, seguimiento de métricas y compromisos del equipo comercial.
            </p>
          </div>
          <button
            onClick={() => setSessionActive(!sessionActive)}
            className="bg-white text-primary hover:bg-white/90 font-bold px-6 py-3 rounded-md shadow-sm transition-colors whitespace-nowrap"
          >
            {sessionActive ? 'Cerrar Sesión Semanal' : 'Iniciar Sesión V.E.A.'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-6">
        {/* Columna 1: Visión */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">1. Visión</h2>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 flex-1">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Objetivo de la Semana</h3>
              {weeklyGoal ? (
                <p className="text-sm font-medium text-foreground bg-muted/40 p-3 rounded-lg border border-border">
                  {weeklyGoal}
                </p>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Ej. Cumplir 100% de visitas técnicas y seguimiento de cotizaciones"
                    value={weeklyGoal}
                    onChange={(e) => setWeeklyGoal(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground">Define el propósito clave de la semana para el equipo.</p>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Foco Estratégico</h3>
              {strategicFocus.length > 0 ? (
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground mb-3">
                  {strategicFocus.map((f, i) => (
                    <li key={i} className="text-foreground">{f}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground mb-2">Sin focos estratégicos definidos.</p>
              )}
              <form onSubmit={addFocus} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Agregar foco..."
                  value={focusInput}
                  onChange={(e) => setFocusInput(e.target.value)}
                  className="text-xs flex-1 p-2 rounded-lg border border-border bg-background"
                />
                <button
                  type="submit"
                  className="px-2.5 py-2 bg-primary/10 text-primary font-bold text-xs rounded-lg hover:bg-primary/20"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Columna 2: Evaluación */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">2. Evaluación</h2>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 flex-1">
            <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg border border-border">
              <span className="text-xs font-medium">Ventas vs Meta</span>
              <span className="text-xs font-bold text-foreground">$0 (0%)</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg border border-border">
              <span className="text-xs font-medium">Tasa de Conversión</span>
              <span className="text-xs font-bold text-foreground">0%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg border border-border">
              <span className="text-xs font-medium">Oportunidades Nuevas</span>
              <span className="text-xs font-bold text-foreground">0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg border border-border">
              <span className="text-xs font-medium">Tareas Vencidas</span>
              <span className="text-xs font-bold text-foreground">0</span>
            </div>
            <p className="text-[11px] text-muted-foreground text-center pt-2">
              Métricas consolidadas del período inicial en curso.
            </p>
          </div>
        </div>

        {/* Columna 3: Agenda / Compromisos */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">3. Agenda y Compromisos</h2>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 flex-1 flex flex-col">
            <div className="flex-1 space-y-2">
              {commitments.length > 0 ? (
                commitments.map((com) => (
                  <div
                    key={com.id}
                    onClick={() => toggleCommitment(com.id)}
                    className="flex items-start gap-3 p-3 border border-border rounded-lg bg-card hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <div className="mt-0.5">
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          com.done
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {com.done && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${com.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {com.text}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Responsable: {com.assignee}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <Calendar className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs">Sin compromisos registrados para esta sesión.</p>
                </div>
              )}
            </div>
            
            {showAddModal ? (
              <form onSubmit={addCommitment} className="p-3 border border-border rounded-lg bg-muted/20 space-y-2">
                <input
                  type="text"
                  placeholder="Descripción del compromiso..."
                  value={newCommitmentText}
                  onChange={(e) => setNewCommitmentText(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-border bg-background"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Responsable (ej. Cristian, Diana)..."
                  value={newCommitmentAssignee}
                  onChange={(e) => setNewCommitmentAssignee(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-border bg-background"
                />
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded hover:bg-primary/90"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full py-2 border border-dashed border-border rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center gap-1.5 mt-4"
              >
                <Plus className="w-4 h-4" /> Nuevo Compromiso
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
