import { AsyncLocalStorage } from 'async_hooks';
import type { Employee } from '../services/employeeService';

export interface RequestAuthContext {
  /** Usuario efectivo (el suplantado, si un administrador está simulando a otro colaborador). */
  user: Employee;
  /** Usuario autenticado realmente con Google. */
  realUser: Employee;
}

export const requestContext = new AsyncLocalStorage<RequestAuthContext>();

export function getRequestAuth(): RequestAuthContext | undefined {
  return requestContext.getStore();
}
