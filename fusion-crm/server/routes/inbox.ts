import { Router } from 'express';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export const inboxRouter = Router();

// Retrieve Firebase configuration
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.warn('Could not read firebase-applet-config.json', e);
}

if (!getApps().length && firebaseConfig.projectId) {
  try {
    initializeApp(firebaseConfig);
  } catch (err) {
    console.error('Firebase init error', err);
  }
}

function getDb() {
  if (!getApps().length) throw new Error('Firebase not initialized');
  return getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
}

// GET all chats
inboxRouter.get('/chats', async (req, res) => {
  try {
    const chatsRef = collection(getDb(), 'chats');
    const snapshot = await getDocs(chatsRef);
    const chats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // sort by updatedAt descending
    chats.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST reply to a chat
inboxRouter.post('/chats/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    const chatRef = doc(getDb(), 'chats', id);
    const chatDoc = await getDoc(chatRef);
    if (!chatDoc.exists()) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    let messages = chatDoc.data().messages || [];
    messages.push({
      id: Date.now(),
      sender: 'human', // marks it as human agent
      text,
      time: new Date().toISOString()
    });
    
    await updateDoc(chatRef, {
      messages,
      status: 'human', // pause AI
      updatedAt: new Date().toISOString()
    });
    
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error replying to chat:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST toggle AI
inboxRouter.post('/chats/:id/toggle-ai', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'human'
    
    const chatRef = doc(getDb(), 'chats', id);
    await updateDoc(chatRef, {
      status: status,
      updatedAt: new Date().toISOString()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling AI:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
