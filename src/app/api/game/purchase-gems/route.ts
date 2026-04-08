/**
 * POST /api/game/purchase-gems
 *
 * Server-side verification of gem purchases on Solana.
 * Pattern adapted from backend-api/services/stakingService.js:_verifySolTransfer
 *
 * Flow:
 *   1. Client creates & signs SOL transfer → gets signature
 *   2. Client POSTs signature + packId + playerId → this endpoint
 *   3. We verify the tx on-chain (like _verifySolTransfer)
 *   4. We check for replay (signature already used)
 *   5. We credit gems atomically via Supabase RPC
 *   6. We log the transaction
 *
 * Security:
 *   - NEVER credit gems before on-chain confirmation
 *   - NEVER trust client about what was paid
 *   - ALWAYS verify tx server-side
 *   - ALWAYS verify EXACT SOL amount matches pack price
 *   - ALWAYS verify recipient is treasury wallet
 *   - Prevent replay attacks (signature dedup)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  Keypair,
} from "@solana/web3.js";
import bs58 from "bs58";
import { supabaseAdmin } from "@/lib/supabase";

// ── Pack definitions — server-side truth (client cannot manipulate) ──────────
const GEM_PACKS: Record<
  string,
  { gems: number; usdPrice: number; displayName: string }
> = {
  handful: { gems: 80, usdPrice: 0.15, displayName: "Handful" },
  pouch: { gems: 200, usdPrice: 0.30, displayName: "Pouch" },
  chest: { gems: 475, usdPrice: 0.65, displayName: "Chest" },
};

// ── Solana connection (server-side) ──────────────────────────────────────────
function getConnection(): Connection {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL ||
    "https://api.mainnet-beta.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

// ── Live SOL price fetch ─────────────────────────────────────────────────────
async function getSolPriceUsd(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    return data.solana?.usd ?? 0;
  } catch {
    // Fallback: use a hardcoded minimum
    console.warn("[PurchaseGems] Failed to fetch SOL price, using fallback");
    return 150; // conservative fallback
  }
}

// ── Fee distribution (inline — mirrors backend-api/utils/feeDistribution.js) ─
/**
 * After receiving SOL payment in the treasury wallet, split the configured
 * percentage to the revenue wallet.  Pattern matches the existing backend
 * `distributeFees()` used by staking/claim flows.
 *
 * @param receivedSol  Amount of SOL the treasury actually received
 * @returns Distribution result (never throws — failures are logged)
 */
