"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  runTransaction,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { PublicKey } from "@solana/web3.js";
import { auth, db } from "@/lib/firebase";

interface UserData {
  username: string;
  email: string;
  walletAddress?: string;
  createdAt: Date;
  admin?: boolean; // Add admin property
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    username: string,
    walletAddress?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  getUserByWallet: (walletAddress: string) => Promise<UserData | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  checkUsernameAvailability: async () => false,
  getUserByWallet: async () => null,
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        // Fetch user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            
            // Check if user is admin via wallet address in environment variable
            const adminWallets = process.env.NEXT_PUBLIC_ADMIN_WALLETS?.split(',').map(w => w.trim().toLowerCase()) || [];
            const userWallet = data.walletAddress?.toLowerCase();
            const isAdmin = userWallet ? adminWallets.includes(userWallet) : false;
            
            // Fix data inconsistency: Ensure username is properly set
            let username = data.username;
            if (!username && data.email) {
              // Try to find username from usernames collection
              const usernameDoc = await findUsernameByUID(user.uid);
              if (usernameDoc) {
                username = usernameDoc;
                // Update user document with correct username
                try {
                  await updateDoc(doc(db, "users", user.uid), {
                    username: username
                  });
                  console.log("Fixed username mapping for user:", user.uid);
                } catch (updateError) {
                  console.warn("Failed to update username in user document:", updateError);
                }
              }
            }
            
