import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebase";

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  walletAddress?: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Get user profile from users collection
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    return {
      uid,
      email: data.email,
      username: data.username,
      avatarUrl: data.avatarUrl,
      walletAddress: data.walletAddress,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate(),
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

/**
 * Check if a username is already taken
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  try {
    const usernameDoc = await getDoc(doc(db, "usernames", username.toLowerCase()));
    return usernameDoc.exists();
  } catch (error) {
    console.error("Error checking username:", error);
    return true; // Err on the side of caution
  }
}

/**
 * Update user profile
 * Note: Username can only be set once (immutable per schema)
 */
export async function updateUserProfile(
  uid: string,
  updates: {
    username?: string;
    avatarUrl?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current profile
    const currentProfile = await getUserProfile(uid);
    
    if (!currentProfile) {
      return { success: false, error: "User profile not found" };
    }

    // Check if trying to update username
    if (updates.username) {
      const normalizedUsername = updates.username.toLowerCase().trim();
      
      // Validate username format
      if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
        return {
          success: false,
          error: "Username must be 3-20 characters and contain only letters, numbers, and underscores",
        };
      }

      // Check if username is different from current
      if (currentProfile.username && currentProfile.username.toLowerCase() === normalizedUsername) {
        // Username unchanged, skip validation
        return {
          success: false,
          error: "New username is the same as current username",
        };
      }

      // Check if new username is taken by someone else
      const taken = await isUsernameTaken(normalizedUsername);
      if (taken) {
        return {
          success: false,
          error: "Username is already taken",
        };
      }

      // Delete old username mapping if exists
      if (currentProfile.username) {
        await deleteDoc(doc(db, "usernames", currentProfile.username.toLowerCase()));
      }

      // Create new username mapping
      await setDoc(doc(db, "usernames", normalizedUsername), {
        uid: uid,
      });
    }

    // Update user profile
    const userUpdates: any = {
      updatedAt: new Date(),
    };

    if (updates.username) {
      userUpdates.username = updates.username.trim(); // Preserve original case for display
    }

    if (updates.avatarUrl !== undefined) {
      userUpdates.avatarUrl = updates.avatarUrl;
    }

    await updateDoc(doc(db, "users", uid), userUpdates);

    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

/**
 * Get username from uid (via username mapping)
 */
export async function getUsernameFromUid(uid: string): Promise<string | null> {
  try {
    const profile = await getUserProfile(uid);
    return profile?.username || null;
  } catch (error) {
    console.error("Error getting username:", error);
    return null;
  }
}

/**
 * Get uid from username
 */
export async function getUidFromUsername(username: string): Promise<string | null> {
  try {
    const usernameDoc = await getDoc(doc(db, "usernames", username.toLowerCase()));
    
    if (!usernameDoc.exists()) {
      return null;
    }

    return usernameDoc.data().uid;
  } catch (error) {
    console.error("Error getting uid from username:", error);
    return null;
  }
}
