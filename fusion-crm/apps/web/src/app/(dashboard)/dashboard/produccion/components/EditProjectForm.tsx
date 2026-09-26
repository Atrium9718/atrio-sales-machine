import * as React from 'react';
import { X } from 'lucide-react';
import { useFusionAuth } from '../../../../../../../../src/context/FusionAuthContext';

/** Roles de producción que se pueden asignar a un proyecto. */
export const PROJECT_ROLES: { key: string; label: string }[] = [
  { key: 'COMERCIAL', label: 'Comercial' },
  { key: 'REVISION', label: 'Revisión' },
  { key: 'PRODUCCION', label: 'Producción' },
  { key: 'IMPRESION', label: 'Impresión' },
  { key: 'ACABADOS', label: 'Acabados' },
  { key: 'MONTAJE', label: 'Montaje' },
];

const COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'];

export interface ProjectAssignmentValue {
  role: string;
  user: { id: string; initial: string; color: string; name: string };
}

export interface EditableProjectFields {
  name: string;
  description: string;
  productType: string;
  priority: string;
  dueDate: string | null;
  remission: string;
  quoteTotal: number;
  adjustedTotalCost: number | null;
  assignments: ProjectAssignmentValue[];
}

interface Props {
  project: any;
  onCancel: () => void;
  onSave: (fields: EditableProjectFields) => void;
}

const inputClass = 'w-full px-3 py-2 border border-input rounded-md text-sm bg-background';

export function EditProjectForm({ project, onCancel, onSave }: Props) {
  const { employees } = useFusionAuth();
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVO');
  const [assignments, setAssignments] = React.useState<ProjectAssignmentValue[]>(project.assignments || []);

  const addAssignment = (role: string, employeeId: string) => {
    const emp = activeEmployees.find((e) => e.id === employeeId);
    if (!emp || assignments.some((a) => a.role === role && a.user.id === emp.id)) return;
    const color = COLORS[Math.abs([...emp.id].reduce((h, c) => h + c.charCodeAt(0), 0)) % COLORS.length];
    setAssignments([...assignments, { role, user: { id: emp.id, name: emp.name, initial: emp.initials, color } }]);
  };

  const removeAssignment = (role: string, userId: string) =>
    setAssignments(assignments.filter((a) => !(a.role === role && a.user.id === userId)));

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const due = String(fd.get('dueDate') || '');
    const adjusted = String(fd.get('adjustedTotalCost') || '');
    onSave({
      name: String(fd.get('name') || '').trim() || project.name,
      description: String(fd.get('description') || ''),
      productType: String(fd.get('productType') || project.productType),
      priority: String(fd.get('priority') || project.priority),
      dueDate: due ? new Date(`${due}T12:00:00`).toISOString() : null,
      remission: String(fd.get('remission') || ''),
      quoteTotal: Number(fd.get('quoteTotal')) || 0,
      adjustedTotalCost: adjusted ? Number(adjusted) : null,
      assignments,
    });
  };

  return (
    <form onSubmit={submit} className="p-6 space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-bold border-b border-border pb-1">Datos Generales</h3>
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground">Nombre del Proyecto</label>
          <input name="name" type="text" defaultValue={project.name} required className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground">Descripción</label>
          <textarea name="description" defaultValue={project.description || ''} rows={2} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">Tipo de Producto</label>
            <select name="productType" defaultValue={project.productType} className={inputClass}>
              <option value="Gran Formato">Gran Formato</option>
              <option value="Impresión Digital">Impresión Digital</option>
              <option value="Offset">Offset</option>
              <option value="Corte Láser">Corte Láser</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">Prioridad</label>
            <select name="priority" defaultValue={project.priority} className={inputClass}>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold border-b border-border pb-1 text-primary">Responsables por Rol</h3>
        <div className="space-y-3">
          {PROJECT_ROLES.map((role) => {
            const assigned = assignments.filter((a) => a.role === role.key);
            return (
              <div key={role.key} className="flex items-start gap-3">
                <div className="w-24 shrink-0 pt-2">
                  <label className="text-xs font-bold text-foreground">{role.label}</label>
                </div>
                <div className="flex-1 space-y-1.5">
                  <select
                    value=""
                    onChange={(e) => addAssignment(role.key, e.target.value)}
                    className="w-full px-3 py-1.5 border border-input rounded-md text-sm bg-background text-muted-foreground"
                    aria-label={`Añadir persona al rol ${role.label}`}
                  >
                    <option value="">+ Añadir persona...</option>
                    {activeEmployees
                      .filter((emp) => !assigned.some((a) => a.user.id === emp.id))
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} — {emp.jobTitle}
                        </option>
                      ))}
                  </select>
                  {assigned.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {assigned.map((a) => (
                        <span
                          key={a.user.id}
                          className="flex items-center gap-1 text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full"
                        >
                          {a.user.name}
                          <button
                            type="button"
                            onClick={() => removeAssignment(role.key, a.user.id)}
                            className="hover:text-red-500"
                            aria-label={`Quitar a ${a.user.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold border-b border-border pb-1">Campos Adicionales</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">Fecha Límite</label>
            <input name="dueDate" type="date" defaultValue={project.dueDate ? String(project.dueDate).split('T')[0] : ''} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">Remisión Manual</label>
            <input name="remission" type="text" defaultValue={project.remission || ''} placeholder="REM-..." className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">Presupuesto (COP)</label>
            <input name="quoteTotal" type="number" min={0} defaultValue={project.quoteTotal} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">Costo Total Ajustado</label>
            <input name="adjustedTotalCost" type="number" min={0} defaultValue={project.adjustedTotalCost ?? ''} placeholder="Opcional" className={inputClass} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-background border border-border text-foreground font-bold rounded-md hover:bg-muted text-sm">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary/90 text-sm">
          Guardar Cambios
        </button>
      </div>
    </form>
  );
}
