import * as React from 'react';
import { VoicePagePlaceholder } from './VoicePagePlaceholder';

export function VozAgenteIaPage() {
  return (
    <VoicePagePlaceholder
      id="voz-agente-ia-page"
      title="Agente Telefónico de Inteligencia Artificial"
      subtitle="Configuración de prompts, intenciones vocales y límites de seguridad (sin cotización de precios ni confirmación de descuentos)"
      stageName="Sub-Etapa 17.5"
      requiredPermission="voice:manage_all"
      models={['VoiceAiAgentConfig', 'VoiceAiSession']}
      events={['voz.ia_atendio', 'voz.ia_escalo']}
      description="Esta pantalla permite configurar el bot de atención telefónica con Gemini Live / Speech-to-Speech. Regla estricta del negocio: El agente de IA telefónico nunca cotiza precios, no da fechas de entrega ni confirma descuentos, escalando inmediatamente al asesor humano en caso necesario. Construida en la Sub-Etapa 17.5."
    />
  );
}
export default VozAgenteIaPage;
