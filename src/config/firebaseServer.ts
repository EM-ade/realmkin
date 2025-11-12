import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Sanity check: log which hosts the Admin SDK will use
console.log("[FirebaseServer] FIREBASE_AUTH_EMULATOR_HOST=", process.env.FIREBASE_AUTH_EMULATOR_HOST);
console.log("[FirebaseServer] FIRESTORE_EMULATOR_HOST=", process.env.FIRESTORE_EMULATOR_HOST);

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db = getFirestore(app);

// Connect to Firestore emulator if enabled
if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  } catch (e) {
    // ignore if already connected
  }
}

export default app;
