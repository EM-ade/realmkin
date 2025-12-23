import "server-only";
import * as admin from "firebase-admin";

interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function formatPrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}

export function createFirebaseAdminApp(config: FirebaseAdminConfig) {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: formatPrivateKey(config.privateKey),
    }),
  });
}

// Initialize the default app
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  // We don't throw here to allow build time execution, but runtime will fail if used
  console.warn(
    "⚠️ Firebase Admin SDK not initialized: Missing environment variables."
  );
} else {
  let finalPrivateKey = privateKey;
  let keySource = "env_var_raw";

  // Handle case where user pasted the entire JSON file content
  if (privateKey.trim().startsWith("{")) {
    try {
      const json = JSON.parse(privateKey);
      if (json.private_key) {
        finalPrivateKey = json.private_key;
        keySource = "env_var_json_blob";
        // console.log("✅ Detected JSON Service Account, extracted private_key.");
      }
    } catch (e) {
      console.warn(
        "⚠️ Failed to parse FIREBASE_PRIVATE_KEY as JSON, using as-is."
      );
    }
  }

  console.log(
    `[FirebaseAdmin] Initializing with Project ID: ${projectId}, Client Email: ${clientEmail}, Key Source: ${keySource}`
  );

  // Check if app already exists
  if (admin.apps.length > 0) {
    console.log(
      `[FirebaseAdmin] App already initialized: ${admin.apps.length} apps found. Reusing default.`
    );
  } else {
    console.log(`[FirebaseAdmin] Creating new Firebase Admin App...`);
  }

  createFirebaseAdminApp({
    projectId,
    clientEmail,
    privateKey: finalPrivateKey,
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const Timestamp = admin.firestore.Timestamp;
export const FieldValue = admin.firestore.FieldValue;
