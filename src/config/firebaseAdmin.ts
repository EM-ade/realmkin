import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Set emulator hosts BEFORE initializing
const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
if (useEmulator) {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  }
}

// Initialize Admin SDK once per process
if (getApps().length === 0) {
  const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccountB64) {
    // Base64-encoded credentials (easier for .env)
    const decoded = Buffer.from(serviceAccountB64, "base64").toString("utf8");
    const credentials = JSON.parse(decoded);
    initializeApp({
      credential: cert(credentials),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else if (serviceAccountJson) {
    // Explicit service account JSON (recommended in prod)
    const credentials = JSON.parse(serviceAccountJson);
    initializeApp({
      credential: cert(credentials),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else if (useEmulator) {
    // Emulator mode: use minimal dummy credentials
    const dummyKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA2a2j...truncated\n-----END RSA PRIVATE KEY-----";
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "test-project",
        clientEmail: "firebase-adminsdk@test-project.iam.gserviceaccount.com",
        privateKey: dummyKey,
      }),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else {
    throw new Error(
      "Firebase Admin SDK initialization failed. Please provide FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_SERVICE_ACCOUNT_JSON in environment variables, or enable NEXT_PUBLIC_USE_EMULATORS=true for local development."
    );
  }
}

export const adminDb = getFirestore();
