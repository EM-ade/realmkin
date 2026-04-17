import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { NftStakingAPI } from "@/services/nftStaking";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { toast } from "react-hot-toast";
import environmentConfig from "@/config/environment";

const networkConfig = environmentConfig.networkConfig;

// Fee destination - gatekeeper wallet (where users send fees)
const FEE_DESTINATION = process.env.NEXT_PUBLIC_TREASURY_WALLET || "8w1dD5Von2GBTa9cVASeC2A9F3gRrCqHA7QPds5pfXsM";

// Helper: Get SOL price (uses multiple sources for reliability)
const getSolPrice = async (): Promise<number> => {
  const sources = [
    // Coingecko (works in browser)
    async () => {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const data = await response.json();
      return data.solana?.usd;
    },
    // Coincap
    async () => {
      const response = await fetch("https://api.coincap.io/v2/assets/solana");
      const data = await response.json();
      return data.data?.priceUsd ? parseFloat(data.data.priceUsd) : null;
    },
    // Fallback
    async () => 86.13, // Hardcoded fallback based on your provided price
  ];

  for (const source of sources) {
    try {
      const price = await source();
      if (price && price > 0) {
        console.log(`SOL price fetched: $${price}`);
        return price;
      }
    } catch (e) {
      continue;
    }
  }

  console.warn("Failed to fetch SOL price, using fallback $86.13");
  return 86.13;
};

// Helper: Pay SOL fee
const paySolFee = async (amountSol: number, destinationAddr: string, connection: any, publicKey: any, sendTransaction: any) => {
  console.log("📝 paySolFee called:", { amountSol, destinationAddr });
  
  if (!publicKey) throw new Error("Wallet not connected");
  if (!connection) throw new Error("Connection not available");

  try {
    // Get latest blockhash first
    const blockhash = await connection.getLatestBlockhash();
    
    // Create transfer instruction
    const transferIx = SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: new PublicKey(destinationAddr),
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    });
    
    // Create transaction with the instruction
    const transaction = new Transaction({
      feePayer: publicKey,
      recentBlockhash: blockhash.blockhash,
    }).add(transferIx);
    
    // Compile to ensure proper message
    const message = transaction.compileMessage();
    console.log("📝 Compiled message:", {
      feePayer: message.feePayer?.toString() || 'not set',
      instructions: message.instructions.length,
      accountKeysLength: message.accountKeys.length
    });

    console.log("📝 Sending to wallet...");
    
    // Send
    const signature = await sendTransaction(transaction, connection);
    console.log("📝 Signed, signature:", signature);
    
    // Confirm
    await connection.confirmTransaction(signature, "confirmed");
    console.log("📝 Confirmed!");
    
    return signature;
  } catch (e: any) {
    console.error("📝 paySolFee error:", e);
    if (e.message?.includes("User rejected") || e.message?.includes("Rejected")) {
      throw new Error("Transaction cancelled. Please approve the fee payment to stake.");
    }
    if (e.message?.includes("no balance changes")) {
      throw new Error("Phantom couldn't detect the transfer. Please try again.");
    }
    throw new Error(`Fee payment failed: ${e.message}`);
  }
};

