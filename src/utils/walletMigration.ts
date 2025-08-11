/**
 * Utility to help migrate existing users who don't have wallet mappings
 * This should be run once to create wallet mappings for existing users
 */

import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ExistingUserData {
  username: string;
  email: string;
  walletAddress?: string;
  createdAt: Date;
}

export class WalletMigrationHelper {
  /**
   * Migrate existing users to have wallet mappings
   * This will look for users with email format: {walletAddress}@wallet.realmkin.com
   * and create wallet mappings for them
   */
  static async migrateExistingUsers(): Promise<void> {
    try {
      console.log("🔄 Starting wallet mapping migration...");

      // Get all users from the users collection
      const usersSnapshot = await getDocs(collection(db, "users"));
      let migratedCount = 0;
      let skippedCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as ExistingUserData;
        const uid = userDoc.id;

        // Check if this is a wallet-based user (email format: address@wallet.realmkin.com)
        if (userData.email && userData.email.endsWith("@wallet.realmkin.com")) {
          const walletAddress = userData.email.replace("@wallet.realmkin.com", "");
          
          // Check if wallet mapping already exists
          const walletMappingDoc = await getDoc(
            doc(db, "wallets", walletAddress.toLowerCase())
          );

          if (!walletMappingDoc.exists()) {
            // Create wallet mapping
            await setDoc(doc(db, "wallets", walletAddress.toLowerCase()), {
              uid: uid,
              username: userData.username,
              createdAt: userData.createdAt || new Date(),
            });

            // Update user document to include walletAddress if not present
            if (!userData.walletAddress) {
              await setDoc(
                doc(db, "users", uid),
                {
                  ...userData,
                  walletAddress: walletAddress,
                },
                { merge: true }
              );
            }

            console.log(`✅ Migrated user: ${userData.username} -> ${walletAddress}`);
            migratedCount++;
          } else {
            console.log(`⏭️ Skipped user: ${userData.username} (mapping already exists)`);
            skippedCount++;
          }
        } else {
          // Not a wallet-based user, skip
          skippedCount++;
        }
      }

      console.log(`🎉 Migration complete! Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    }
  }

  /**
   * Verify wallet mappings for debugging
   */
  static async verifyWalletMappings(): Promise<void> {
    try {
      console.log("🔍 Verifying wallet mappings...");

      const walletsSnapshot = await getDocs(collection(db, "wallets"));
      console.log(`📊 Found ${walletsSnapshot.size} wallet mappings:`);

      for (const walletDoc of walletsSnapshot.docs) {
        const walletData = walletDoc.data();
        const walletAddress = walletDoc.id;
        
        console.log(`  ${walletAddress} -> ${walletData.username} (UID: ${walletData.uid})`);
      }
    } catch (error) {
      console.error("❌ Verification failed:", error);
    }
  }

  /**
   * Check if a specific wallet has a mapping
   */
  static async checkWalletMapping(walletAddress: string): Promise<boolean> {
    try {
      const walletDoc = await getDoc(
        doc(db, "wallets", walletAddress.toLowerCase())
      );
      return walletDoc.exists();
    } catch (error) {
      console.error("Error checking wallet mapping:", error);
      return false;
    }
  }
}

// Export for convenience
export const migrateExistingUsers = WalletMigrationHelper.migrateExistingUsers;
export const verifyWalletMappings = WalletMigrationHelper.verifyWalletMappings;
export const checkWalletMapping = WalletMigrationHelper.checkWalletMapping;
