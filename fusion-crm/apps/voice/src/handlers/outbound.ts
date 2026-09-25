import { AriClient } from '../ari/client';
import { ActiveCall, callRegistry } from '../state/registry';
import { createCallSnapshot, transitionCall } from '@fusion/core/voice/callMachine';
import {
  VoiceDoNotCallError,
  VoiceDestinationBlockedError,
  VoiceDailyLimitExceededError,
} from '@fusion/core/voice/errors';
import { normalizeColombianPhone } from '@fusion/core/voice/normalizePhone';
import { VoiceBridgeService } from '../services/bridge';
import { VoiceRecordService } from '../services/record';
import { persistence, prisma } from '../services/persist';
import { broadcaster } from '../services/broadcast';
import { telemetry } from '../telemetry';

export class OutboundCallHandler {
  constructor(
    private readonly ari: AriClient,
    private readonly bridgeService: VoiceBridgeService,
    private readonly recordService: VoiceRecordService
  ) {}

  /**
   * Inicia una llamada saliente (Click-to-Call) desde el CRM.
   * Valida listas de exclusión (DNC), prefijos bloqueados y límites diarios de llamadas antes de originar.
   */
  public async initiateOutboundCall(params: {
    callerUserId: string;
    organizationId: string;
    destinationNumber: string;
    customerId?: string;
    contactId?: string;
  }): Promise<{ callId: string; status: string }> {
    const rawDest = params.destinationNumber;
    const normalizedDest = normalizeColombianPhone(rawDest);

    if (!normalizedDest) {
      throw new Error(`Número de teléfono de destino inválido: ${rawDest}`);
    }

    // 1. Validar Lista No Llamar (Do Not Call - DNC)
    const isDnc = await prisma.voiceDoNotCall.findFirst({
      where: {
        organizationId: params.organizationId,
        phone: normalizedDest,
      },
    });

    if (isDnc) {
      telemetry.log('WARN', `Intento de llamada saliente a número en Lista No Llamar: ${normalizedDest}`);
      throw new VoiceDoNotCallError(normalizedDest, isDnc.reason || 'Registrado en lista DNC');
    }

    // 2. Validar Prefijos Bloqueados (ej. números especiales o premium tarificación adicional)
    const BLOCKED_PREFIXES = ['01900', '01901', '1900', '900'];
    for (const prefix of BLOCKED_PREFIXES) {
      if (normalizedDest.startsWith(prefix) || rawDest.startsWith(prefix)) {
        telemetry.log('WARN', `Intento de llamada saliente a prefijo bloqueado: ${prefix}`);
        throw new VoiceDestinationBlockedError(normalizedDest, `Prefijo restringido: ${prefix}`);
      }
    }

    // 3. Validar límite diario de llamadas del asesor
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const callsCountToday = await prisma.voiceCall.count({
      where: {
        organizationId: params.organizationId,
        handledByUserId: params.callerUserId,
        direction: 'OUTBOUND',
        startedAt: { gte: today },
      },
    });

    const MAX_DAILY_OUTBOUND = 250;
    if (callsCountToday >= MAX_DAILY_OUTBOUND) {
      throw new VoiceDailyLimitExceededError(`Límite diario de ${MAX_DAILY_OUTBOUND} llamadas salientes superado.`);
    }

    // 4. Buscar extensión asignada al asesor
    const extension = await prisma.voiceExtension.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.callerUserId,
        status: 'ACTIVE',
      },
    });

    if (!extension) {
      throw new Error(`El usuario ${params.callerUserId} no tiene una extensión telefónica activa asignada.`);
    }

    const callId = `call_out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const correlationId = telemetry.createCorrelationId('outbound');
    telemetry.recordCallStarted();

    // 5. Crear llamada y snapshot de la máquina
    const snapshot = createCallSnapshot(callId);
    const activeCall: ActiveCall = {
      callId,
      organizationId: params.organizationId,
      correlationId,
      channelId: '', // Se asignará con el canal del asesor
      linkedChannelIds: [],
      direction: 'OUTBOUND',
      fromNumber: extension.callerIdNumber || extension.extension,
      toNumber: normalizedDest,
      extensionId: extension.id,
      handledByUserId: params.callerUserId,
      machine: snapshot,
      legalConsentAnnounced: false,
      startedAt: new Date(),
    };

    // Registrar en memoria y base de datos
    callRegistry.registerCall(activeCall);
    persistence.persistCallCreation(activeCall);

    // 6. Originar primero hacia el navegador del asesor (WebRTC)
    telemetry.log('INFO', `Marcando al navegador del asesor ext ${extension.extension} para llamada saliente ${callId}`);
    const agentChannel = await this.ari.createChannel({
      endpoint: `PJSIP/${extension.extension}`,
      app: 'fusion-voz',
      appArgs: `outbound_dialer,${callId}`,
      callerId: normalizedDest,
      timeout: 30,
    });

    activeCall.channelId = agentChannel.id;
    callRegistry.linkChannelToCall(callId, agentChannel.id);

    // Transición a RINGING
    const ringTrans = transitionCall(activeCall.machine, 'RINGING', {
      channelId: agentChannel.id,
      actorUserId: params.callerUserId,
    });
    activeCall.machine = ringTrans.snapshot;
    persistence.persistCallTransition(callId, params.organizationId, ringTrans.event, ringTrans.snapshot);

    await this.ari.dialChannel(agentChannel.id, normalizedDest, 30);

    return {
      callId,
      status: 'DIALING_AGENT',
    };
  }

  /**
   * Se ejecuta cuando el asesor contesta en su softphone:
   * Origina la llamada al cliente por la troncal SIP del operador.
   */
  public async handleAgentAnsweredOutbound(call: ActiveCall): Promise<void> {
    telemetry.log('INFO', `Asesor contestó su softphone para llamada saliente ${call.callId}. Marcando al cliente ${call.toNumber}...`);

    try {
      const trunkEndpoint = `PJSIP/${call.toNumber}@troncal-operador`;

      const customerChannel = await this.ari.createChannel({
        endpoint: trunkEndpoint,
        app: 'fusion-voz',
        appArgs: `outbound_customer,${call.callId}`,
        callerId: call.fromNumber,
        timeout: 45,
      });

      callRegistry.linkChannelToCall(call.callId, customerChannel.id);

      // Iniciar marcación por la troncal
      await this.ari.dialChannel(customerChannel.id, call.fromNumber, 45);
    } catch (err: any) {
      telemetry.log('ERROR', `Error marcando al cliente por la troncal: ${err.message}`);
      const failTrans = transitionCall(call.machine, 'FAILED', {
        reason: 'TRUNK_DIAL_FAILED',
        extra: { error: err.message },
      });
      call.machine = failTrans.snapshot;
      persistence.persistCallCompletion(call, 'FAILED', 'TRUNK_ERROR', 'SYSTEM');
      callRegistry.removeCall(call.callId);
    }
  }

  /**
   * Se ejecuta cuando el cliente externo contesta:
   * Crea el mixing bridge, conecta ambos canales, arranca la grabación.
   */
  public async handleCustomerAnsweredOutbound(call: ActiveCall, customerChannelId: string): Promise<void> {
    telemetry.log('INFO', `Cliente contestó llamada saliente ${call.callId}. Conectando audio...`);

    try {
      const bridgeId = await this.bridgeService.createMixingBridge(call);
      call.bridgeId = bridgeId;

      // Unir asesor y cliente
      await this.bridgeService.bridgeChannels(bridgeId, [call.channelId, customerChannelId]);

      // Pasar a CONNECTED
      const connTrans = transitionCall(call.machine, 'CONNECTED', {
        channelId: customerChannelId,
        bridgeId,
        actorUserId: call.handledByUserId,
      });
      call.machine = connTrans.snapshot;
      call.answeredAt = connTrans.snapshot.answeredAt;

      persistence.persistCallTransition(call.callId, call.organizationId, connTrans.event, connTrans.snapshot);

      // Iniciar grabación en bridge
      await this.recordService.startBridgeRecording(call, 'ALWAYS');

      // Notificar al softphone
      if (call.handledByUserId) {
        await broadcaster.publishToUser(call.handledByUserId, {
          event: 'voice.call_answered',
          callId: call.callId,
          channelId: customerChannelId,
          organizationId: call.organizationId,
          fromNumber: call.fromNumber,
          displayNumber: call.toNumber,
          state: 'CONNECTED',
          direction: 'OUTBOUND',
          context: call.context ?? null,
          timestamp: new Date().toISOString(),
          waitSeconds: call.machine.waitSeconds,
          talkSeconds: 0,
        });
      }
    } catch (err: any) {
      telemetry.log('ERROR', `Error conectando llamada saliente: ${err.message}`);
    }
  }
}
