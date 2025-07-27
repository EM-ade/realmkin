import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAUpBSJkrs8UZplk19Az-2rfCetJlno2bU",
  authDomain: "realmkin-app.firebaseapp.com",
  projectId: "realmkin-app",
  storageBucket: "realmkin-app.firebasestorage.app",
  messagingSenderId: "306299386610",
  appId: "1:306299386610:web:7197cc8219415f0c71ee6b",
  measurementId: "G-J1EKVQR2DM",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;
