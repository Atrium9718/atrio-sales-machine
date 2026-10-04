import React, { useState } from 'react';
import { ContactMapFormBlockConfig } from '../../types/cms';
import { MapPin, Phone, Mail, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

interface Props {
  block: ContactMapFormBlockConfig;
}

export default function ContactMapFormBlock({ block }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Quick whatsapp forward or notification
    const text = `Hola Fusión Gráfica, mi nombre es ${name}. Correo: ${email}, Teléfono: ${phone}. Consulta: ${message}`;
    const url = `https://wa.me/${block.whatsappNumber || '573243917169'}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setIsSent(true);
  };

  return (
    <section className="py-16 md:py-24 bg-slate-50 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            {block.title || 'Contáctanos & Visítanos'}
          </h2>
          {block.subtitle && (
            <p className="mt-3 text-sm sm:text-base text-slate-500 font-medium">
              {block.subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Details Column */}
          <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-4">
              Información de Atención
            </h3>

            <div className="space-y-4 text-xs sm:text-sm font-medium text-slate-600">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Sede Principal & Planta</h4>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">{block.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Línea Telefónica</h4>
                  <a href={`tel:${block.phone}`} className="text-teal-600 hover:underline font-bold">
                    {block.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Correo de Cotizaciones</h4>
                  <a href={`mailto:${block.email}`} className="text-teal-600 hover:underline font-bold">
                    {block.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Horario de Despachos</h4>
                  <p className="text-slate-500 mt-0.5">{block.scheduleText}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <a
                href={`https://wa.me/${block.whatsappNumber || '573243917169'}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <MessageSquare size={16} />
                <span>Atención Directa por WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Form / Map Column */}
          <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            {isSent ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900">¡Mensaje Enviado con Éxito!</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Tu solicitud ha sido redirigida a nuestro equipo comercial litográfico. Te responderemos en breve.
                </p>
                <button
                  onClick={() => setIsSent(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs"
                >
                  Enviar otra consulta
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-4">
                  Envíanos tu Solicitud o Cotización Especial
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Teléfono / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej: 320 1234567"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ej: contacto@tuempresa.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Detalles del Trabajo o Requerimiento *</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe el tipo de trabajo: producto, cantidad de ejemplares, tipo de papel, acabados (plastificado, reserva UV, troquel), etc."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <Send size={16} />
                  <span>Enviar Cotización a un Asesor</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
