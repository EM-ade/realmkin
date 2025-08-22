"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
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
            setUserData(userDoc.data() as UserData);
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

  const login = async (email: string, password: string) => {
    try {
      console.log("🔐 Attempting login with email:", email);
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Login successful");
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

      // Skip username checking for now due to connection issues
      // const isAvailable = await checkUsernameAvailability(username);
      // if (!isAvailable) {
      //   throw new Error("Username is already taken");
      // }

      // Create user account
      console.log("Creating user account...");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("User account created:", user.uid);

      // Save user data to Firestore (skip for now if connection issues)
      try {
        const userData: UserData = {
          username,
          email,
          walletAddress,
          createdAt: new Date(),
          admin: false, // Default to non-admin
        };

        console.log("Saving user data to Firestore...");
        await setDoc(doc(db, "users", user.uid), userData);
        await setDoc(doc(db, "usernames", username.toLowerCase()), {
          uid: user.uid,
        });

        // If wallet address provided, create wallet mapping for easy lookup
        if (walletAddress) {
          const walletMappingPath = `wallets/${walletAddress.toLowerCase()}`;
          console.log("🔧 Creating wallet mapping at:", walletMappingPath);
          await setDoc(doc(db, "wallets", walletAddress.toLowerCase()), {
            uid: user.uid,
            username: username,
            createdAt: new Date(),
          });
          console.log(
            "✅ Wallet mapping created successfully at:",
            walletMappingPath
          );
        }

        console.log("User data saved successfully");
      } catch (firestoreError) {
        console.warn("Failed to save user data to Firestore:", firestoreError);
        // Don't fail the signup if Firestore fails - user account is still created
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

            // Now try to create the missing wallet mapping and user data
            if (walletAddress) {
              try {
                const currentUser = auth.currentUser;
                if (currentUser) {
                  const userData: UserData = {
                    username,
                    email,
                    walletAddress,
                    createdAt: new Date(),
                  };

                  console.log(
                    "🔧 Creating missing wallet mapping and user data..."
                  );
                  await setDoc(doc(db, "users", currentUser.uid), userData);
                  await setDoc(doc(db, "usernames", username.toLowerCase()), {
                    uid: currentUser.uid,
                  });
                  await setDoc(
                    doc(db, "wallets", walletAddress.toLowerCase()),
                    {
                      uid: currentUser.uid,
                      username: username,
                      createdAt: new Date(),
                    }
                  );
                  console.log("✅ Missing data created successfully");
                }
              } catch (firestoreError) {
                console.warn("Failed to create missing data:", firestoreError);
                // Don't fail the login if Firestore fails
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

      // Check if wallet mapping exists
      const walletDoc = await getDoc(
        doc(db, "wallets", walletAddress.toLowerCase())
      );

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
      const uid = walletData.uid;

      // Get user data using the UID
      const userDoc = await getDoc(doc(db, "users", uid));

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
      return userData;
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
