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
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  checkUsernameAvailability: async () => false,
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
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      throw new Error(errorMessage);
    }
  };

  const signup = async (email: string, password: string, username: string) => {
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
          createdAt: new Date(),
        };

        console.log("Saving user data to Firestore...");
        await setDoc(doc(db, "users", user.uid), userData);
        await setDoc(doc(db, "usernames", username.toLowerCase()), {
          uid: user.uid,
        });
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
          throw new Error(
            "This email is already registered. Please use a different email or try logging in."
          );
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
