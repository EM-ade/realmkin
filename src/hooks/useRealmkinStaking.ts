import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { StakingAPI } from "@/services/gatekeeperStaking";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
} from "@solana/spl-token";
import { toast } from "react-hot-toast";
import environmentConfig from "@/config/environment";

// Get network configuration
const networkConfig = environmentConfig.networkConfig;
const MKIN_MINT = new PublicKey(networkConfig.tokenMint);

export function useRealmkinStaking() {
  const { isConnected, uid, isAuthenticating } = useWeb3();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Actions Loading States
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false); // Used for Claim and Unstake fees

  // Fetch on-chain MKIN token balance
  const fetchWalletBalance = useCallback(async () => {
    if (!publicKey || !connection) {
      setWalletBalance(0);
      return;
    }
    try {
      const ata = await getAssociatedTokenAddress(MKIN_MINT, publicKey);
      const account = await getAccount(connection, ata);
      // Convert from raw (9 decimals) to display amount
      setWalletBalance(Number(account.amount) / 1e9);
    } catch (e) {
      // Token account doesn't exist (no balance)
      setWalletBalance(0);
    }
  }, [publicKey, connection]);

  const fetchData = useCallback(async () => {
    // Wait for authentication to complete before fetching
    if (!isConnected || !uid || isAuthenticating) {
      console.log("🔒 Skipping fetch - waiting for auth:", {
        isConnected,
        uid: uid ? 'exists' : 'null',
        isAuthenticating,
      });
      return;
    }
    setLoading(true);
    try {
      console.log("🎯 Fetching staking overview for UID:", uid);
      console.log("🌐 Using gatekeeper URL:", process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com");
      
      const res = await StakingAPI.getOverview();
      console.log("✅ Staking data received successfully:", res);
      setData(res);
    } catch (e: any) {
      console.error("❌ Staking overview fetch error:", {
        message: e.message,
        status: e.status,
        statusText: e.statusText,
        response: e.response,
        stack: e.stack
      });
      
      // Only show error if it's not an auth issue
      if (!e.message?.includes("Not authenticated")) {
        console.error("Failed to load staking data:", e.message);
      }
      setData(null);
      // Silent fail on poll to avoid spamming errors during auth
    } finally {
      setLoading(false);
    }
  }, [isConnected, uid, isAuthenticating]);

  useEffect(() => {
    if (isConnected && uid && !isAuthenticating) {
      fetchData();
      const interval = setInterval(fetchData, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [fetchData, isConnected, uid, isAuthenticating]);

  // Fetch wallet balance when wallet connects/changes
  useEffect(() => {
    fetchWalletBalance();
  }, [fetchWalletBalance]);

  // Helper: Fetch dynamic fee based on current SOL price
  const fetchDynamicFee = async (): Promise<number> => {
    try {
      // Fetch SOL price from multiple sources
      const response = await fetch(
        "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT"
      );
      const data = await response.json();
      const solPrice = parseFloat(data.price);

      if (isNaN(solPrice) || solPrice <= 0) {
        throw new Error("Invalid SOL price");
      }

      // Calculate SOL needed for $2 USD
      const targetUSD = 2.0;
      const feeInSol = targetUSD / solPrice;

      console.log(
        `💵 Dynamic fee: $${targetUSD} = ${feeInSol.toFixed(
          4
        )} SOL (SOL price: $${solPrice})`
      );

      return feeInSol;
    } catch (e) {
      console.warn("Failed to fetch dynamic fee, using fallback:", e);
      // Fallback: assume SOL = $150
      return 2.0 / 150; // ~0.0133 SOL
    }
  };

  // Helper: Pay Fee
  const paySolFee = async (amountSol: number, destinationAddr: string) => {
    if (!publicKey) throw new Error("Wallet not connected");

    try {
      const destPubkey = new PublicKey(destinationAddr);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: destPubkey,
          lamports: Math.round(amountSol * LAMPORTS_PER_SOL), // Ensure integer
        })
      );

      // Get latest blockhash
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      return signature;
    } catch (e: any) {
      console.error("Fee Payment Failed:", e);
      throw new Error(`Fee payment failed: ${e.message}`);
    }
  };

  const stake = async (amount: number) => {
    if (!data?.config?.stakingWalletAddress) {
      toast.error("Staking configuration loading...");
      return;
    }
    if (!publicKey) {
      toast.error("Wallet not connected");
      return;
    }

    setIsStaking(true);
    try {
      console.log("🎯 Starting stake process...");
      console.log("  Amount:", amount, "MKIN");
      console.log("  User wallet:", publicKey.toBase58());
      console.log("  Vault address:", data.config.stakingWalletAddress);

      // 1. Calculate 5% entry fee
      toast.loading("Calculating entry fee...", { id: "stake-fee" });
      const feeData = await StakingAPI.calculateFee(amount, 5);
      console.log(
        `💰 Entry fee: ${feeData.feeInSol.toFixed(6)} SOL (${
          feeData.feeInMkin
        } MKIN value at $${feeData.mkinPriceUsd})`
      );

      toast.loading(
        `Entry fee: ${feeData.feeInSol.toFixed(
          6
        )} SOL. Creating transaction...`,
        { id: "stake-fee" }
      );

      // 2. Get vault address and ATAs for token transfer
      const vaultAddress = new PublicKey(data.config.stakingWalletAddress);
      const userATA = await getAssociatedTokenAddress(MKIN_MINT, publicKey);
      const vaultATA = await getAssociatedTokenAddress(MKIN_MINT, vaultAddress);

      console.log("  Token Mint:", MKIN_MINT.toBase58());
      console.log("  User ATA:", userATA.toBase58());
      console.log("  Vault ATA:", vaultATA.toBase58());

      // Check if user token account exists
      try {
        const userTokenAccount = await getAccount(connection, userATA);
        const balance = Number(userTokenAccount.amount) / 1e9;
        console.log("  User token balance:", balance, "MKIN");

        if (balance < amount) {
          throw new Error(
            `Insufficient balance. You have ${balance.toFixed(
              2
            )} MKIN but trying to stake ${amount} MKIN`
          );
        }
      } catch (e: any) {
        if (e.message.includes("could not find account")) {
          throw new Error(
            "You don't have any MKIN tokens in your wallet. Token account doesn't exist."
          );
        }
        throw e;
      }

      // Check if vault token account exists (if not, we need to create it first)
      try {
        await getAccount(connection, vaultATA);
        console.log("  ✅ Vault token account exists");
      } catch (e: any) {
        if (e.message.includes("could not find account")) {
          throw new Error(
            "Vault token account doesn't exist yet. Please contact support to initialize the vault."
          );
        }
        throw e;
      }

      // 3. Create COMBINED transaction (SOL fee + MKIN tokens in ONE transaction)
      console.log("  Creating combined transaction...");
      const transaction = new Transaction()
        .add(
          // First: Pay entry fee in SOL
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: vaultAddress,
            lamports: Math.floor(feeData.feeInSol * LAMPORTS_PER_SOL),
          })
        )
        .add(
          // Second: Transfer MKIN tokens
          createTransferInstruction(
            userATA,
            vaultATA,
            publicKey,
            BigInt(Math.floor(amount * 1e9)) // 9 decimals
          )
        );

      // 3. Get latest blockhash
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = publicKey;

      console.log(
        "  Combined transaction ready, sending to wallet for approval..."
      );

      // 4. Send combined transaction (ONE signature for both!)
      toast.loading("Please approve transaction in wallet...", {
        id: "stake-fee",
      });
      const signature = await sendTransaction(transaction, connection);

      console.log("  ✅ Combined transaction sent! Signature:", signature);

      toast.loading("Confirming transaction...", { id: "stake-fee" });
      await connection.confirmTransaction(signature, "confirmed");

      console.log("  ✅ Transaction confirmed!");

      // 5. Register stake with backend (use same signature for both)
      toast.loading("Registering stake...", { id: "stake-fee" });
      await StakingAPI.stake(amount, signature, signature);

      console.log("  ✅ Stake registered with backend!");

      toast.success(
        `Successfully staked ${amount} MKIN! Entry fee: ${feeData.feeInSol.toFixed(
          6
        )} SOL`,
        { id: "stake-fee", duration: 5000 }
      );
      fetchData();
      fetchWalletBalance(); // Refresh wallet balance
    } catch (e: any) {
      console.error("❌ Stake failed:", e);
      console.error("  Error name:", e.name);
      console.error("  Error message:", e.message);

      // Dismiss any loading toasts
      toast.dismiss("stake-fee");

      // Handle specific error types
      let errorMessage = e.message;

      if (
        e.message?.includes("User rejected") ||
        e.message?.includes("User denied") ||
        e.name === "WalletSignTransactionError"
      ) {
        errorMessage = "Transaction cancelled";
        toast.error(errorMessage, { duration: 3000 });
      } else if (e.message?.includes("Insufficient")) {
        toast.error(errorMessage, { duration: 5000 });
      } else if (e.message?.includes("Unexpected error")) {
        errorMessage =
          "Transaction failed. Please check: 1) You have enough SOL for fees, 2) You have MKIN tokens, 3) Your wallet is unlocked.";
        toast.error(errorMessage, { duration: 5000 });
      } else {
        toast.error(errorMessage, { duration: 5000 });
      }
    } finally {
      setIsStaking(false);
    }
  };

  const claim = async () => {
    if (!data?.config?.stakingWalletAddress) {
      toast.error("Staking configuration loading...");
      return;
    }
    setIsClaiming(true);
    try {
      // Fetch dynamic fee (~$2 USD in SOL)
      toast.loading("Calculating fee...", { id: "claim-fee" });
      const feeAmount = await fetchDynamicFee();

      toast.loading(`Paying $2 fee (${feeAmount.toFixed(4)} SOL)...`, {
        id: "claim-fee",
      });
      const signature = await paySolFee(
        feeAmount,
        data.config.stakingWalletAddress
      );

      toast.loading("Claiming rewards...", { id: "claim-fee" });
      const res = await StakingAPI.claim(signature);

      toast.success(
        `Claimed ${res.amount.toFixed(4)} SOL! (Fee: ${feeAmount.toFixed(
          4
        )} SOL)`,
        { id: "claim-fee" }
      );
      fetchData();
    } catch (e: any) {
      toast.error(e.message, { id: "claim-fee" });
    } finally {
      setIsClaiming(false);
    }
  };

  const unstake = async (amount: number) => {
    if (!data?.config?.stakingWalletAddress) {
      toast.error("Staking configuration loading...");
      return;
    }
    setIsClaiming(true);
    try {
      // Fetch dynamic fee (~$2 USD in SOL)
      toast.loading("Calculating fee...", { id: "unstake-fee" });
      const feeAmount = await fetchDynamicFee();

      toast.loading(`Paying $2 fee (${feeAmount.toFixed(4)} SOL)...`, {
        id: "unstake-fee",
      });
      const signature = await paySolFee(
        feeAmount,
        data.config.stakingWalletAddress
      );

      toast.loading("Unstaking tokens...", { id: "unstake-fee" });
      await StakingAPI.unstake(amount, signature);

      toast.success(
        `Unstaked ${amount} MKIN! (Fee: ${feeAmount.toFixed(4)} SOL)`,
        { id: "unstake-fee" }
      );
      fetchData();
      fetchWalletBalance(); // Refresh wallet balance
    } catch (e: any) {
      toast.error(e.message, { id: "unstake-fee" });
    } finally {
      setIsClaiming(false);
    }
  };

  return {
    data, // Full response from backend
    user: data?.user,
    pool: data?.pool,
    config: data?.config,
    isRewardsPaused: data?.config?.isRewardsPaused ?? false,
    walletBalance, // On-chain MKIN token balance
    loading: loading && !data, // Only initial load
    isStaking,
    isClaiming,
    stake,
    claim,
    unstake,
    refresh: fetchData,
    refreshWalletBalance: fetchWalletBalance,
    refreshBoosters: async () => {
      if (!isConnected || !uid) return;
      try {
        await StakingAPI.refreshBoosters();
        await fetchData();
        toast.success("Boosters refreshed successfully");
      } catch (error: any) {
        toast.error("Failed to refresh boosters");
        console.error("Booster refresh error:", error);
      }
    },
  };
}
