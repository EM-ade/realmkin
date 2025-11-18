import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { PublicKey } from "@solana/web3.js";

const db = admin.firestore();

/**
 * Firebase Function to repair user data inconsistencies
 */
// Using broad types to maintain compatibility across firebase-functions versions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const repairUserData = functions.https.onCall(async (data: any, context: any) => {
  // Verify user is authenticated
  if (!context?.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const uid = context.auth.uid;
  const { repairAll } = (data as { repairAll?: boolean }) || {};

  try {
    if (repairAll) {
      // Admin-only operation to repair all users
      const isAdmin = await checkIfUserIsAdmin(uid);
      if (!isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only admins can repair all user data"
        );
      }

      const repairedCount = await repairAllUsers();
      return {
        success: true,
        message: `Repaired ${repairedCount} user data inconsistencies`,
        repairedCount
      };
    } else {
      // Repair current user's data
      const repaired = await repairSingleUser(uid);
      return {
        success: true,
        message: repaired 
          ? "User data repaired successfully" 
          : "No data inconsistencies found",
        repaired
      };
    }
  } catch (error) {
    console.error("Error repairing user data:", error);
    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to repair user data"
    );
  }
});

/**
 * Check if user is admin
 */
async function checkIfUserIsAdmin(uid: string): Promise<boolean> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return false;
    
    const userData = userDoc.data();
    return userData?.admin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Repair a single user's data
 */
async function repairSingleUser(uid: string): Promise<boolean> {
  try {
    console.log("🔧 Repairing data for user:", uid);
    
    // Get user document
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      console.warn("User document not found for UID:", uid);
      return false;
    }
    
    const userData = userDoc.data() as { 
      username?: string; 
      walletAddress?: string;
      email?: string;
    } | undefined;
    
    if (!userData) {
      console.warn("No user data found for UID:", uid);
      return false;
    }
    
    let repaired = false;
    
    // Repair username mapping if needed
    if (userData.username) {
      const usernameLower = userData.username.toLowerCase();
      const usernameDocRef = db.collection("usernames").doc(usernameLower);
      const usernameDoc = await usernameDocRef.get();
      
      if (!usernameDoc.exists || usernameDoc.data()?.uid !== uid) {
        // Create or update username mapping
        await usernameDocRef.set({ uid });
        console.log("✅ Username mapping repaired for user:", uid);
        repaired = true;
      }
    } else {
      // Try to find username from usernames collection
      const usernamesQuery = db.collection("usernames").where("uid", "==", uid);
      const usernamesSnapshot = await usernamesQuery.get();
      
      if (!usernamesSnapshot.empty) {
        const correctUsername = usernamesSnapshot.docs[0].id;
        await userDocRef.update({ username: correctUsername });
        console.log("✅ Username added to user document for user:", uid);
        repaired = true;
      }
    }
    
    // Repair wallet mapping if needed
    if (userData.walletAddress) {
      try {
        // Validate wallet address
        new PublicKey(userData.walletAddress);
        
        const walletLower = userData.walletAddress.toLowerCase();
        const walletDocRef = db.collection("wallets").doc(walletLower);
        const walletDoc = await walletDocRef.get();
        
        if (!walletDoc.exists || walletDoc.data()?.uid !== uid) {
          // Create or update wallet mapping
          await walletDocRef.set({
            uid: uid,
            walletAddress: userData.walletAddress,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log("✅ Wallet mapping repaired for user:", uid);
          repaired = true;
        }
      } catch (e) {
        console.error("Invalid wallet address for user:", uid, userData.walletAddress);
      }
    }
    
    return repaired;
  } catch (error) {
    console.error("Error repairing user:", uid, error);
    return false;
  }
}

/**
 * Repair all users' data
 */
async function repairAllUsers(): Promise<number> {
  let repairedCount = 0;
  
  try {
    console.log("🔧 Starting comprehensive data repair for all users...");
    
    // Get all users
    const usersSnapshot = await db.collection("users").get();
    
    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      try {
        const repaired = await repairSingleUser(uid);
        if (repaired) {
          repairedCount++;
        }
      } catch (userError) {
        console.error("Error repairing user:", uid, userError);
      }
    }
    
    console.log(`✅ Data repair completed. Repaired ${repairedCount} users.`);
    return repairedCount;
  } catch (error) {
    console.error("Error during comprehensive data repair:", error);
    throw error;
  }
}