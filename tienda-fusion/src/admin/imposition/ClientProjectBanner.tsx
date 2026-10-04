import React, { useState } from 'react';
import { 
  Package, 
  User, 
  FileText, 
  Download, 
  Eye, 
  RefreshCw, 
  X, 
  CheckCircle, 
  Layers, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Scissors,
  FileCheck
} from 'lucide-react';
import { ConnectedClientProject, ClientProjectItem } from './types';

interface ClientProjectBannerProps {
  project: ConnectedClientProject;
  activeItem: ClientProjectItem;
  onSwitchItem: (index: number) => void;
  onSwitchSide: (side: 'tiro' | 'retiro') => void;
  onChangeProject: () => void;
  onDisconnectProject: () => void;
}

export default function ClientProjectBanner({
  project,
  activeItem,
  onSwitchItem,
  onSwitchSide,
  onChangeProject,
  onDisconnectProject,
}: ClientProjectBannerProps) {
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'specs' | 'files'>('info');

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950 text-white rounded-[28px] border border-teal-500/40 shadow-xl overflow-hidden">
        
        {/* Top bar with ID, Status and Actions */}
        <div className="bg-slate-950/80 px-6 py-3.5 border-b border-teal-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
              <Package size={16} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-teal-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                Proyecto de Cliente Conectado
              </span>
              <span className="text-xs font-mono font-black text-teal-200">
                {project.id}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {project.orderStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onChangeProject}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              <span>Cambiar Proyecto / Orden</span>
            </button>
            <button
              onClick={onDisconnectProject}
              className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition-all"
              title="Desconectar proyecto"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Main Content Info Grid */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left: Client and Active Product Overview (5 cols) */}
          <div className="lg:col-span-5 space-y-3 border-b lg:border-b-0 lg:border-r border-slate-800 pb-4 lg:pb-0 lg:pr-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 block">
                Cliente & Datos de Producción
              </span>
              <h3 className="text-lg font-black text-white mt-0.5 flex items-center gap-2">
                <span>{project.clientName}</span>
                {project.clientNit && (
                  <span className="text-xs text-slate-400 font-normal">({project.clientNit})</span>
                )}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 truncate">
                <Phone size={13} className="text-teal-400 shrink-0" />
                <span className="truncate">{project.clientPhone || 'Sin teléfono'}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <MapPin size={13} className="text-teal-400 shrink-0" />
                <span className="truncate">{project.clientCity || 'Colombia'}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Mail size={13} className="text-teal-400 shrink-0" />
                <span className="truncate">{project.clientEmail}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <FileText size={13} className="text-teal-400 shrink-0" />
                <span className="truncate">Fecha: {project.orderDate}</span>
              </div>
            </div>

            {/* If order has multiple products, provide product selector */}
            {project.items.length > 1 && (
              <div className="pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Productos de la orden ({project.items.length}):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {project.items.map((it, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSwitchItem(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        project.selectedItemIndex === idx
                          ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>{it.productName}</span>
                      <span className="text-[9px] opacity-75">({it.quantity} und)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center: Specs of Selected Item (4 cols) */}
          <div className="lg:col-span-4 space-y-2 border-b lg:border-b-0 lg:border-r border-slate-800 pb-4 lg:pb-0 lg:pr-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">
                Especificaciones Técnicas
              </span>
              <span className="text-xs font-black bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                Tiraje: {activeItem.quantity.toLocaleString()} unds
              </span>
            </div>

            <h4 className="text-sm font-black text-white">
              {activeItem.productName}
            </h4>

            <div className="space-y-1 text-xs text-slate-300">
              <p className="flex items-center justify-between">
                <span className="text-slate-400">Sustrato / Papel:</span>
                <strong className="text-teal-200">{activeItem.paperType || 'Propalcote 300g'}</strong>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-400">Acabados:</span>
                <strong className="text-slate-200">{activeItem.finishes?.join(', ') || 'Plastificado Mate'}</strong>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-400">Tintas & Prensa:</span>
                <strong className="text-slate-200">{activeItem.inks || '4x4 Tintas (Full Color)'}</strong>
              </p>
            </div>

            {/* Switch between Tiro and Retiro */}
            <div className="pt-2 flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Cara Impresión:</span>
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => onSwitchSide('tiro')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
                    project.activeSide === 'tiro'
                      ? 'bg-teal-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tiro (Frente)
                </button>
                <button
                  onClick={() => onSwitchSide('retiro')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
                    project.activeSide === 'retiro'
                      ? 'bg-teal-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Retiro (Reverso)
                </button>
              </div>
            </div>
          </div>

          {/* Right: Artwork thumbnail & File Actions (3 cols) */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center space-y-3">
            <div className="relative group w-24 h-24 rounded-2xl bg-white p-1 border-2 border-teal-400/40 shadow-lg overflow-hidden flex items-center justify-center">
              {activeItem.previewImageUrl || activeItem.productImage ? (
                <img
                  src={activeItem.previewImageUrl || activeItem.productImage}
                  alt={activeItem.productName}
                  className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform"
                />
              ) : (
                <FileText size={32} className="text-teal-600" />
              )}
              
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
                <button
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="p-1.5 bg-teal-500 text-slate-950 rounded-lg shadow-md"
                  title="Ver arte a pantalla completa"
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col w-full gap-1.5">
              <button
                onClick={() => setIsPreviewModalOpen(true)}
                className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye size={13} />
                <span>Previsualizar Arte</span>
              </button>

              {activeItem.highResPdfUrl && (
                <a
                  href={activeItem.highResPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download size={13} />
                  <span>Descargar PDF Original</span>
                </a>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* FULL PREVIEW MODAL */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-slate-200 max-w-3xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {activeItem.productName} — Arte de Impresión
                </h3>
                <p className="text-xs text-slate-500">
                  Cliente: {project.clientName} | Orden: {project.id}
                </p>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-center min-h-[350px]">
              {activeItem.previewImageUrl || activeItem.productImage ? (
                <img
                  src={activeItem.previewImageUrl || activeItem.productImage}
                  alt={activeItem.productName}
                  className="max-h-[400px] max-w-full object-contain rounded-lg shadow-xl"
                />
              ) : (
                <div className="text-slate-400 text-xs font-bold">No hay previsualización disponible</div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
              {activeItem.highResPdfUrl && (
                <a
                  href={activeItem.highResPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Descargar Archivo de Alta Resolución</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
