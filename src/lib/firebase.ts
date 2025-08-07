import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Debug: Check if environment variables are loaded
console.log("Firebase Config Debug:", {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Set" : "Missing",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "Set" : "Missing",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Set" : "Missing",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ? "Set"
    : "Missing",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ? "Set"
    : "Missing",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "Set" : "Missing",
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "your_api_key_here",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "your_project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your_project_id",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "your_project.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your_sender_id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "your_app_id",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const db = getFirestore(app); // Add this line if not present
export default app;
