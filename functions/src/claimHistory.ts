import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Get claim history for a user
 * This is the only function still using Firebase Functions
 * All other functionality has been migrated to the gatekeeper backend
 */
export const getClaimHistory = functions.https.onCall(
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const userId = request.auth.uid;
    const limit = (request.data as { limit?: number }).limit || 10;

    try {
      const claims = await db
        .collection("claims")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      return {
        claims: claims.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          completedAt: doc.data().completedAt?.toDate(),
        })),
      };
    } catch (error) {
      console.error("Fetch history error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch claim history"
      );
    }
  }
);
