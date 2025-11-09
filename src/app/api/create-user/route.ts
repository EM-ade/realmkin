import { NextRequest, NextResponse } from "next/server";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";

export async function POST(request: NextRequest) {
  try {
    const { username, walletAddress } = await request.json();

    if (!username || !walletAddress) {
      return NextResponse.json(
        { error: "Missing username or walletAddress" },
        { status: 400 }
      );
    }

    // Validate username
    const usernameDocRef = doc(db, "usernames", username.toLowerCase());
    const usernameDoc = await getDoc(usernameDocRef);
    if (usernameDoc.exists()) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    // Normalize wallet address
    const walletLower = walletAddress.toLowerCase();

    // Create or retrieve Firebase Auth user
    const auth = getAuth();
    const tempEmail = `${walletLower}@wallet.realmkin.com`;
    const tempPassword = walletAddress;
    let uid: string;

    try {
      // Try to sign in first to see if the user already exists
      const userCredential = await signInWithEmailAndPassword(auth, tempEmail, tempPassword);
      uid = userCredential.user.uid;
      console.log(`Found existing auth user: ${uid}`);
    } catch (error: unknown) {
      const authError = error as { code?: string };
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
        // If user doesn't exist, create them
        const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
        uid = userCredential.user.uid;
        console.log(`Created new auth user: ${uid}`);
      } else {
        // Re-throw other auth errors
        throw error;
      }
    }

    // Create user documents in Firestore
    const userDocRef = doc(db, "users", uid);
    const walletDocRef = doc(db, "wallets", walletLower);

    await setDoc(userDocRef, {
      username,
      walletAddress: walletLower,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    await setDoc(usernameDocRef, { uid });
    await setDoc(walletDocRef, { uid });

    return NextResponse.json(
      {
        success: true,
        uid,
        username,
        message: "User created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
