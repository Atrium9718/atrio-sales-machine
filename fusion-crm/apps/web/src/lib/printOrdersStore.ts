import { createServerCollection, dataApiAdapter } from '@/lib/serverCollection';

/** Órdenes de impresión por demanda (mostrador): se guardan en el servidor (/api/data/print-orders). */
export const printOrdersCollection = createServerCollection<any>({
  updatedEvent: 'fusion_print_orders_updated',
  legacyStorageKey: 'fusion_print_orders',
  adapter: dataApiAdapter('print-orders'),
});

export const getPrintOrders = () => printOrdersCollection.getAll();

export const addPrintOrder = (order: any) => printOrdersCollection.save(order);
