/**
 * Merge duplicate userRewards documents by walletAddress.
 * Usage: npx ts-node scripts/tmp_rovodev_merge-user-rewards.ts
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

type UserRewards = {
  userId: string;
  walletAddress: string;
  totalNFTs?: number;
  weeklyRate?: number;
  totalEarned?: number;
  totalClaimed?: number;
  totalRealmkin?: number;
  pendingRewards?: number;
  lastCalculated?: Timestamp | Date | null;
  lastClaimed?: Timestamp | Date | null;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
};

const toDate = (value: Timestamp | Date | null | undefined) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return null;
};

const maxDate = (a?: Timestamp | Date | null, b?: Timestamp | Date | null) => {
  const dateA = toDate(a);
  const dateB = toDate(b);
  if (!dateA) return dateB;
  if (!dateB) return dateA;
  return dateA > dateB ? dateA : dateB;
};

const minDate = (a?: Timestamp | Date | null, b?: Timestamp | Date | null) => {
  const dateA = toDate(a);
  const dateB = toDate(b);
  if (!dateA) return dateB;
  if (!dateB) return dateA;
  return dateA < dateB ? dateA : dateB;
};

const parseNumber = (value: unknown) => (typeof value === "number" ? value : 0);

const buildMergedRewards = (primary: UserRewards, duplicate: UserRewards, now: Date): UserRewards => {
  return {
    userId: primary.userId,
    walletAddress: primary.walletAddress || duplicate.walletAddress,
    totalNFTs: Math.max(parseNumber(primary.totalNFTs), parseNumber(duplicate.totalNFTs)),
    weeklyRate: Math.max(parseNumber(primary.weeklyRate), parseNumber(duplicate.weeklyRate)),
    totalEarned: parseNumber(primary.totalEarned) + parseNumber(duplicate.totalEarned),
    totalClaimed: parseNumber(primary.totalClaimed) + parseNumber(duplicate.totalClaimed),
    totalRealmkin: parseNumber(primary.totalRealmkin) + parseNumber(duplicate.totalRealmkin),
    pendingRewards: parseNumber(primary.pendingRewards) + parseNumber(duplicate.pendingRewards),
    lastCalculated: maxDate(primary.lastCalculated, duplicate.lastCalculated) ?? now,
    lastClaimed: maxDate(primary.lastClaimed, duplicate.lastClaimed),
    createdAt: minDate(primary.createdAt, duplicate.createdAt) ?? now,
    updatedAt: now,
  };
};

const selectPrimaryDoc = (
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): FirebaseFirestore.QueryDocumentSnapshot => {
  return docs
    .sort((a, b) => {
      const dataA = a.data() as UserRewards;
      const dataB = b.data() as UserRewards;
      const claimedA = parseNumber(dataA.totalClaimed);
      const claimedB = parseNumber(dataB.totalClaimed);
      if (claimedA !== claimedB) {
        return claimedB - claimedA;
      }
      return a.id.localeCompare(b.id);
    })
    .shift()!;
};

const isDryRun = process.env.DRY_RUN !== "false";

async function mergeDuplicates() {
  const snapshot = await db.collection("userRewards").get();
  const byWallet = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as UserRewards;
    const wallet = (data.walletAddress || "").trim();
    if (!wallet) return;
    if (!byWallet.has(wallet)) {
      byWallet.set(wallet, []);
    }
    byWallet.get(wallet)!.push(doc);
  });

  let mergedCount = 0;
  let duplicateCount = 0;
  const now = new Date();

  for (const [wallet, docs] of byWallet.entries()) {
    if (docs.length < 2) continue;

    duplicateCount += docs.length - 1;
    const primaryDoc = selectPrimaryDoc(docs);
    const primaryData = primaryDoc.data() as UserRewards;
    const claimedPrimary = parseNumber(primaryData.totalClaimed);
    const sortedClaimed = docs
      .map((doc) => ({
        id: doc.id,
        claimed: parseNumber((doc.data() as UserRewards).totalClaimed),
      }))
      .sort((a, b) => b.claimed - a.claimed || a.id.localeCompare(b.id));

    console.log(
      `🧭 Wallet ${wallet}: selecting primary ${primaryDoc.id} (totalClaimed=${claimedPrimary}). Candidates: ${sortedClaimed
        .map((entry) => `${entry.id}:${entry.claimed}`)
        .join(", ")}`,
    );

    for (const duplicateDoc of docs) {
      if (duplicateDoc.id === primaryDoc.id) continue;
      const duplicateData = duplicateDoc.data() as UserRewards;
      const mergedRewards = buildMergedRewards(primaryData, duplicateData, now);

      if (isDryRun) {
        console.log(
          `🧪 Dry run: would merge ${duplicateDoc.id} into ${primaryDoc.id} for wallet ${wallet}`,
        );
      } else {
        await db.runTransaction(async (transaction) => {
          const primaryRef = primaryDoc.ref;
          const duplicateRef = duplicateDoc.ref;
          const primarySnap = await transaction.get(primaryRef);
          if (!primarySnap.exists) return;

          transaction.set(primaryRef, mergedRewards, { merge: true });
          transaction.delete(duplicateRef);
        });
      }

      mergedCount += 1;
    }

    console.log(
      `${isDryRun ? "🧪 Dry run:" : "✅"} Merged wallet ${wallet} into ${primaryDoc.id}`,
    );
  }

  console.log(
    `🎯 ${isDryRun ? "Dry run complete" : "Done"}. ${mergedCount} duplicate docs ${isDryRun ? "would be" : ""} merged (${duplicateCount} duplicates found).`,
  );
}

mergeDuplicates().catch((error) => {
  console.error("❌ Merge failed:", error);
  process.exit(1);
});
