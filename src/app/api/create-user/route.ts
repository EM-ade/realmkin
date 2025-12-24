import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/config/firebaseAdmin";

// Firebase Admin SDK is initialized in firebaseAdmin.ts

export async function POST(request: NextRequest) {
  try {
    const { username, walletAddress } = await request.json() as { username: string; walletAddress: string };

    if (!username || !walletAddress) {
      return NextResponse.json(
        { error: "Missing username or walletAddress" },
        { status: 400 }
      );
    }

    // Validate username
    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const db = adminDb;

    // Check if username is already taken
    const usernameDocRef = db.collection("usernames").doc(username.toLowerCase());
    const usernameDoc = await usernameDocRef.get();
    if (usernameDoc.exists) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    // Normalize wallet address (store in lowercase for lookup, but keep original case for display)
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
      walletAddress, // Store in original case
      createdAt: new Date(),
      lastLogin: new Date(),
    });

    batch.set(db.collection("usernames").doc(username.toLowerCase()), { uid });
    batch.set(db.collection("wallets").doc(walletLower), { 
      uid,
      walletAddress, // Store in original case
      createdAt: new Date()
    });

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        uid,
        username,
        walletAddress, // Return original case wallet address
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
