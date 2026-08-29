import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase using the client SDK (works in Node.js for RTDB)
let db: any = null;
try {
  if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log("Firebase initialized on server successfully.");
  } else {
    console.warn("No Firebase API key found in .env. Firebase will not sync.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export function syncGameStateToFirebase(gameState: any) {
  if (db) {
    try {
      const sanitizedState = JSON.parse(JSON.stringify(gameState));
      const stateRef = ref(db, 'gameState');
      set(stateRef, sanitizedState).catch((err: any) => console.error("Firebase sync error:", err));
    } catch (e) {
      console.error("Firebase state sanitization error:", e);
    }
  }
}
