export const INITIAL_CLIENTS: any[] = [];

export const getClients = () => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('fusion_clients');
  if (stored) return JSON.parse(stored);
  return [];
};

export const addClient = (client: any) => {
  const clients = getClients();
  const updated = [...clients.filter((c: any) => c.id !== client.id), client];
  localStorage.setItem('fusion_clients', JSON.stringify(updated));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('fusion_clients_updated'));
};
