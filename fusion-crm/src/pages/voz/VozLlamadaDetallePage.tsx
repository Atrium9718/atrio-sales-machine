import * as React from 'react';
import { useParams } from 'react-router-dom';
import { VoicePagePlaceholder } from './VoicePagePlaceholder';

export function VozLlamadaDetallePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <VoicePagePlaceholder
      id="voz-llamada-detalle-page"
      title={`Detalle de Llamada ${id || ''}`}
      subtitle="Línea de tiempo de eventos, reproductor de audio, transcripción y compromisos detectados por IA"
      stageName="Sub-Etapa 17.2 / 17.3"
      requiredPermission="voice:read_own"
      models={['VoiceCall', 'VoiceCallEvent', 'VoiceRecording', 'VoiceTranscript']}
      events={['voz.grabacion_lista', 'voz.transcripcion_lista']}
      description="Esta pantalla exhibe la cronología detallada de la llamada, el reproductor de audio con onda espectral, la transcripción con análisis de sentimiento y los compromisos automáticos detectados con Gemini. Construida en la Sub-Etapa 17.2 y 17.3."
    />
  );
}
export default VozLlamadaDetallePage;
