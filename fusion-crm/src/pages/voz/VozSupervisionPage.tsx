import * as React from 'react';
import { VoicePagePlaceholder } from './VoicePagePlaceholder';

export function VozSupervisionPage() {
  return (
    <VoicePagePlaceholder
      id="voz-supervision-page"
      title="Supervisión en Vivo de Llamadas"
      subtitle="Monitoreo de conversaciones activas, escucha discreta (Spy), susurro (Whisper) e irrupción auditada (Barge)"
      stageName="Sub-Etapa 17.7"
      requiredPermission="voice:supervise"
      models={['VoiceCall', 'VoiceAgentStatus', 'VoiceQueue']}
      events={['voz.llamada_contestada', 'voz.espera_excesiva', 'voz.cola_saturada']}
      description="Panel de control para directores y supervisores de contact center. Permite escuchar llamadas en curso de agentes de su equipo, hablar solo con el agente sin que el cliente escuche (Whisper) o entrar en conferencia tripartita (Barge), registrando cada acción en el registro inmutable de auditoría (VOICE_SUPERVISE_STARTED, VOICE_BARGE_STARTED). Construida en la Sub-Etapa 17.7."
    />
  );
}
export default VozSupervisionPage;
