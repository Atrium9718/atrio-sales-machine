import { EventEmitter } from 'events';

export const identityEventEmitter = new EventEmitter();

export function emitIdentityEvent(eventName: string, payload: any) {
  identityEventEmitter.emit(eventName, payload);
  // Optional: In a real distributed system, we would publish to Redis or BullMQ.
}
