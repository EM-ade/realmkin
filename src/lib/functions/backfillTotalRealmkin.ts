import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { UserRewards } from "@/services/rewardsService";

const NEW_NFT_BONUS = 200; // 200 MKIN bonus for each NFT

async function backfillTotalRealmkin() {
  try {
    console.log("🔧 Starting backfill of totalRealmkin for existing users...");

    // Get all user rewards documents
    const userRewardsRef = collection(db, "userRewards");
    const querySnapshot = await getDocs(userRewardsRef);

    let updatedCount = 0;

    // Process each user's rewards
    for (const docSnap of querySnapshot.docs) {
      const userRewards = docSnap.data() as UserRewards;

      // Calculate the bonus based on the number of NFTs
      const nftBonus = userRewards.totalNFTs * NEW_NFT_BONUS;

      // Update the user's totalRealmkin with the bonus
      const userRewardsRef = doc(db, "userRewards", docSnap.id);
      await updateDoc(userRewardsRef, {
        totalRealmkin: nftBonus,
      });

      updatedCount++;
      console.log(`🔧 Updated totalRealmkin for user ${docSnap.id} with bonus: ${nftBonus}`);
    }

    console.log(`🔧 Backfill completed. Updated ${updatedCount} user records.`);
    return `Successfully updated ${updatedCount} user records with NFT bonuses.`;
  } catch (error) {
    console.error("Error during backfill:", error);
    throw error;
  }
}

export default backfillTotalRealmkin;
