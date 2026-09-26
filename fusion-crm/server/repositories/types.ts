/**
 * Acceso a los datos de negocio con la misma forma de documento que usa la aplicación,
 * independiente de dónde se guarden (Firestore hoy, Postgres en la migración por fases).
 */
export type AppDocument = Record<string, any> & { id: string };

/** Quién hace el cambio (para asignar responsable en Postgres). */
export interface WriteContext {
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
}

export interface DocumentRepository<T extends AppDocument = AppDocument> {
  readonly backend: 'firestore' | 'postgres';
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  /** Crea o reemplaza el documento completo. */
  upsert(doc: T, ctx?: WriteContext): Promise<T>;
  upsertMany(docs: T[], ctx?: WriteContext): Promise<void>;
  /** Mezcla campos sobre el documento existente (null si no existe). */
  patch(id: string, fields: Record<string, any>, ctx?: WriteContext): Promise<T | null>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<number>;
}