            setUserData({
              ...data,
              username: username,
              admin: isAdmin
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Helper function to find username by UID
  const findUsernameByUID = async (uid: string): Promise<string | null> => {
    try {
      const usernamesQuery = query(
        collection(db, "usernames"),
        where("uid", "==", uid)
      );
      const usernamesSnapshot = await getDocs(usernamesQuery);
      
      if (!usernamesSnapshot.empty) {
        // Return the first username found (should only be one)
        return usernamesSnapshot.docs[0].id;
      }
      return null;
    } catch (error) {
      console.error("Error finding username by UID:", error);
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log("🔐 Attempting login with email:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last login timestamp
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { lastLogin: serverTimestamp() });

      console.log("✅ Login successful and timestamp updated");
    } catch (error: unknown) {
      console.error("❌ Login failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      throw new Error(errorMessage);
    }
  };

  const signup = async (
    email: string,
    password: string,
    username: string,
    walletAddress?: string
  ) => {
    try {
      console.log("Starting signup process for:", email);

      // Validate username
      if (!username || username.length < 3) {
        throw new Error("Username must be at least 3 characters long");
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error("Username can only contain letters, numbers, and underscores");
      }

      // Additional validation: Ensure username is set before allowing wallet connection
      if (!username.trim()) {
        throw new Error("Username is required before connecting wallet");
      }

      // Validate wallet address using Solana's PublicKey constructor if provided
      if (walletAddress) {
        try {
          new PublicKey(walletAddress); // This will throw if invalid
        } catch (e) {
          throw new Error("Invalid Solana wallet address provided");
        }
      }

      // Create user account
      console.log("Creating user account...");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("User account created:", user.uid);
      try {
        const nameLower = username.toLowerCase();
        const userRef = doc(db, "users", user.uid);
        const unameRef = doc(db, "usernames", nameLower);
        const walletLower = walletAddress?.toLowerCase();
        const walletRef = walletLower ? doc(db, "wallets", walletLower) : null;
        await runTransaction(db, async (tx) => {
          const unameSnap = await tx.get(unameRef);
          if (unameSnap.exists()) {
            throw new Error("Username is already taken");
          }
          if (walletRef) {
            const walletSnap = await tx.get(walletRef);
            if (walletSnap.exists() && walletSnap.data()?.uid !== user.uid) {
              throw new Error("Wallet already mapped to another account");
            }
          }
          tx.set(unameRef, { uid: user.uid });
          tx.set(userRef, {
            username: nameLower,
            email,
            walletAddress, // Store in original case for blockchain compatibility
            createdAt: new Date(),
            admin: false,
          });
          if (walletRef && walletAddress) {
            tx.set(walletRef, {
              uid: user.uid,
              walletAddress, // Store in original case for blockchain compatibility
              createdAt: new Date(),
            });
          }
        });
      } catch (firestoreError) {
        console.warn("Failed to save user data to Firestore:", firestoreError);
      }
    } catch (error: unknown) {
      console.error("Signup error:", error);

      if (error instanceof Error) {
        // Handle specific Firebase Auth errors
        if (error.message.includes("email-already-in-use")) {
          console.log(
            "🔄 User already exists in Firebase Auth, attempting to log in..."
          );

          // Try to log in the existing user
          try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log("✅ Successfully logged in existing user");

            const currentUser = auth.currentUser;
            if (currentUser) {
              try {
                const nameLower = username.toLowerCase();
                const userRef = doc(db, "users", currentUser.uid);
                const unameRef = doc(db, "usernames", nameLower);
                const walletLower = walletAddress?.toLowerCase();
                const walletRef = walletLower ? doc(db, "wallets", walletLower) : null;
                await runTransaction(db, async (tx) => {
                  const unameSnap = await tx.get(unameRef);
                  if (unameSnap.exists() && unameSnap.data()?.uid !== currentUser.uid) {
                    throw new Error("Username is already taken");
                  }
                  if (walletRef) {
                    const walletSnap = await tx.get(walletRef);
                    if (walletSnap.exists() && walletSnap.data()?.uid !== currentUser.uid) {
                      throw new Error("Wallet already mapped to another account");
                    }
                  }
                  tx.set(unameRef, { uid: currentUser.uid });
                  tx.set(userRef, {
                    username: nameLower,
                    email,
                    walletAddress, // Store in original case for blockchain compatibility
                    createdAt: new Date(),
                  });
                  if (walletRef && walletAddress) {
                    tx.set(walletRef, {
                      uid: currentUser.uid,
                      walletAddress, // Store in original case for blockchain compatibility
                      createdAt: new Date(),
                    });
                  }
                });
              } catch (firestoreError) {
                console.warn("Failed to create missing data:", firestoreError);
              }
            }

            return; // Successfully handled the existing user
          } catch (loginError) {
            console.error("Failed to log in existing user:", loginError);
            throw new Error(
              "This email is already registered but login failed. Please try again or contact support."
            );
          }
        } else if (error.message.includes("weak-password")) {
          throw new Error(
            "Password is too weak. Please use at least 6 characters."
          );
        } else if (error.message.includes("invalid-email")) {
          throw new Error("Please enter a valid email address.");
        } else if (error.message.includes("network-request-failed")) {
          throw new Error(
            "Network error. Please check your internet connection and try again."
          );
        } else {
          throw new Error(error.message);
        }
      } else {
        throw new Error("Signup failed. Please try again.");
      }
    }
  };

  const checkUsernameAvailability = async (
    username: string
  ): Promise<boolean> => {
    try {
      const usernameDoc = await getDoc(
        doc(db, "usernames", username.toLowerCase())
      );
      return !usernameDoc.exists();
    } catch (error) {
      console.error("Error checking username availability:", error);
      return false;
    }
  };

  const getUserByWallet = async (
    walletAddress: string
  ): Promise<UserData | null> => {
    try {
      console.log("🔍 Looking up user by wallet address:", walletAddress);

      // Check cache first
      const cacheKey = `realmkin_wallet_user_${walletAddress.toLowerCase()}`;
      const cachedUserData = localStorage.getItem(cacheKey);

      if (cachedUserData) {
        try {
          const parsedData = JSON.parse(cachedUserData);
          // Check if cache is still valid (less than 1 hour old)
          if (parsedData.timestamp && Date.now() - parsedData.timestamp < 3600000) {
            console.log("✅ User data found in cache");
            return parsedData.userData;
          }
        } catch (error) {
          console.log("Failed to parse cached user data:", error);
          localStorage.removeItem(cacheKey);
        }
      }

      // Check if wallet mapping exists
      let walletDoc;
      try {
        walletDoc = await getDoc(
          doc(db, "wallets", walletAddress.toLowerCase())
        );
      } catch (error) {
        console.error("❌ Error reading wallet document:", error);
        // If we can't read from Firestore, assume user doesn't exist
        return null;
      }

      if (!walletDoc.exists()) {
        console.log("❌ No wallet mapping found");

        // Check if user exists in Firebase Auth but wallet mapping is missing
        // This can happen if the signup process was interrupted
        const tempEmail = `${walletAddress.toLowerCase()}@wallet.realmkin.com`;
        console.log(
          "🔍 Checking if user exists in Firebase Auth with email:",
          tempEmail
        );

        try {
          // Try to sign in to see if the user exists in Firebase Auth
          await signInWithEmailAndPassword(auth, tempEmail, walletAddress);
          console.log(
            "✅ User exists in Firebase Auth but missing wallet mapping"
          );

          // User exists in Firebase Auth but not in wallet mapping
          // This is a data inconsistency that needs to be fixed
          // For now, return null so the user can try to sign up again
          // The signup process will handle the "email already exists" error
          return null;
        } catch {
          console.log("❌ User doesn't exist in Firebase Auth either");
          return null;
        }
      }

      const walletData = walletDoc.data();
      const uid = walletData?.uid;

      if (!uid) {
        console.error("❌ No UID found in wallet document");
        return null;
      }

      // Get user data using the UID
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, "users", uid));
      } catch (error) {
        console.error("❌ Error reading user document:", error);
        return null;
      }

      if (!userDoc.exists()) {
        console.log("❌ User document not found for UID:", uid);
        return null;
      }

      const userData = userDoc.data() as UserData;
      console.log(
        "✅ User found:",
        userData.username,
        "Admin:",
        userData.admin
      );

      // Fix data inconsistency: Ensure username is properly set
      const fixedUserData = { ...userData };
      if (!userData.username && userData.email) {
        // Try to find username from usernames collection
        const username = await findUsernameByUID(uid);
        if (username) {
          fixedUserData.username = username;
          // Update user document with correct username
          try {
            await updateDoc(doc(db, "users", uid), {
              username: username
            });
            console.log("Fixed username mapping for user:", uid);
          } catch (updateError) {
            console.warn("Failed to update username in user document:", updateError);
          }
        }
      }

      // Cache the user data
      localStorage.setItem(cacheKey, JSON.stringify({
        userData: fixedUserData,
        timestamp: Date.now()
      }));

      return fixedUserData;
    } catch (error) {
      console.error("Error getting user by wallet:", error);
      return null;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = {
    user,
    userData,
    loading,
    login,
    signup,
    logout,
    checkUsernameAvailability,
    getUserByWallet,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
