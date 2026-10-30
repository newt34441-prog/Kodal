import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without this explicit firestoreDatabaseId passed
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    const msg = err?.message || String(error);
    if (msg.includes('the client is offline') || msg.includes('Quota exceeded') || err?.code === 'resource-exhausted') {
      console.warn('Firebase connection check note:', msg);
    }
  }
}

testConnection();
