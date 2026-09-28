import React, { useState } from 'react';
import { AssistTemplateItem, AssistFormState } from './types';
import { Bookmark, Plus, Check, Trash2, X, FolderOpen } from 'lucide-react';

interface AssistTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: AssistTemplateItem[];
  onSelectTemplate: (template: AssistTemplateItem) => void;
  onSaveCurrentAsTemplate: (name: string) => Promise<void>;
  currentForm: AssistFormState;
}

export const AssistTemplateModal: React.FC<AssistTemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSelectTemplate,
  onSaveCurrentAsTemplate,
  currentForm,
}) => {
  const [activeTab, setActiveTab] = useState<'load' | 'save'>('load');
  const [newTemplateName, setNewTemplateName] = useState(
    currentForm.jobName ? `Plantilla: ${currentForm.jobName}` : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    setIsSaving(true);
    try {
      await onSaveCurrentAsTemplate(newTemplateName.trim());
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setActiveTab('load');
      }, 1000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">Plantillas de Cálculo</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('load')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'load'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cargar Plantilla ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('save')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'save'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Guardar Configuración Actual
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[360px] overflow-y-auto">
          {activeTab === 'load' ? (
            <div className="space-y-2">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No hay plantillas guardadas aún.
                </div>
              ) : (
                templates.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-border bg-background/80 hover:border-primary/50 transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {t.name}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                          {t.technique}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {t.input.artWidthCm}×{t.input.artHeightCm} cm · {t.input.paperName || 'Digital'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTemplate(t);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-colors shrink-0 flex items-center gap-1"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Cargar</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Nombre de la Plantilla
                </label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Ej: Cuadernos cosidos 1/4 pliego, Volantes 4x4..."
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Se guardarán las dimensiones ({currentForm.artWidthCm}×{currentForm.artHeightCm} cm), sustrato, corte y parámetros comerciales actuales.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('load')}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newTemplateName.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-xs hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>¡Guardada!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{isSaving ? 'Guardando...' : 'Guardar Plantilla'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