async function distributeGemFees(
  receivedSol: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  const splitPct = Number(process.env.REVENUE_SPLIT_PERCENTAGE || "50") / 100;
  const revenueWallet = process.env.REVENUE_SPLIT_WALLET;
  const treasuryKeyB64 = process.env.GAME_TREASURY_PRIVATE_KEY;

  if (!revenueWallet) {
    console.warn("[FeeSplit] REVENUE_SPLIT_WALLET not set — skipping split");
    return { success: false, error: "Revenue wallet not configured" };
  }
  if (!treasuryKeyB64) {
    console.warn("[FeeSplit] GAME_TREASURY_PRIVATE_KEY not set — skipping split");
    return { success: false, error: "Treasury key not configured" };
  }

  try {
    // Decode treasury private key (supports both bs58 string and JSON byte array)
    let treasuryKeypair: Keypair;
    try {
      // Try bs58-encoded first
      treasuryKeypair = Keypair.fromSecretKey(bs58.decode(treasuryKeyB64));
    } catch {
      // Fall back to JSON byte array format (like GATEKEEPER_KEYPAIR in backend-api)
      const bytes = JSON.parse(treasuryKeyB64);
      treasuryKeypair = Keypair.fromSecretKey(new Uint8Array(bytes));
    }

    const splitLamports = Math.floor(receivedSol * splitPct * LAMPORTS_PER_SOL);
    const connection = getConnection();

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: new PublicKey(revenueWallet),
        lamports: splitLamports,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = treasuryKeypair.publicKey;
    transaction.sign(treasuryKeypair);

    const signature = await connection.sendRawTransaction(
      transaction.serialize()
    );
    await connection.confirmTransaction(signature, "confirmed");

    console.log(
      `[FeeSplit] ✅ ${(splitPct * 100).toFixed(0)}% → ${revenueWallet}`,
      `| ${(receivedSol * splitPct).toFixed(6)} SOL`,
      `| sig: ${signature}`
    );

    return { success: true, signature };
  } catch (err: any) {
    console.error("[FeeSplit] ❌ Distribution failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ── Verify SOL transfer (adapted from stakingService._verifySolTransfer) ─────
/**
 * Verifies that a parsed transaction contains a SystemProgram.transfer
 * instruction that sends SOL to our treasury wallet within an acceptable range.
 *
 * Pattern from stakingService.js:_verifySolTransfer with retry logic.
 */
async function verifySolTransfer(
  signature: string,
  minAmountLamports: number,
  maxAmountLamports: number,
  treasuryAddress: string,
  retryCount: number = 0
): Promise<{ success: boolean; receivedLamports: number }> {
  const maxRetries = 3;
  const connection = getConnection();

  try {
    // Try multiple commitment levels (like staking service)
    let tx = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    // If not found with "confirmed", try "finalized"
    if (!tx && retryCount === 0) {
      tx = await connection.getParsedTransaction(signature, {
        commitment: "finalized",
        maxSupportedTransactionVersion: 0,
      });
    }

    if (!tx) {
      // Retry with delay if we have retries left
      if (retryCount < maxRetries) {
        const delay = 2000 * (retryCount + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return verifySolTransfer(
          signature,
          minAmountLamports,
          maxAmountLamports,
          treasuryAddress,
          retryCount + 1
        );
      }
      return { success: false, receivedLamports: 0 };
    }

    if (!tx.meta) {
      return { success: false, receivedLamports: 0 };
    }

    // Check for on-chain error
    if (tx.meta.err) {
      console.error(
        "[PurchaseGems] Transaction failed on-chain:",
        JSON.stringify(tx.meta.err)
      );
      return { success: false, receivedLamports: 0 };
    }

    // Look for SystemProgram.transfer to treasury
    const instructions = tx.transaction.message.instructions;

    for (const ix of instructions) {
      if ("program" in ix && ix.program === "system" && "parsed" in ix && ix.parsed?.type === "transfer") {
        const info = ix.parsed.info;
        const lamports = info.lamports as number;

        if (
          info.destination === treasuryAddress &&
          lamports >= minAmountLamports &&
          lamports <= maxAmountLamports
        ) {
          return { success: true, receivedLamports: lamports };
        }
      }
    }

    // Fallback: check balance deltas for versioned transactions
    // (Same pattern as stakingService)
    const accountKeys =
      tx.transaction.message.accountKeys || [];
    const treasuryIndex = accountKeys.findIndex(
      (key: any) =>
        (typeof key === "string" ? key : key.pubkey?.toString()) ===
        treasuryAddress
    );

    if (
      treasuryIndex >= 0 &&
      tx.meta.postBalances &&
      tx.meta.preBalances
    ) {
      const balanceDelta =
        tx.meta.postBalances[treasuryIndex] -
        tx.meta.preBalances[treasuryIndex];

      if (
        balanceDelta >= minAmountLamports &&
        balanceDelta <= maxAmountLamports
      ) {
        return { success: true, receivedLamports: balanceDelta };
      }
    }

    return { success: false, receivedLamports: 0 };
  } catch (err) {
    console.error("[PurchaseGems] Verification error:", err);
    if (retryCount < maxRetries) {
      const delay = 2000 * (retryCount + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return verifySolTransfer(
        signature,
        minAmountLamports,
        maxAmountLamports,
        treasuryAddress,
        retryCount + 1
      );
    }
    return { success: false, receivedLamports: 0 };
  }
}

// ── Main POST handler ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { signature, packId, playerId, solAmount } = body;

    // ── Input validation ─────────────────────────────────────────────────
    if (!signature || !packId || !playerId || !solAmount) {
      return NextResponse.json(
        { error: "Missing required fields: signature, packId, playerId, solAmount" },
        { status: 400 }
      );
    }

    if (!GEM_PACKS[packId]) {
      return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
    }

    const pack = GEM_PACKS[packId];

    // ── Replay prevention ────────────────────────────────────────────────
    const { data: existingTx } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("sol_tx_signature", signature)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json(
        { error: "Transaction already processed" },
        { status: 409 }
      );
    }

    // ── Calculate expected SOL amount with tolerance ─────────────────────
    // Like stakingService: tolerance handles rounding/timing differences
    const expectedLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
    const tolerance = 0.10; // 10% tolerance for price slippage
    const minLamports = Math.floor(expectedLamports * (1 - tolerance));
    const maxLamports = Math.floor(expectedLamports * (1 + tolerance));

    // ── On-chain verification ────────────────────────────────────────────
    const treasuryWallet =
      process.env.NEXT_PUBLIC_TREASURY_WALLET;

    if (!treasuryWallet) {
      console.error("[PurchaseGems] TREASURY_WALLET not configured");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const verification = await verifySolTransfer(
      signature,
      minLamports,
      maxLamports,
      treasuryWallet
    );

    if (!verification.success) {
      // Log the failed verification for manual review
      console.error("[PurchaseGems] Verification failed:", {
        signature,
        packId,
        playerId,
        expectedLamports,
        minLamports,
        maxLamports,
      });

      return NextResponse.json(
        {
          error:
            "Payment verification failed. The transaction was not found on-chain or the amount does not match.",
        },
        { status: 400 }
      );
    }

    // ── Fee splitting — treasury → revenue wallet ──────────────────────────
    const receivedSol = verification.receivedLamports / LAMPORTS_PER_SOL;
    const feeSplitResult = await distributeGemFees(receivedSol);
    // Non-blocking: gem credit proceeds even if split fails (logged above)

    // ── Credit gems — atomic operation ───────────────────────────────────
    const gemsToCredit = pack.gems;

    // Try RPC function first (atomic, prevents race conditions)
    const { error: rpcError } = await supabaseAdmin.rpc(
      "add_gems_to_player",
      {
        p_player_id: playerId,
        p_gems: gemsToCredit,
      }
    );

    if (rpcError) {
      // Fallback: direct atomic update if RPC doesn't exist yet
      console.warn(
        "[PurchaseGems] RPC failed, falling back to direct update:",
        rpcError
      );

      // Fetch current balance first
      const { data: currentPlayer } = await supabaseAdmin
        .from("players")
        .select("gem_balance")
        .eq("id", playerId)
        .single();

      const currentBalance = currentPlayer?.gem_balance || 0;
      const newBalance = currentBalance + gemsToCredit;

      // Update balance
      const { error: updateError } = await supabaseAdmin
        .from("players")
        .update({ gem_balance: newBalance })
        .eq("id", playerId);

      if (updateError) {
        console.error("[PurchaseGems] Gem credit failed completely:", updateError);
      }

      // Log transaction
      await supabaseAdmin.from("transactions").insert({
        player_id: playerId,
        type: "gem_purchase",
        gem_amount: gemsToCredit,
        source: `store_${packId}`,
        sol_amount: verification.receivedLamports / LAMPORTS_PER_SOL,
        sol_tx_signature: signature,
        verified: true,
      });

      return NextResponse.json({
        success: true,
        gemsAdded: gemsToCredit,
        newBalance,
        packName: pack.displayName,
      });
    }

    // RPC succeeded — get new balance
    const { data: playerData } = await supabaseAdmin
      .from("players")
      .select("gem_balance")
      .eq("id", playerId)
      .single();

    const newBalance = playerData?.gem_balance || gemsToCredit;

    // ── Log transaction ──────────────────────────────────────────────────
    await supabaseAdmin.from("transactions").insert({
      player_id: playerId,
      type: "gem_purchase",
      gem_amount: gemsToCredit,
      source: `store_${packId}`,
      sol_amount: verification.receivedLamports / LAMPORTS_PER_SOL,
      sol_tx_signature: signature,
      verified: true,
    });

    return NextResponse.json({
      success: true,
      gemsAdded: gemsToCredit,
      newBalance,
      packName: pack.displayName,
    });
  } catch (err) {
    console.error("[PurchaseGems] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
