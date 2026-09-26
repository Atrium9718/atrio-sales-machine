import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { INITIAL_EMPLOYEES, INITIAL_ROLES } from '../server/services/employeeService';

function cleanObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

async function restore() {
  console.log('Restaurando equipo completo de empleados en Firestore...');
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  const db = getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);

  // Restore roles
  for (const role of INITIAL_ROLES) {
    await setDoc(doc(db, 'roles', role.id), cleanObject(role), { merge: true });
  }
  console.log(`✓ ${INITIAL_ROLES.length} roles restaurados/verificados en Firestore.`);

  // Restore all employees
  for (const emp of INITIAL_EMPLOYEES) {
    await setDoc(doc(db, 'employees', emp.id), cleanObject(emp), { merge: true });
  }
  console.log(`✓ ${INITIAL_EMPLOYEES.length} colaboradores restaurados con éxito en Firestore.`);

  // Verify
  const snap = await getDocs(collection(db, 'employees'));
  console.log(`Total documentos en colección "employees": ${snap.size}`);
  snap.docs.forEach((d) => {
    const data = d.data();
    console.log(`  - [${d.id}] ${data.name} (${data.roleName})`);
  });

  process.exit(0);
}

restore().catch((err) => {
  console.error('Error restaurando empleados:', err);
  process.exit(1);
});
