import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

// Load config at runtime to avoid static import issues if file is missing
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let projectId = 'demo-project';

if (process.env.FIREBASE_PROJECT_ID) {
  projectId = process.env.FIREBASE_PROJECT_ID;
} else if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  projectId = config.projectId;
}

if (!getApps().length) {
  initializeApp({
    projectId: projectId,
  });
}

export const adminAuth = getAuth();
