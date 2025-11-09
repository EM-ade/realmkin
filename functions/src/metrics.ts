import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

interface StakeDoc {
  amount: number;
  status: string; // active | unstaking | completed
  wallet: string;
}

/**
 * Recalculate meta/stats after any write to stakes or users
 */
export const recomputeStats = onDocumentWritten("stakes/{stakeId}", async (_event) => {
  try {
    const stakesSnap = await db.collection("stakes").get();
    let tvl = 0;
    let activeStakes = 0;
    stakesSnap.forEach((doc) => {
      const data = doc.data() as StakeDoc;
      if (data.status === "active") {
        activeStakes += 1;
        tvl += data.amount;
      }
    });

    const totalStakersSnap = await db.collection("stakes").select("wallet").get();
    const uniqueWallets = new Set<string>();
    totalStakersSnap.forEach((d) => uniqueWallets.add((d.data() as { wallet: string }).wallet));

    await db.doc("meta/stats").set(
      {
        totalValueLocked: tvl,
        activeStakes,
        totalStakers: uniqueWallets.size,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Failed to recompute stats", err);
  }
});
