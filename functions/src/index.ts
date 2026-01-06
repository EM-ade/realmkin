import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  admin.initializeApp();
  console.log("🔥 Firebase Admin SDK initialized");
}

// Export only the claim history function (everything else migrated to gatekeeper)
export { getClaimHistory } from "./claimHistory";