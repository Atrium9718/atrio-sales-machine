import { Router } from 'express';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export const metaWebhookRouter = Router();

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

// Verify Webhook (Meta Requirement)
metaWebhookRouter.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // This should match the token configured in the Meta App Dashboard
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'fusion_secure_token_2026';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Receive Messages
metaWebhookRouter.post('/', async (req, res) => {
  try {
    const body = req.body;

    // Check if it's an event from a Page/WhatsApp
    if (body.object === 'whatsapp_business_account' || body.object === 'page' || body.object === 'instagram') {
      
      for (const entry of body.entry) {
        // WhatsApp messages are in entry.changes
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.value && change.value.messages) {
              for (const msg of change.value.messages) {
                // Ignore statuses, only process actual messages
                if (msg.type === 'text') {
                  const from = msg.from; // Sender's phone number
                  const text = msg.text.body;
                  const contactName = change.value.contacts?.[0]?.profile?.name || 'Cliente WhatsApp';

                  await saveMessageToFirestore('whatsapp', from, text, contactName);
                }
              }
            }
          }
        }
        
        // Messenger/Instagram messages are in entry.messaging
        if (entry.messaging) {
          for (const event of entry.messaging) {
            if (event.message && event.message.text) {
              const senderId = event.sender.id;
              const text = event.message.text;
              
              await saveMessageToFirestore(body.object, senderId, text, 'Cliente ' + body.object);
            }
          }
        }
      }

      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.sendStatus(500);
  }
});

async function saveMessageToFirestore(channel: string, senderId: string, text: string, contactName: string) {
  const sessionId = `${channel}_${senderId}`;
  const chatRef = doc(getDb(), 'chats', sessionId);
  const chatDoc = await getDoc(chatRef);
  
  let messages = [];
  if (chatDoc.exists()) {
    messages = chatDoc.data().messages || [];
  }
  
  messages.push({
    id: Date.now(),
    sender: 'user',
    text: text,
    time: new Date().toISOString()
  });

  await setDoc(chatRef, {
    channel: channel,
    contactName: contactName,
    updatedAt: new Date().toISOString(),
    status: chatDoc.exists() ? chatDoc.data().status : 'active',
    messages: messages
  }, { merge: true });
  
  // NOTE: If status is 'active', you can trigger the AI Bot here 
  // to automatically reply via WhatsApp/Messenger APIs!
}
