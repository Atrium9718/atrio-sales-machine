import * as React from 'react';
import { VoicePagePlaceholder } from './VoicePagePlaceholder';

export function VozLlamadasPage() {
  return (
    <VoicePagePlaceholder
      id="voz-llamadas-page"
      title="Historial de Llamadas"
      subtitle="Registro completo de llamadas entrantes, salientes e internas con filtros y reproducción"
      stageName="Sub-Etapa 17.2"
      requiredPermission="voice:read_own"
      models={['VoiceCall', 'VoiceRecording', 'VoiceTranscript', 'VoiceDisposition']}
      events={['voz.llamada_contestada', 'voz.llamada_perdida', 'voz.llamada_finalizada']}
      description="Esta pantalla permite listar y buscar llamadas con paginación por cursor, reproducción segura de grabaciones y acceso a transcripciones. Construida en la Sub-Etapa 17.2."
    />
  );
}
export default VozLlamadasPage;
