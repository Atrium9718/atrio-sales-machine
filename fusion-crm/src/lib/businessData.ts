import { syncQuotesFromApi } from '../../apps/web/src/lib/quotesStore';
import { syncProjectsFromApi } from '../../apps/web/src/lib/projectsStore';
import { inventoryCollection } from '../../apps/web/src/lib/inventoryStore';
import { printOrdersCollection } from '../../apps/web/src/lib/printOrdersStore';

/**
 * Carga desde el servidor las colecciones de negocio que se leen de forma síncrona en la
 * interfaz (cotizaciones, proyectos, inventario, órdenes por demanda). En la primera carga
 * de cada navegador también sube los datos antiguos que hubiera en localStorage.
 */
export async function hydrateBusinessData(): Promise<void> {
  const results = await Promise.allSettled([
    syncQuotesFromApi(),
    syncProjectsFromApi(),
    inventoryCollection.hydrate(),
    printOrdersCollection.hydrate(),
  ]);
  for (const r of results) {
    if (r.status === 'rejected') console.warn('[datos] Error cargando datos de negocio:', r.reason);
  }
}
