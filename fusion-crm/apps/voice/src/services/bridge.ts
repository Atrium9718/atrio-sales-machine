import { AriClient } from '../ari/client';
import { ActiveCall } from '../state/registry';
import { telemetry } from '../telemetry';

export class VoiceBridgeService {
  constructor(private readonly ari: AriClient) {}

  /**
   * Crea un puente de tipo mixing (audio bidireccional) para dos o más participantes.
   */
  public async createMixingBridge(call: ActiveCall, name?: string): Promise<string> {
    const bridgeName = name || `bridge-${call.callId}`;
    telemetry.log('INFO', `Creando bridge mixing ${bridgeName} para llamada ${call.callId}`);

    const bridge = await this.ari.createBridge('mixing', bridgeName);
    return bridge.id;
  }

  /**
   * Une canales en un puente mixing.
   */
  public async bridgeChannels(bridgeId: string, channelIds: string[]): Promise<void> {
    for (const chId of channelIds) {
      try {
        await this.ari.addChannelToBridge(bridgeId, chId);
      } catch (err: any) {
        telemetry.log('WARN', `Fallo al agregar canal ${chId} a bridge ${bridgeId}: ${err.message}`);
      }
    }
  }

  /**
   * Saca un canal del puente.
   */
  public async removeChannel(bridgeId: string, channelId: string): Promise<void> {
    try {
      await this.ari.removeChannelFromBridge(bridgeId, channelId);
    } catch (err: any) {
      telemetry.log('WARN', `Error retirando canal ${channelId} de bridge ${bridgeId}: ${err.message}`);
    }
  }

  /**
   * Destruye el puente cuando la llamada termina.
   */
  public async destroyBridge(bridgeId: string): Promise<void> {
    try {
      await this.ari.destroyBridge(bridgeId);
    } catch (err: any) {
      telemetry.log('INFO', `Bridge ${bridgeId} ya no existe o fue destruido: ${err.message}`);
    }
  }

  /**
   * Ejecuta una transferencia atendida:
   * 1. Pone al cliente (transferee) en espera con música en el bridge original.
   * 2. Une al asesor (transferer) con el nuevo destino en un segundo bridge de consulta.
   * 3. Al confirmar, mueve al cliente al nuevo bridge y retira al asesor original.
   */
  public async completeAttendedTransfer(
    customerChannelId: string,
    transfererChannelId: string,
    targetChannelId: string,
    finalBridgeId: string,
    consultationBridgeId: string
  ): Promise<void> {
    telemetry.log('INFO', 'Completando transferencia atendida hacia nuevo asesor', {
      customerChannelId,
      transfererChannelId,
      targetChannelId,
    });

    // 1. Quitar al asesor original de la consulta
    await this.removeChannel(consultationBridgeId, transfererChannelId);

    // 2. Colgar la pierna del asesor original
    try {
      await this.ari.hangupChannel(transfererChannelId, 'normal');
    } catch (e) {
      // ignore
    }

    // 3. Mover al cliente al bridge final con el nuevo asesor
    await this.ari.addChannelToBridge(finalBridgeId, customerChannelId);

    // 4. Limpiar el bridge de consulta
    await this.destroyBridge(consultationBridgeId);
  }
}
