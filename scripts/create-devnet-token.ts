/**
 * Script to create a test MKIN token on devnet for staking testing
 * Run: npx ts-node scripts/create-devnet-token.ts
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import * as fs from "fs";

async function createDevnetToken() {
  console.log("🚀 Creating test MKIN token on devnet...\n");

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load or create keypair
  let payer: Keypair;
  const keypairPath = "./devnet-keypair.json";

  if (fs.existsSync(keypairPath)) {
    console.log("📂 Loading existing keypair...");
    const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
  } else {
    console.log("🔑 Generating new keypair...");
    payer = Keypair.generate();
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(payer.secretKey)));
    console.log("💾 Keypair saved to:", keypairPath);
  }

  console.log("👛 Wallet:", payer.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log("💰 Balance:", balance / 1e9, "SOL\n");

  if (balance < 0.1 * 1e9) {
    console.log("⚠️  Low balance! Get devnet SOL from:");
    console.log("   https://faucet.solana.com");
    console.log("   or run: solana airdrop 2", payer.publicKey.toString(), "--url devnet\n");
    return;
  }

  // Create mint
  console.log("🪙 Creating token mint...");
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    payer.publicKey, // freeze authority
    9 // decimals (same as mainnet MKIN)
  );

  console.log("✅ Token mint created:", mint.toString());

  // Create token account
  console.log("\n📦 Creating token account...");
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log("✅ Token account:", tokenAccount.address.toString());

  // Mint some tokens for testing
  console.log("\n💵 Minting 1,000,000 test MKIN...");
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer.publicKey,
    1_000_000 * 1e9 // 1 million tokens
  );

  console.log("✅ Tokens minted!");

  // Save info
  const info = {
    network: "devnet",
    mintAddress: mint.toString(),
    tokenAccount: tokenAccount.address.toString(),
    mintAuthority: payer.publicKey.toString(),
    decimals: 9,
    supply: 1_000_000,
  };

  fs.writeFileSync("./devnet-token-info.json", JSON.stringify(info, null, 2));

  console.log("\n📄 Token info saved to: devnet-token-info.json");
  console.log("\n🎯 Next steps:");
  console.log("1. Update .env with: NEXT_PUBLIC_MKIN_TOKEN_MINT=" + mint.toString());
  console.log("2. Go to https://app.streamflow.finance (switch to devnet)");
  console.log("3. Create staking pool with this mint address");
}

createDevnetToken().catch(console.error);
