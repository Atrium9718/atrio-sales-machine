import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { inMemoryAnnouncements, inMemoryShoutouts } from '../routes/announcements';
import { inMemoryChannels, inMemoryMessages, inMemoryPins, inMemorySavedReplies, inMemoryPresences } from '../routes/chat';
import { inMemoryCallSessions, inMemoryCallParticipants, inMemoryCallInvitations, inMemoryActivities, inMemoryAuditLogs } from './callsService';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.warn('Could not read firebase-applet-config.json', e);
}

function getDb() {
  if (!getApps().length) {
    if (Object.keys(firebaseConfig).length > 0) {
      initializeApp(firebaseConfig);
    } else {
      return null;
    }
  }
  return getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
}

function mapToObject(map: Map<any, any>) {
  const obj: any = {};
  for (const [k, v] of map.entries()) {
    obj[k] = v;
  }
  return obj;
}

function objectToMap(obj: any, map: Map<any, any>) {
  map.clear();
  for (const k in obj) {
    map.set(k, obj[k]);
  }
}

const LOCAL_STATE_PATH = path.join(process.cwd(), 'local-app-state.json');
let quotaExhaustedUntil = 0;
let lastSavedHash = '';
let isDirty = false;

export function markStateDirty() {
  isDirty = true;
}

function applyStateData(data: any) {
  if (data.announcements) { inMemoryAnnouncements.length = 0; inMemoryAnnouncements.push(...JSON.parse(data.announcements)); }
  if (data.shoutouts) { inMemoryShoutouts.length = 0; inMemoryShoutouts.push(...JSON.parse(data.shoutouts)); }
  if (data.channels) { inMemoryChannels.length = 0; inMemoryChannels.push(...JSON.parse(data.channels)); }
  if (data.messages) { inMemoryMessages.length = 0; inMemoryMessages.push(...JSON.parse(data.messages)); }
  if (data.pins) { inMemoryPins.length = 0; inMemoryPins.push(...JSON.parse(data.pins)); }
  if (data.savedReplies) { inMemorySavedReplies.length = 0; inMemorySavedReplies.push(...JSON.parse(data.savedReplies)); }
  if (data.presences) { 
    const p = JSON.parse(data.presences);
    for(let k in inMemoryPresences) delete inMemoryPresences[k];
    for(let k in p) inMemoryPresences[k] = p[k];
  }
  
  if (data.callSessions) objectToMap(JSON.parse(data.callSessions), inMemoryCallSessions);
  if (data.callParticipants) objectToMap(JSON.parse(data.callParticipants), inMemoryCallParticipants);
  if (data.callInvitations) objectToMap(JSON.parse(data.callInvitations), inMemoryCallInvitations);
  
  if (data.activities) { inMemoryActivities.length = 0; inMemoryActivities.push(...JSON.parse(data.activities)); }
  if (data.auditLogs) { inMemoryAuditLogs.length = 0; inMemoryAuditLogs.push(...JSON.parse(data.auditLogs)); }
}

export async function loadStateFromFirestore() {
  // Try local state file first as high-reliability cache
  try {
    if (fs.existsSync(LOCAL_STATE_PATH)) {
      const localData = JSON.parse(fs.readFileSync(LOCAL_STATE_PATH, 'utf8'));
      applyStateData(localData);
      console.log('Successfully loaded state from local fallback storage.');
    }
  } catch (localErr) {
    console.warn('Could not load local state fallback:', localErr);
  }

  const db = getDb();
  if (!db) return;
  try {
    const docSnap = await getDoc(doc(db, 'appState', 'state1'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      applyStateData(data);
      console.log('Successfully synchronized state from Firestore.');
    }
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || String(err).includes('RESOURCE_EXHAUSTED')) {
      quotaExhaustedUntil = Date.now() + 60 * 60 * 1000;
      console.warn('[Persistence] Firestore quota exhausted on load, relying on local storage.');
    } else {
      console.error('Failed to load state from Firestore:', err);
    }
  }
}

export async function saveStateToFirestore(force = false) {
  const payload = {
    announcements: JSON.stringify(inMemoryAnnouncements),
    shoutouts: JSON.stringify(inMemoryShoutouts),
    channels: JSON.stringify(inMemoryChannels),
    messages: JSON.stringify(inMemoryMessages),
    pins: JSON.stringify(inMemoryPins),
    savedReplies: JSON.stringify(inMemorySavedReplies),
    presences: JSON.stringify(inMemoryPresences),
    callSessions: JSON.stringify(mapToObject(inMemoryCallSessions)),
    callParticipants: JSON.stringify(mapToObject(inMemoryCallParticipants)),
    callInvitations: JSON.stringify(mapToObject(inMemoryCallInvitations)),
    activities: JSON.stringify(inMemoryActivities),
    auditLogs: JSON.stringify(inMemoryAuditLogs)
  };

  const currentPayloadStr = JSON.stringify(payload);
  if (!force && currentPayloadStr === lastSavedHash) {
    // Nothing changed, avoid unnecessary writes
    return;
  }

  // Always save to local file first
  try {
    fs.writeFileSync(LOCAL_STATE_PATH, currentPayloadStr, 'utf8');
    lastSavedHash = currentPayloadStr;
    isDirty = false;
  } catch (writeErr) {
    console.error('Failed to save state to local disk:', writeErr);
  }

  // If quota is exhausted or backoff is active, skip Firestore call cleanly
  if (Date.now() < quotaExhaustedUntil) {
    return;
  }

  const db = getDb();
  if (!db) return;

  try {
    await setDoc(doc(db, 'appState', 'state1'), payload);
  } catch (err: any) {
    const isQuotaError = 
      err?.code === 'resource-exhausted' || 
      err?.code === 8 ||
      String(err?.message || err).includes('RESOURCE_EXHAUSTED') ||
      String(err?.message || err).includes('Quota limit exceeded');

    if (isQuotaError) {
      quotaExhaustedUntil = Date.now() + 60 * 60 * 1000; // 1 hour backoff
      console.warn('[Persistence] Firestore write quota reached. Switched to local disk persistence for 1 hour.');
    } else {
      console.error('Failed to save state to Firestore:', err);
    }
  }
}

let syncInterval: any = null;
export function startStateSync() {
  if (syncInterval) clearInterval(syncInterval);
  // sync every 5 minutes if dirty, instead of every 15 seconds!
  syncInterval = setInterval(() => {
    if (isDirty) {
      saveStateToFirestore().catch(console.error);
    }
  }, 5 * 60 * 1000);
}
