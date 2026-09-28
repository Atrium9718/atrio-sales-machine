/**
 * Errores de Dominio del Módulo de Telefonía y Voz (Etapa 17.1)
 */

export class VoiceNotConfiguredError extends Error {
  readonly code = 'VOICE_NOT_CONFIGURED';
  readonly status = 503;

  constructor(message = 'El servidor de telefonía y voz Asterisk ARI no está configurado en este entorno.') {
    super(message);
    this.name = 'VoiceNotConfiguredError';
    Object.setPrototypeOf(this, VoiceNotConfiguredError.prototype);
  }
}

export class VoicePermissionDeniedError extends Error {
  readonly code = 'VOICE_PERMISSION_DENIED';
  readonly status = 403;

  constructor(message = 'Permiso denegado para operar el módulo de telefonía o acceder al recurso de voz solicitado.') {
    super(message);
    this.name = 'VoicePermissionDeniedError';
    Object.setPrototypeOf(this, VoicePermissionDeniedError.prototype);
  }
}

export class VoicePrivacyBoundaryError extends Error {
  readonly code = 'VOICE_PRIVACY_VIOLATION';
  readonly status = 403;

  constructor(message = 'Límite duro de privacidad: no está autorizado para acceder o reproducir llamadas de otro usuario sin un permiso de supervisión explícito auditado.') {
    super(message);
    this.name = 'VoicePrivacyBoundaryError';
    Object.setPrototypeOf(this, VoicePrivacyBoundaryError.prototype);
  }
}

export class VoiceDoNotCallError extends Error {
  readonly code = 'VOICE_DO_NOT_CALL';
  readonly status = 400;

  constructor(public readonly phoneNumber: string, public readonly reason = 'Número registrado en la lista de exclusión telefónica (Do Not Call).') {
    super(`El número ${phoneNumber} está en la lista de exclusión telefónica (DNC): ${reason}`);
    this.name = 'VoiceDoNotCallError';
    Object.setPrototypeOf(this, VoiceDoNotCallError.prototype);
  }
}

export class VoiceDestinationBlockedError extends Error {
  readonly code = 'VOICE_DESTINATION_BLOCKED';
  readonly status = 403;

  constructor(public readonly destination: string, message = 'El destino internacional o especial no está en la lista blanca de la troncal.') {
    super(message);
    this.name = 'VoiceDestinationBlockedError';
    Object.setPrototypeOf(this, VoiceDestinationBlockedError.prototype);
  }
}

export class VoiceDailyLimitExceededError extends Error {
  readonly code = 'VOICE_DAILY_LIMIT_EXCEEDED';
  readonly status = 429;

  constructor(message = 'Se ha alcanzado el límite diario de minutos u operaciones de voz saliente para la organización.') {
    super(message);
    this.name = 'VoiceDailyLimitExceededError';
    Object.setPrototypeOf(this, VoiceDailyLimitExceededError.prototype);
  }
}

export class VoiceInvalidStateTransitionError extends Error {
  readonly code = 'VOICE_INVALID_STATE_TRANSITION';
  readonly status = 400;

  constructor(public readonly fromState: string, public readonly toState: string, public readonly callId?: string) {
    super(`Transición no declarada e inválida en máquina de llamadas de '${fromState}' hacia '${toState}'${callId ? ` [callId: ${callId}]` : ''}`);
    this.name = 'VoiceInvalidStateTransitionError';
    Object.setPrototypeOf(this, VoiceInvalidStateTransitionError.prototype);
  }
}