export function useNftStaking() {
  console.log("🔧 useNftStaking initialized, checking wallet state...");
  const { isConnected, uid, isAuthenticating } = useWeb3();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  console.log("🔧 Wallet state:", { isConnected, hasConnection: !!connection, hasPublicKey: !!publicKey, hasSendTransaction: !!sendTransaction });

  const [poolStats, setPoolStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [walletNfts, setWalletNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Actions Loading States
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Fetch pool stats
  const fetchPoolStats = useCallback(async () => {
    try {
      const stats = await NftStakingAPI.getPoolStats();
      console.log("📡 Pool stats received:", stats);
      setPoolStats(stats);
      return stats;
    } catch (e) {
      console.error("Failed to fetch pool stats:", e);
      return null;
    }
  }, []);

  // Fetch user stats
  const fetchUserStats = useCallback(async () => {
    if (!isConnected || !uid || isAuthenticating) {
      return null;
    }
    try {
      const stats = await NftStakingAPI.getUserStats();
      setUserStats(stats);
      return stats;
    } catch (e) {
      console.error("Failed to fetch user stats:", e);
      return null;
    }
  }, [isConnected, uid, isAuthenticating]);

  // Fetch wallet NFTs
  const fetchWalletNfts = useCallback(async () => {
    if (!isConnected || !uid || isAuthenticating) {
      setWalletNfts([]);
      return [];
    }
    try {
      const { nfts } = await NftStakingAPI.getWalletNfts();
      setWalletNfts(nfts || []);
      return nfts || [];
    } catch (e) {
      console.error("Failed to fetch wallet NFTs:", e);
      setWalletNfts([]);
      return [];
    }
  }, [isConnected, uid, isAuthenticating]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [pool, user] = await Promise.all([
        fetchPoolStats(),
        fetchUserStats(),
      ]);
      await fetchWalletNfts();
      return { pool, user };
    } finally {
      setLoading(false);
    }
  }, [fetchPoolStats, fetchUserStats, fetchWalletNfts]);

  // Initial fetch
  useEffect(() => {
    if (isConnected && uid && !isAuthenticating) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [isConnected, uid, isAuthenticating, fetchAllData]);

  // Stake NFTs (with optional fee payment)
  const stakeNfts = useCallback(async (nftMints: string[], feeSignature?: string, payFee: boolean = false) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return { success: false, error: "Wallet not connected" };
    }
    if (isStaking) {
      return { success: false, error: "Already staking" };
    }

    setIsStaking(true);
    try {
      let finalFeeSignature = feeSignature;

      // If payFee is true, pay the fee first
      if (payFee) {
        console.log("🔄 Fee payment requested:", { 
          hasConnection: !!connection, 
          hasPublicKey: !!publicKey, 
          hasSendTransaction: !!sendTransaction,
          connectionType: typeof connection,
          sendTransactionType: typeof sendTransaction
        });
        
        if (!connection || !publicKey || !sendTransaction) {
          toast.error("Wallet not ready for fee payment");
          setIsStaking(false);
          return { success: false, error: "Wallet not ready" };
        }
        
        const solPrice = await getSolPrice();
        console.log("💰 SOL price:", solPrice);
        const feePerNft = 0.30; // $0.30 per NFT
        const totalFeeUsd = nftMints.length * feePerNft;
        const feeInSol = totalFeeUsd / solPrice;
        console.log("💸 Fee calculation:", { totalFeeUsd, feeInSol, nftCount: nftMints.length });

        // Validate fee amount
        const minFeeLamports = 5000; // Minimum 0.000005 SOL
        const feeLamports = Math.round(feeInSol * LAMPORTS_PER_SOL);
        
        if (feeLamports < minFeeLamports) {
          toast.error("Fee amount too small to send");
          setIsStaking(false);
          return { success: false, error: "Fee calculation error" };
        }
        
        console.log("💸 Fee in lamports:", feeLamports);

        toast(`Paying ${feeInSol.toFixed(6)} SOL (${feeLamports} lamports) fee...`);
        
        try {
          finalFeeSignature = await paySolFee(feeInSol, FEE_DESTINATION, connection, publicKey, sendTransaction);
          toast.success("Fee paid! Processing stake...");
        } catch (feeError: any) {
          toast.error(feeError.message || "Fee payment failed");
          setIsStaking(false);
          return { success: false, error: feeError.message };
        }
      }

      const result = await NftStakingAPI.stakeNfts(nftMints, finalFeeSignature || "fee_disabled");
      toast.success(`Staked ${result.staked.length} NFT(s)!`);
      await fetchAllData(); // Refresh data
      return result;
    } catch (e: any) {
      console.error("Stake failed:", e);
      toast.error(e.message || "Failed to stake NFTs");
      return { success: false, error: e.message };
    } finally {
      setIsStaking(false);
    }
  }, [isConnected, isStaking, fetchAllData]);

  // Unstake NFT
  const unstakeNft = useCallback(async (nftMint: string) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return { success: false, error: "Wallet not connected" };
    }
    if (isUnstaking) {
      return { success: false, error: "Already unstaking" };
    }

    setIsUnstaking(true);
    try {
      const result = await NftStakingAPI.unstakeNft(nftMint);
      if (result.status === "forfeited") {
        toast("Early unstake - reward forfeited", { icon: "⚠️" });
      } else {
        toast.success("NFT unstaked! Reward is now claimable.");
      }
      await fetchAllData(); // Refresh data
      return result;
    } catch (e: any) {
      console.error("Unstake failed:", e);
      toast.error(e.message || "Failed to unstake NFT");
      return { success: false, error: e.message };
    } finally {
      setIsUnstaking(false);
    }
  }, [isConnected, isUnstaking, fetchAllData]);

  // Claim rewards
  const claimRewards = useCallback(async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return { success: false, error: "Wallet not connected" };
    }
    if (isClaiming) {
      return { success: false, error: "Already claiming" };
    }

    setIsClaiming(true);
    try {
      console.log("📝 Calling claimRewards API...");
      const result = await NftStakingAPI.claimRewards();
      console.log("📝 Claim result:", result);
      
      if (result.claimed > 0) {
        toast.success(`Claimed ${result.claimed} $MKIN!${result.txSignature ? ` TX: ${result.txSignature.slice(0,8)}...` : ''}`);
      } else {
        toast("No rewards to claim");
      }
      await fetchAllData(); // Refresh data
      return result;
    } catch (e: any) {
      console.error("Claim failed:", e);
      toast.error(e.message || "Failed to claim rewards");
      return { success: false, error: e.message };
    } finally {
      setIsClaiming(false);
    }
  }, [isConnected, isClaiming, fetchAllData]);

  // Calculate fee
  const calculateFee = useCallback(async (nftCount: number) => {
    try {
      return await NftStakingAPI.calculateFee(nftCount);
    } catch (e) {
      console.error("Failed to calculate fee:", e);
      return null;
    }
  }, []);

  return {
    // Data
    poolStats,
    userStats,
    walletNfts,
    loading,
    
    // Actions
    stakeNfts,
    unstakeNft,
    claimRewards,
    calculateFee,
    refresh: fetchAllData,
    
    // Loading states
    isStaking,
    isUnstaking,
    isClaiming,
    
    // Computed
    stakedNfts: userStats?.stakedNfts || [],
    claimableNfts: userStats?.claimableNfts || [],
    totalClaimable: userStats?.totalClaimable || 0,
    totalEstimatedReward: userStats?.totalEstimatedReward || 0,
    currentRewardRate: userStats?.currentRewardRate || 0,
    tokenPerNft: poolStats?.currentRewardPerNft || 0,
  };
}

export default useNftStaking;