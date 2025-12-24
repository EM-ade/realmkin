import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface BalanceValidationResult {
  isValid: boolean;
  actualBalance: number;
  displayedBalance: number;
  discrepancy: number;
  message?: string;
}

/**
 * Validate user balance before claiming to prevent "insufficient balance" errors
 * @param userId The Firebase user ID
 * @param expectedBalance The balance expected to be available
 * @returns BalanceValidationResult with validation details
 */
export async function validateUserBalance(
  userId: string,
  expectedBalance: number
): Promise<BalanceValidationResult> {
  try {
    // Get actual balance from Firestore users collection
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return {
        isValid: false,
        actualBalance: 0,
        displayedBalance: expectedBalance,
        discrepancy: expectedBalance,
        message: "User document not found"
      };
    }
    
    const userData = userDoc.data();
    const actualBalance = userData?.totalRealmkin || 0;
    
    // Check for discrepancy
    const discrepancy = Math.abs(actualBalance - expectedBalance);
    
    // Allow small discrepancies due to floating point precision
    const isValid = discrepancy < 0.01 && actualBalance >= expectedBalance;
    
    return {
      isValid,
      actualBalance,
      displayedBalance: expectedBalance,
      discrepancy,
      message: isValid 
        ? undefined 
        : `Balance mismatch: actual ${actualBalance}, expected ${expectedBalance}`
    };
  } catch (error) {
    console.error("Error validating user balance:", error);
    return {
      isValid: false,
      actualBalance: 0,
      displayedBalance: expectedBalance,
      discrepancy: expectedBalance,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Get user's actual balance from Firestore
 * @param userId The Firebase user ID
 * @returns The actual balance from Firestore
 */
export async function getUserActualBalance(userId: string): Promise<number> {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return 0;
    }
    
    const userData = userDoc.data();
    return userData?.totalRealmkin || 0;
  } catch (error) {
    console.error("Error getting user balance:", error);
    return 0;
  }
}
