import React, { useState, useRef, useEffect } from 'react';
import { useFusionAuth, FusionEmployee } from '../../context/FusionAuthContext';
import { useEmployeesQuery } from '../../hooks/useDomainQueries';
import { Shield, ChevronDown, Check, Search, UserCheck, Eye, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function UserPersonaSwitcher() {
  const { currentUser, employees: authEmployees, isSuperAdmin, isImpersonating, impersonateUser, revertToSuperAdmin } = useFusionAuth();
  const { data: queryEmployees } = useEmployeesQuery({ includeInactive: false });
  const employees = queryEmployees || authEmployees;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const filteredEmployees = employees.filter(e => {
    const q = searchTerm.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.jobTitle.toLowerCase().includes(q) ||
      e.roleName.toLowerCase().includes(q) ||
      e.contractType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
          isImpersonating
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20'
            : 'bg-card border-border hover:bg-muted text-foreground'
        }`}
        title="Cambiar usuario o simular vista de empleado"
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
            currentUser.roleKey === 'super_admin'
              ? 'bg-primary text-primary-foreground'
              : currentUser.contractType === 'SUPERNUMERARIO'
              ? 'bg-amber-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          {currentUser.initials}
        </div>
        <div className="text-left hidden lg:block max-w-[140px] truncate">
          <div className="truncate font-semibold leading-tight">{currentUser.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{currentUser.jobTitle}</div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-primary" />
                Simulador de Accesos
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Comprueba qué ve y qué no ve cada empleado
              </p>
            </div>
            {isImpersonating && (
              <button
                onClick={() => {
                  revertToSuperAdmin();
                  setIsOpen(false);
                }}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Volver a Admin
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="p-2 border-b border-border bg-background">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar empleado o cargo..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          {/* List of employees */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredEmployees.map(emp => {
              const isSelected = emp.id === currentUser.id;
              const isSuper = emp.roleKey === 'super_admin';
              const isPermanentOwner =
                emp.id === 'emp-03' ||
                (emp.email && emp.email.includes('andresepulveda718')) ||
                (emp.name && emp.name.toLowerCase().includes('cristian andrés sepúlveda'));

              return (
                <button
                  key={emp.id}
                  onClick={() => {
                    impersonateUser(emp);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2 transition-colors text-xs ${
                    isPermanentOwner
                      ? isSelected
                        ? 'bg-amber-500/15 border border-amber-500/40 text-foreground font-semibold shadow-xs'
                        : 'bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-foreground'
                      : isSelected
                      ? 'bg-primary/10 border border-primary/20 text-primary font-medium'
                      : 'hover:bg-muted/80 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        isPermanentOwner
                          ? 'bg-amber-600 text-white ring-2 ring-amber-400/50'
                          : isSuper
                          ? 'bg-primary text-primary-foreground'
                          : emp.contractType === 'SUPERNUMERARIO'
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {emp.initials}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="truncate font-medium flex items-center gap-1.5">
                        <span>{emp.name}</span>
                        {isPermanentOwner && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                            Tú (Super Usuario)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{emp.jobTitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        isPermanentOwner
                          ? 'bg-amber-600 text-white font-extrabold'
                          : isSuper
                          ? 'bg-primary/20 text-primary'
                          : emp.contractType === 'SUPERNUMERARIO'
                          ? 'bg-amber-500/15 text-amber-600'
                          : 'bg-blue-500/15 text-blue-600'
                      }`}
                    >
                      {isPermanentOwner ? 'Super Admin' : isSuper ? 'Admin' : emp.contractType}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-muted/30 border-t border-border flex items-center justify-between text-xs">
            <span className="text-[11px] text-muted-foreground">
              Total: {employees.length} usuarios
            </span>
            <Link
              to="/dashboard/admin/usuarios"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              Gestionar Empleados y Permisos →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function ImpersonationBanner() {
  const { currentUser, isImpersonating, revertToSuperAdmin } = useFusionAuth();

  if (!isImpersonating || !currentUser) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs flex items-center justify-between gap-3 shadow-sm z-30 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="w-4 h-4 shrink-0 text-amber-200" />
        <span className="truncate">
          <strong>Modo Simulación Activo:</strong> Estás visualizando el sistema como{' '}
          <span className="underline font-bold">{currentUser.name}</span> ({currentUser.jobTitle} —{' '}
          <span className="uppercase font-semibold">{currentUser.contractType}</span>). El menú y los módulos reflejan exactamente lo que este usuario puede ver.
        </span>
      </div>
      <button
        onClick={revertToSuperAdmin}
        className="bg-white text-amber-900 hover:bg-amber-100 font-bold px-3 py-1 rounded-md text-xs shrink-0 transition-colors shadow-xs"
      >
        Volver a mi sesión de Super Usuario
      </button>
    </div>
  );
}
