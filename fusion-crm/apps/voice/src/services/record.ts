import { AriClient } from '../ari/client';
import { ActiveCall } from '../state/registry';
import { prisma } from './persist';
import { telemetry } from '../telemetry';

export class VoiceRecordService {
  constructor(private readonly ari: AriClient) {}

  /**
   * Inicia la grabación sobre el BRIDGE (no el canal), garantizando que se capturen
   * ambas vías de audio y la grabación sobreviva a transferencias.
   */
  public async startBridgeRecording(
    call: ActiveCall,
    recordingPolicy: 'ALWAYS' | 'NEVER' | 'INBOUND_ONLY' | 'OUTBOUND_ONLY' = 'ALWAYS'
  ): Promise<string | null> {
    if (!call.bridgeId) {
      telemetry.log('WARN', `No se puede grabar la llamada ${call.callId} sin un bridge activo.`);
      return null;
    }

    // Comprobar política de grabación
    if (recordingPolicy === 'NEVER') {
      telemetry.log('INFO', `Grabación deshabilitada por política NEVER para extensión en llamada ${call.callId}`);
      return null;
    }
    if (recordingPolicy === 'INBOUND_ONLY' && call.direction !== 'INBOUND') {
      return null;
    }
    if (recordingPolicy === 'OUTBOUND_ONLY' && call.direction !== 'OUTBOUND') {
      return null;
    }

    const recordingName = `rec_${call.callId}_${Date.now()}`;
    try {
      telemetry.log('INFO', `Iniciando grabación en bridge ${call.bridgeId}: ${recordingName}`);
      const liveRec = await this.ari.recordBridge(call.bridgeId, recordingName, 'wav');

      call.recordingName = recordingName;
      call.isRecordingPaused = false;

      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + 1);

      // Registrar en base de datos el registro de grabación inicial
      const voiceRecording = await prisma.voiceRecording.create({
        data: {
          organizationId: call.organizationId,
          callId: call.callId,
          storageKey: `asterisk/${recordingName}.wav`,
          format: 'wav',
          durationSeconds: 0,
          consentAnnounced: call.legalConsentAnnounced,
          retentionUntil: retentionDate,
        },
      });

      call.recordingId = voiceRecording.id;

      // Registrar evento RECORDING_STARTED
      await prisma.voiceCallEvent.create({
        data: {
          organizationId: call.organizationId,
          callId: call.callId,
          type: 'RECORDING_STARTED',
          payload: {
            recordingName,
            recordingId: voiceRecording.id,
            consentAnnounced: call.legalConsentAnnounced,
            bridgeId: call.bridgeId,
          },
        },
      });

      return recordingName;
    } catch (err: any) {
      telemetry.log('ERROR', `Error iniciando grabación de llamada ${call.callId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Pausa la grabación (para proteger datos sensibles como tarjetas de crédito o contraseñas).
   */
  public async pauseRecording(call: ActiveCall, requestedByUserId: string): Promise<void> {
    if (!call.recordingName || call.isRecordingPaused) return;

    try {
      await this.ari.pauseRecording(call.recordingName);
      call.isRecordingPaused = true;

      // Registrar evento con el autor que solicitó la pausa
      await prisma.voiceCallEvent.create({
        data: {
          organizationId: call.organizationId,
          callId: call.callId,
          type: 'RECORDING_STOPPED',
          actorUserId: requestedByUserId,
          payload: {
            reason: 'PAUSED_SENSITIVE_DATA',
            recordingName: call.recordingName,
          },
        },
      });

      telemetry.log('INFO', `Grabación pausada por usuario ${requestedByUserId} en llamada ${call.callId}`);
    } catch (err: any) {
      telemetry.log('WARN', `Error pausando grabación ${call.recordingName}: ${err.message}`);
    }
  }

  /**
   * Reanuda la grabación tras finalizar el ingreso de datos sensibles.
   */
  public async resumeRecording(call: ActiveCall, requestedByUserId: string): Promise<void> {
    if (!call.recordingName || !call.isRecordingPaused) return;

    try {
      await this.ari.resumeRecording(call.recordingName);
      call.isRecordingPaused = false;

      await prisma.voiceCallEvent.create({
        data: {
          organizationId: call.organizationId,
          callId: call.callId,
          type: 'RECORDING_STARTED',
          actorUserId: requestedByUserId,
          payload: {
            reason: 'RESUMED_AFTER_PAUSE',
            recordingName: call.recordingName,
          },
        },
      });

      telemetry.log('INFO', `Grabación reanudada por usuario ${requestedByUserId} en llamada ${call.callId}`);
    } catch (err: any) {
      telemetry.log('WARN', `Error reanudando grabación ${call.recordingName}: ${err.message}`);
    }
  }

  /**
   * Manejador del evento RecordingFinished de ARI.
   * Actualiza el estado a READY y programa el trabajo de subida a MinIO.
   */
  public async handleRecordingFinished(recordingName: string, durationSeconds: number): Promise<void> {
    try {
      const rec = await prisma.voiceRecording.findFirst({
        where: { storageKey: `asterisk/${recordingName}.wav` },
      });

      if (rec) {
        await prisma.voiceRecording.update({
          where: { id: rec.id },
          data: {
            durationSeconds: Math.round(durationSeconds),
          },
        });
        telemetry.log('INFO', `Grabación ${recordingName} finalizada (${durationSeconds}s) y lista para procesar.`);
      }
    } catch (e: any) {
      telemetry.log('WARN', `Error al finalizar grabación ${recordingName}: ${e.message}`);
    }
  }
}
