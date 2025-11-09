import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * One-time migration script to move stakes from the root collection
 * to a sub-collection under each user.
 * 
 * NOTE: Deploy and run this function until the root `stakes` collection is empty,
 * then disable or delete it.
 */
export const migrateStakes = onSchedule({ schedule: "every 2 minutes", timeZone: "UTC" }, async () => {
  const batch = db.batch();
  let movedCount = 0;

  // 1. Get up to 500 old stake docs
  const oldStakesSnap = await db.collection("stakes").limit(500).get();

  if (oldStakesSnap.empty) {
    console.log("No more stakes to migrate. Migration complete.");
    // Consider disabling this function via Firebase console after completion.
    return;
  }

  // 2. For each stake, find the user's UID and create a new doc ref
  for (const doc of oldStakesSnap.docs) {
    const stakeData = doc.data();
    const walletAddress = stakeData.wallet;

    if (!walletAddress) {
      console.warn(`Skipping stake ${doc.id} with no wallet address.`);
      continue;
    }

    // Find the UID from the wallets collection
    const walletDocSnap = await db.collection("wallets").doc(walletAddress).get();
    if (!walletDocSnap.exists) {
      console.warn(`Skipping stake ${doc.id}: no user found for wallet ${walletAddress}.`);
      continue;
    }

    const uid = walletDocSnap.data()?.uid;
    if (!uid) {
      console.warn(`Skipping stake ${doc.id}: wallet ${walletAddress} has no UID.`);
      continue;
    }

    // 3. Set the new doc and delete the old one in a batch
    const newStakeRef = db.collection("users").doc(uid).collection("stakes").doc(doc.id);
    batch.set(newStakeRef, stakeData);
    batch.delete(doc.ref);
    movedCount++;
  }

  // 4. Commit the batch
  if (movedCount > 0) {
    await batch.commit();
    console.log(`Successfully migrated ${movedCount} stake documents.`);
  } else {
    console.log("No eligible stakes found in this run.");
  }
});
