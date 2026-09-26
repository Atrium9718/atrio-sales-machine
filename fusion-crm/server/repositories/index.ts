import type { DocumentRepository } from './types';
import { createFirestoreRepository } from './firestoreRepository';
import { createClientsRepository, createProjectsRepository, createQuotesRepository } from './prisma/repositories';

export type { AppDocument, DocumentRepository, WriteContext } from './types';

/**
 * Dónde viven los datos de la fase 1 (clientes, cotizaciones, proyectos).
 * DATA_BACKEND=postgres usa Postgres (DATABASE_URL); cualquier otro valor, Firestore.
 * Cambiar el valor y reiniciar permite volver atrás sin tocar código.
 */
export function dataBackend(): 'firestore' | 'postgres' {
  return process.env.DATA_BACKEND === 'postgres' ? 'postgres' : 'firestore';
}

interface Repositories {
  clients: DocumentRepository;
  quotes: DocumentRepository;
  projects: DocumentRepository;
}

let cached: { backend: string; repos: Repositories } | null = null;

export function repositories(): Repositories {
  const backend = dataBackend();
  if (!cached || cached.backend !== backend) {
    cached = {
      backend,
      repos:
        backend === 'postgres'
          ? { clients: createClientsRepository(), quotes: createQuotesRepository(), projects: createProjectsRepository() }
          : {
              clients: createFirestoreRepository('customers'),
              quotes: createFirestoreRepository('quotes'),
              projects: createFirestoreRepository('projects'),
            },
    };
  }
  return cached.repos;
}

/** Contexto de escritura a partir de la identidad verificada de la petición. */
export function writeContextFrom(req: { headers: Record<string, any> }) {
  return {
    actorId: req.headers['x-user-id'] ? String(req.headers['x-user-id']) : undefined,
    actorName: req.headers['x-user-name'] ? String(req.headers['x-user-name']) : undefined,
  };
}
