import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";

export async function GET() {
  try {
    // Get environment variables
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
    const mintAddress = process.env.NEXT_PUBLIC_MINT_ADDRESS;

    if (!treasuryPrivateKey) {
      return NextResponse.json(
        { error: "Treasury private key not configured" },
        { status: 500 }
      );
    }

    if (!mintAddress) {
      return NextResponse.json(
        { error: "Token mint address not configured" },
        { status: 500 }
      );
    }

    // Initialize connection and treasury keypair
    const connection = new Connection(rpcUrl, "confirmed");
    const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(treasuryPrivateKey));
    const treasuryPublicKey = treasuryKeypair.publicKey;

    // Get SOL balance
    const solBalance = await connection.getBalance(treasuryPublicKey);

    // Get token balance
    const mintPubkey = new PublicKey(mintAddress);
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      treasuryPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    let tokenBalance = 0;
    try {
      const tokenAccountInfo = await connection.getTokenAccountBalance(treasuryTokenAccount);
      tokenBalance = parseFloat(tokenAccountInfo.value.amount) / Math.pow(10, tokenAccountInfo.value.decimals);
    } catch {
      console.log("Token account doesn't exist or has no balance");
    }

    // Check if balance is sufficient
    const isHealthy = solBalance >= 10000000; // At least 0.01 SOL for fees

    return NextResponse.json({
      treasury: {
        address: treasuryPublicKey.toBase58(),
        solBalance: solBalance / 1e9,
        tokenBalance: tokenBalance,
        tokenAccount: treasuryTokenAccount.toBase58(),
        isHealthy: isHealthy,
        message: isHealthy 
          ? "Treasury is operational" 
          : `Treasury needs funding! Send at least 0.01 SOL to ${treasuryPublicKey.toBase58()}`,
        network: rpcUrl.includes("devnet") ? "devnet" : rpcUrl.includes("mainnet") ? "mainnet-beta" : "custom"
      }
    });
  } catch (error) {
    console.error("Error checking treasury status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check treasury status" },
      { status: 500 }
    );
  }
}
