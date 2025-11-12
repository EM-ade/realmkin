import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";

// Initialize Firebase Admin SDK
if (!getApps().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : undefined;

  if (serviceAccountJson) {
    initializeApp({
      credential: cert(serviceAccountJson),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else {
    // Local dev / emulator: credential not required
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, walletAddress } = await request.json() as { username: string; walletAddress: string };

    if (!username || !walletAddress) {
      return NextResponse.json(
        { error: "Missing username or walletAddress" },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const db = getFirestore();

    // Validate username
    const usernameDocRef = db.collection("usernames").doc(username.toLowerCase());
    const usernameDoc = await usernameDocRef.get();
    if (usernameDoc.exists) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    // Normalize wallet address
    const walletLower = walletAddress.toLowerCase();
    
    // Use wallet address as UID (consistent identifier)
    const uid = walletLower;

    try {
      // Try to get existing user first
      await auth.getUser(uid);
      console.log(`Found existing auth user: ${uid}`);
    } catch (error) {
      const authError = error as { code?: string };
      if (authError.code === 'auth/user-not-found') {
        // Create user with Admin SDK (bypasses security rules)
        await auth.createUser({
          uid,
          email: `${walletLower}@wallet.realmkin.com`,
          password: walletAddress, // temporary password
        });
        console.log(`Created new auth user: ${uid}`);
      } else {
        throw error;
      }
    }

    // Create user documents in Firestore (Admin SDK bypasses rules)
    const batch = db.batch();
    
    batch.set(db.collection("users").doc(uid), {
      username,
      walletAddress: walletLower,
      createdAt: new Date(),
      lastLogin: new Date(),
    });

    batch.set(db.collection("usernames").doc(username.toLowerCase()), { uid });
    batch.set(db.collection("wallets").doc(walletLower), { uid });

    await batch.commit();

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
