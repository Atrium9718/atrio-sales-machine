import { authenticateServerFirestoreClient } from './server/auth/serverFirestoreAuth';

// El servidor debe autenticarse ante Firestore antes de cargar los módulos que lo
// consultan al importarse (p. ej. employeeService), por eso la app se importa después.
async function main() {
  await authenticateServerFirestoreClient();
  const { startServer } = await import('./server/app');
  await startServer();
}

main().catch((err) => {
  console.error('Error fatal al iniciar el servidor', err);
  process.exit(1);
});
