import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PublicKey } from "@solana/web3.js";

/**
 * Service to repair data inconsistencies in user accounts
 */
class DataRepairService {
  /**
   * Repair user data by ensuring proper username mapping
   * @param uid User ID
   * @returns Boolean indicating if repair was successful
   */
  async repairUsernameMapping(uid: string): Promise<boolean> {
    try {
      console.log("🔧 Repairing username mapping for user:", uid);
      
      // Get user document
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.warn("User document not found for UID:", uid);
        return false;
      }
      
      const userData = userDoc.data();
      
      // Check if username is already properly set
      if (userData.username && typeof userData.username === 'string') {
        // Verify username mapping exists
        const usernameLower = userData.username.toLowerCase();
        const usernameDocRef = doc(db, "usernames", usernameLower);
        const usernameDoc = await getDoc(usernameDocRef);
        
        if (usernameDoc.exists() && usernameDoc.data()?.uid === uid) {
          console.log("Username mapping already correct for user:", uid);
          return true;
        }
      }
      
      // Find correct username from usernames collection
      const usernamesQuery = query(
        collection(db, "usernames"),
        where("uid", "==", uid)
      );
      const usernamesSnapshot = await getDocs(usernamesQuery);
      
      if (usernamesSnapshot.empty) {
        console.warn("No username mapping found for user:", uid);
        return false;
      }
      
      // Get the correct username (should only be one)
      const correctUsername = usernamesSnapshot.docs[0].id;
      console.log("Found correct username:", correctUsername);
      
      // Update user document with correct username
      await updateDoc(userDocRef, {
        username: correctUsername
      });
      
      console.log("✅ Successfully repaired username mapping for user:", uid);
      return true;
    } catch (error) {
      console.error("Error repairing username mapping for user:", uid, error);
      return false;
    }
  }
  
  /**
   * Repair wallet mapping for a user
   * @param uid User ID
   * @param walletAddress Wallet address
   * @returns Boolean indicating if repair was successful
   */
  async repairWalletMapping(uid: string, walletAddress: string): Promise<boolean> {
    try {
      console.log("🔧 Repairing wallet mapping for user:", uid, walletAddress);
      
      // Validate wallet address
      try {
        new PublicKey(walletAddress);
      } catch (e) {
        console.error("Invalid wallet address:", walletAddress);
        return false;
      }
      
      // Ensure wallet mapping exists
      const walletLower = walletAddress.toLowerCase();
      const walletDocRef = doc(db, "wallets", walletLower);
      const walletDoc = await getDoc(walletDocRef);
      
      if (!walletDoc.exists() || walletDoc.data()?.uid !== uid) {
        // Create or update wallet mapping
        await setDoc(walletDocRef, {
          uid: uid,
          walletAddress: walletAddress,
          createdAt: new Date()
        });
        console.log("✅ Wallet mapping repaired for user:", uid);
      }
      
      // Ensure user document has wallet address
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (!userData.walletAddress || userData.walletAddress !== walletAddress) {
          await updateDoc(userDocRef, {
            walletAddress: walletAddress
          });
          console.log("✅ User document wallet address updated for user:", uid);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error repairing wallet mapping for user:", uid, error);
      return false;
    }
  }
  
  /**
   * Find and repair all users with data inconsistencies
   * @returns Number of users repaired
   */
  async repairAllUsers(): Promise<number> {
    let repairedCount = 0;
    
    try {
      console.log("🔧 Starting comprehensive data repair...");
      
      // Get all users
      const usersSnapshot = await getDocs(collection(db, "users"));
      
      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;
        const userData = userDoc.data();
        
        try {
          // Repair username mapping
          const usernameRepaired = await this.repairUsernameMapping(uid);
          if (usernameRepaired) {
            repairedCount++;
          }
          
          // Repair wallet mapping if wallet address exists
          if (userData.walletAddress) {
            const walletRepaired = await this.repairWalletMapping(uid, userData.walletAddress);
            if (walletRepaired) {
              repairedCount++;
            }
          }
        } catch (userError) {
          console.error("Error repairing user:", uid, userError);
        }
      }
      
      console.log(`✅ Data repair completed. Repaired ${repairedCount} issues.`);
      return repairedCount;
    } catch (error) {
      console.error("Error during comprehensive data repair:", error);
      return 0;
    }
  }

  /**
   * Validate user data consistency
   * @param uid User ID
   * @returns Object with validation results
   */
  async validateUserData(uid: string): Promise<{
    isValid: boolean;
    issues: string[];
    userData: Record<string, unknown>;
  }> {
    const issues: string[] = [];
    
    try {
      // Get user document
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        issues.push("User document not found");
        return { isValid: false, issues, userData: {} };
      }
      
      const userData = userDoc.data() as Record<string, unknown>;
      
      // Check username
      if (!userData.username) {
        issues.push("Missing username in user document");
      } else {
        // Verify username mapping
        const usernameLower = String(userData.username).toLowerCase();
        const usernameDocRef = doc(db, "usernames", usernameLower);
        const usernameDoc = await getDoc(usernameDocRef);
        
        if (!usernameDoc.exists()) {
          issues.push("Username mapping document not found");
        } else if (usernameDoc.data()?.uid !== uid) {
          issues.push("Username mapping UID mismatch");
        }
      }
      
      // Check wallet
      if (userData.walletAddress) {
        try {
          new PublicKey(String(userData.walletAddress));
        } catch (e) {
          issues.push("Invalid wallet address format");
        }
        
        // Verify wallet mapping
        const walletLower = String(userData.walletAddress).toLowerCase();
        const walletDocRef = doc(db, "wallets", walletLower);
        const walletDoc = await getDoc(walletDocRef);
        
        if (!walletDoc.exists()) {
          issues.push("Wallet mapping document not found");
        } else if (walletDoc.data()?.uid !== uid) {
          issues.push("Wallet mapping UID mismatch");
        }
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        userData
      };
    } catch (error) {
      console.error("Error validating user data:", error);
      return {
        isValid: false,
        issues: ["Validation error occurred"],
        userData: {}
      };
    }
  }
}

export const dataRepairService = new DataRepairService();
