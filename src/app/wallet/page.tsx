"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { formatAddress } from "@/utils/formatAddress";
import NFTCard from "@/components/NFTCard";
import MobileMenuOverlay from "@/components/MobileMenuOverlay";
import { useNFT } from "@/contexts/NFTContext";
import { NFTMetadata, nftService } from "@/services/nftService";
import { getAuth } from "firebase/auth";
import {
  rewardsService,
  UserRewards,
  RewardsCalculation,
} from "@/services/rewardsService";
import { useAutoClaim } from "@/hooks/useAutoClaim";
import { useIsMobile } from "@/hooks/useIsMobile";
import SocialLinks from "@/components/SocialLinks";
import RewardsDashboard from "@/components/RewardsDashboard";
import WithdrawalConfirmationModal from "@/components/WithdrawalConfirmationModal";
import TransferConfirmationModal from "@/components/TransferConfirmationModal";
import QuickStartGuide from "@/components/QuickStartGuide";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { claimTokens, ClaimResponse } from "@/services/backendClaimService";

// Lazy load background effects for better performance
const EtherealParticles = dynamic(
  () =>
    import("@/components/MagicalAnimations").then(
      (mod) => mod.EtherealParticles,
    ),
  { ssr: false },
);
const ConstellationBackground = dynamic(
  () =>
    import("@/components/MagicalAnimations").then(
      (mod) => mod.ConstellationBackground,
    ),
  { ssr: false },
);

export default function WalletPage() {
  const { user, userData, getUserByWallet } = useAuth();
  const {
    account,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
  } = useWeb3();
  const isMobile = useIsMobile();

  // Discord link status
  const [discordLinked, setDiscordLinked] = useState<boolean>(false);
  const gatekeeperBase =
    process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [discordUnlinking, setDiscordUnlinking] = useState(false);
  const [showDiscordMenu, setShowDiscordMenu] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);

  // Rewards state
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
  const [rewardsCalculation, setRewardsCalculation] =
    useState<RewardsCalculation | null>(null);
  const [showRewardsDashboard, setShowRewardsDashboard] = useState(false);
  const [showWithdrawalConfirmation, setShowWithdrawalConfirmation] =
    useState(false);
  const [lastClaimAmount, setLastClaimAmount] = useState<number>(0);
  const [lastClaimWallet, setLastClaimWallet] = useState<string>("");

  const walletDisplayValue = useMemo(() => {
    return userRewards ? userRewards.totalRealmkin : 0;
  }, [userRewards]);

  const mobileMenuItems = useMemo(
    () => [
      { label: "Home", href: "/", icon: "/dashboard.png" },
      { label: "Wallet", href: "/wallet", icon: "/wallet.png" },
      { label: "Staking", href: "/staking", icon: "/staking.png" },
      {
        label: "Marketplace",
        href: "/marketplace",
        icon: "/marketplace_logo.png",
      },
      { label: "Game", href: "/game", icon: "/game.png" },
      { label: "My NFT", href: "/my-nft", icon: "/flex-model.png" },
      { label: "Merches", href: "/merches", icon: "/merches.png" },
    ],
    [],
  );

  const handleDiscordConnect = useCallback(() => {
    if (discordLinked || discordConnecting) return;
    setDiscordConnecting(true);
    if (typeof window !== "undefined") {
      window.location.assign("/api/discord/login");
    }
  }, [discordLinked, discordConnecting]);

  const handleDiscordDisconnect = useCallback(async (): Promise<boolean> => {
    if (discordUnlinking) return false;
    try {
      setDiscordUnlinking(true);
      const auth = getAuth();
      if (!auth.currentUser) {
        return false;
      }
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${gatekeeperBase}/api/link/discord`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      setDiscordLinked(false);
      setShowDiscordMenu(false);
      setShowMobileActions(false);
      try {
        localStorage.removeItem("realmkin_discord_linked");
      } catch {}
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setDiscordUnlinking(false);
    }
  }, [discordUnlinking, gatekeeperBase]);

  // Removed duplicate click handler - MobileMenuOverlay handles click outside

  // Keep body scroll handler for wallet page
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (showMobileActions) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showMobileActions]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileActions(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!discordLinked) {
      setShowDiscordMenu(false);
    }
  }, [discordLinked]);

  useEffect(() => {
    if (!isConnected) {
      setShowMobileActions(false);
    }
  }, [isConnected]);

  // Initialize auto-claiming
  useAutoClaim();

  // Claim state
  const [showMiningRateDetails, setShowMiningRateDetails] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Test mode state (only available in development)
  const isDevelopment = process.env.NODE_ENV === "development";
  const [testMode, setTestMode] = useState(false);
  const [reloadingConfigs, setReloadingConfigs] = useState(false);
  
  // Admin test mode - input any wallet for testing rewards
  const [adminTestMode, setAdminTestMode] = useState(false);
  const [testWalletAddress, setTestWalletAddress] = useState("");
  
  // Use test wallet when admin test mode is enabled
  const effectiveAccount = adminTestMode && testWalletAddress ? testWalletAddress : account;

  // NFT state
  const [nfts, setNfts] = useState<NFTMetadata[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Transfer state
  const [transferRecipient, setTransferRecipient] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [showTransferConfirmation, setShowTransferConfirmation] =
    useState(false);
  const [lastTransferAmount, setLastTransferAmount] = useState<number>(0);
  const [lastTransferRecipient, setLastTransferRecipient] =
    useState<string>("");

  // Transaction history state
  const [transactionHistory, setTransactionHistory] = useState<
    Array<{
      type: "claim" | "withdraw" | "transfer";
      amount: number;
      description: string;
      date: Date;
    }>
  >([]);

  // Test NFT for GZv3n contract (only in development)
  const TEST_NFT = useMemo(
    (): NFTMetadata => ({
      id: "test-ezjhz-001",
      name: "Test NFT - Realmkin Mass Mint",
      description: "Test NFT from EzjhzaTBqXohJTsaMKFSX6fgXcDJyXAV85NK7RK79u3Z",
      image: "/realmkin-1.webp",
      contractAddress: "EzjhzaTBqXohJTsaMKFSX6fgXcDJyXAV85NK7RK79u3Z",
      tokenId: "TEST001",
      rarity: "LEGENDARY",
      power: 1000,
      attributes: [
        { trait_type: "Class", value: "Test" },
        { trait_type: "Contract", value: "Realmkin Mass Mint" },
        { trait_type: "Purpose", value: "Rewards Testing" },
      ],
    }),
    [],
  );

  const fetchUserNFTs = useCallback(async () => {
    if (!effectiveAccount || !user) return;

    setNftLoading(true);
    setNftError(null);

    try {
      // Fetch from both standard and premium contracts
      const nftCollection = await nftService.fetchAllContractNFTs(effectiveAccount);

      // Add test NFT if test mode is enabled (only in development)
      const allNFTs =
        isDevelopment && testMode
          ? [...nftCollection.nfts, TEST_NFT]
          : nftCollection.nfts;

      setNfts(allNFTs);

      // Initialize/update rewards based on NFT count and contract types
      if (user) {
        try {
          const rewards = await rewardsService.initializeUserRewards(
            user.uid,
            effectiveAccount,
            allNFTs.length,
            allNFTs,
          );
          setUserRewards(rewards);

          // Calculate current pending rewards with contract-aware calculation
          const calculation = rewardsService.calculatePendingRewards(
            rewards,
            allNFTs.length,
          );
          setRewardsCalculation(calculation);
        } catch (error) {
          console.error("Error initializing rewards:", error);
        }
      }

      if (allNFTs.length === 0) {
        setNftError("No Realmkin NFTs found in this wallet");
      }
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      setNftError("Failed to load NFTs. Please try again.");
    } finally {
      setNftLoading(false);
    }
  }, [effectiveAccount, user, testMode, isDevelopment, TEST_NFT]);

  // Reload contract configs handler
  const handleReloadConfigs = useCallback(async () => {
    if (!user || !effectiveAccount) return;

    setReloadingConfigs(true);
    try {
      console.log("🔄 Manually reloading contract configs...");
      await rewardsService.reloadContractConfigs();
      // Refetch NFTs to trigger recalculation
      await fetchUserNFTs();
      console.log("✅ Configs reloaded and rewards recalculated");
    } catch (error) {
      console.error("Error reloading configs:", error);
    } finally {
      setReloadingConfigs(false);
    }
  }, [user, effectiveAccount, fetchUserNFTs]);

  // Removed unified balance fetching

  // Handle withdrawal (fee-based claiming to wallet)
  const handleWithdraw = useCallback(async () => {
    if (!user || !effectiveAccount) return;

    const totalClaimable = userRewards?.totalRealmkin || 0;
    const MIN_WITHDRAWAL = 1000;
    
    // Parse withdrawal amount or use total claimable if empty
    const requestedAmount = withdrawAmount && withdrawAmount.trim() !== "" 
      ? parseFloat(withdrawAmount) 
      : totalClaimable;
    
    // Validate withdrawal amount
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      setWithdrawError("Please enter a valid withdrawal amount");
      return;
    }
    
    if (requestedAmount < MIN_WITHDRAWAL) {
      setWithdrawError(`Minimum withdrawal is ${MIN_WITHDRAWAL.toLocaleString()} MKIN`);
      return;
    }
    
    if (requestedAmount > totalClaimable) {
      setWithdrawError(`Cannot withdraw more than available balance (${totalClaimable.toLocaleString()} MKIN)`);
      return;
    }

    setWithdrawLoading(true);
    setWithdrawError(null);

    // Debug logging
    console.log("=== WITHDRAWAL DEBUG ===");
    console.log("Withdraw Amount State:", withdrawAmount);
    console.log("Total Claimable:", totalClaimable);
    console.log("Requested Amount:", requestedAmount);
    console.log("========================");

    try {
      // Step 1: Initiate withdrawal - get fee transaction
      const { initiateWithdrawal, completeWithdrawal, deserializeTransaction } = await import("@/services/withdrawService");
      
      const initiateResult = await initiateWithdrawal(requestedAmount, effectiveAccount);

      if (!initiateResult.success || !initiateResult.feeTransaction) {
        setWithdrawError(initiateResult.error || "Failed to initiate withdrawal");
        return;
      }

      console.log(`Fee: $${initiateResult.feeAmountUsd} (${initiateResult.feeAmountSol?.toFixed(6)} SOL)`);

      // Step 2: Get user's wallet to sign transaction
      if (!window.solana || !window.solana.isPhantom) {
        setWithdrawError("Phantom wallet not found. Please install Phantom wallet.");
        return;
      }

      // Deserialize the transaction
      const transaction = deserializeTransaction(initiateResult.feeTransaction);
      
      console.log("Transaction deserialized:", {
        signatures: transaction.signatures.length,
        instructions: transaction.instructions.length,
        recentBlockhash: transaction.recentBlockhash,
        feePayer: transaction.feePayer?.toBase58()
      });

      // Create a connection to send the transaction
      const { Connection } = await import("@solana/web3.js");
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");

      // Get a fresh blockhash before signing (blockhashes expire after ~60 seconds)
      console.log("Getting fresh blockhash...");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      
      console.log("Fresh blockhash:", blockhash.substring(0, 10) + "...");

      // Sign the transaction with Phantom
      console.log("Requesting wallet to sign transaction...");
      const signedTransaction = await window.solana.signTransaction(transaction);
      console.log("Transaction signed successfully");

      // Send the signed transaction
      console.log("Sending transaction to network...");
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      
      console.log(`Fee transaction sent: ${signature}`);

      // Wait for transaction to confirm (devnet can be slow)
      console.log("Waiting for transaction confirmation...");
      try {
        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, "confirmed");
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        console.log("Transaction confirmed on-chain!");
      } catch (confirmError) {
        console.error("Confirmation error:", confirmError);
        throw new Error(`Transaction confirmation failed: ${confirmError instanceof Error ? confirmError.message : 'Unknown error'}`);
      }
      
      // Additional wait to ensure backend can fetch it
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Complete withdrawal with fee signature
      console.log("Completing withdrawal with backend...");
      const completeResult = await completeWithdrawal(signature, requestedAmount, effectiveAccount);
      
      console.log("Complete withdrawal result:", completeResult);

      if (completeResult.success) {
        // Show withdrawal confirmation
        setLastClaimAmount(requestedAmount);
        setLastClaimWallet(effectiveAccount);
        setShowWithdrawalConfirmation(true);
        
        // Clear the withdrawal amount input after success
        setWithdrawAmount("");

        // Save to transaction history in Firestore
        await rewardsService.saveTransactionHistory({
          userId: user.uid,
          walletAddress: effectiveAccount,
          type: "withdraw",
          amount: totalClaimable,
          description: `Withdrew ${rewardsService.formatMKIN(totalClaimable)} MKIN (fee: $${initiateResult.feeAmountUsd})`,
        });

        // Add to local state
        setTransactionHistory((prev) => [
          {
            type: "withdraw",
            amount: totalClaimable,
            description: `Withdrew ${rewardsService.formatMKIN(totalClaimable)} MKIN (fee: $${initiateResult.feeAmountUsd})`,
            date: new Date(),
          },
          ...prev.slice(0, 9), // Keep only last 10 transactions
        ]);

        // Refresh user rewards to show updated balance
        if (user) {
          try {
            const rewards = await rewardsService.initializeUserRewards(
              user.uid,
              effectiveAccount,
              nfts.length,
              nfts,
            );
            setUserRewards(rewards);
          } catch (error) {
            console.error("Error refreshing rewards:", error);
          }
        }
      } else {
        const errorMsg = completeResult.error || "Failed to complete withdrawal";
        const fullMsg = completeResult.refunded 
          ? `${errorMsg}\n\nYour MKIN balance has been refunded, but the $${initiateResult.feeAmountUsd} SOL fee was not refunded.`
          : errorMsg;
        setWithdrawError(fullMsg);
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      console.error("Error type:", typeof error);
      console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      let errorMessage = "Failed to process withdrawal";
      if (error instanceof Error) {
        if (error.message.includes("User rejected") || error.message.includes("User canceled")) {
          errorMessage = "Transaction cancelled by user";
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      
      setWithdrawError(errorMessage);
    } finally {
      setWithdrawLoading(false);
      // Don't clear input on error - let user fix their input
    }
  }, [user, effectiveAccount, userRewards, withdrawAmount]);

  // Handle transfer
  const handleTransfer = useCallback(async () => {
    if (!effectiveAccount || !transferRecipient || !transferAmount) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError("Please enter a valid amount");
      return;
    }

    if (amount > (userRewards?.totalRealmkin || 0)) {
      setTransferError("Insufficient balance");
      return;
    }

    setTransferLoading(true);
    setTransferError(null);

    try {
      // Call Gatekeeper transfer API (atomic debit/credit)
      const auth = getAuth();
      if (!auth.currentUser) {
        setTransferError("You must be signed in to transfer.");
        return;
      }
      const token = await auth.currentUser.getIdToken();
      const refId = `transfer:${auth.currentUser.uid}:${transferRecipient}:${Date.now()}`;
      const res = await fetch(`${gatekeeperBase}/api/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientWalletAddress: transferRecipient,
          amount: Math.trunc(amount),
          refId,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Transfer failed");
      }

      // Balance will be refreshed automatically via userRewards state

      // Show transfer confirmation
      setLastTransferAmount(amount);
      setLastTransferRecipient(transferRecipient);
      setShowTransferConfirmation(true);

      // Save to transaction history in Firestore
      await rewardsService.saveTransactionHistory({
        userId: user!.uid,
        walletAddress: effectiveAccount,
        type: "transfer",
        amount: amount,
        description: `Sent ${rewardsService.formatMKIN(amount)} to ${formatAddress(transferRecipient || "")}`,
        recipientAddress: transferRecipient,
      });

      // Add to local state
      setTransactionHistory((prev) => [
        {
          type: "transfer",
          amount: amount,
          description: `Sent ${rewardsService.formatMKIN(amount)} to ${formatAddress(transferRecipient || "")}`,
          date: new Date(),
        },
        ...prev.slice(0, 9), // Keep only last 10 transactions
      ]);

      // Clear input fields
      setTransferRecipient("");
      setTransferAmount("");
    } catch (error) {
      console.error("Error processing transfer:", error);
      setTransferError(
        error instanceof Error ? error.message : "Transfer failed",
      );
    } finally {
      setTransferLoading(false);
    }
  }, [
    effectiveAccount,
    transferRecipient,
    transferAmount,
    userRewards,
    nfts.length,
    gatekeeperBase,
    user,
  ]);

  // Fetch transaction history when user changes
  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (user?.uid) {
        try {
          const history = await rewardsService.getTransactionHistory(
            user.uid,
            10,
          );
          const formattedHistory = history.map((transaction) => ({
            type: transaction.type as "claim" | "withdraw" | "transfer",
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.createdAt,
          }));
          setTransactionHistory(formattedHistory);
        } catch (error) {
          console.error("Error fetching transaction history:", error);
        }
      }
    };

    fetchTransactionHistory();
  }, [user?.uid]);

  // Fetch NFTs when wallet connects (or when admin test mode is enabled)
  useEffect(() => {
    if ((isConnected && account) || adminTestMode) {
      fetchUserNFTs();
    } else {
      setNfts([]);
      setNftError(null);
    }
  }, [isConnected, account, adminTestMode, fetchUserNFTs, testMode]);

  // Fetch Discord link status when user session changes
  useEffect(() => {
    async function checkLink() {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          // Fall back to local cache
          try {
            const cachedLinked = localStorage.getItem(
              "realmkin_discord_linked",
            );
            setDiscordLinked(cachedLinked === "true");
          } catch {
            setDiscordLinked(false);
          }
          return;
        }
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${gatekeeperBase}/api/link/status`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          // 404 or other error: fall back to local cache
          try {
            const cachedLinked = localStorage.getItem(
              "realmkin_discord_linked",
            );
            setDiscordLinked(cachedLinked === "true");
          } catch {
            setDiscordLinked(false);
          }
          return;
        }
        const data = await res.json();
        setDiscordLinked(Boolean(data?.linked));
      } catch {
        // Network issue: fall back to cache
        try {
          const cachedLinked = localStorage.getItem("realmkin_discord_linked");
          setDiscordLinked(cachedLinked === "true");
        } catch {
          setDiscordLinked(false);
        }
      }
    }
    checkLink();
  }, [user?.uid, gatekeeperBase]);

  // Removed unified balance effect

  const formattedWalletBalance = useMemo(
    () => `${rewardsService.formatMKIN(walletDisplayValue)} MKIN`,
    [walletDisplayValue],
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#080806] relative overflow-hidden">
        {!isMobile && <EtherealParticles />}
        {!isMobile && <ConstellationBackground />}

        {/* Mobile Header */}
        <header className="lg:hidden  flex flex-row justify-between items-center gap-3 p-4 mb-6 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 animate-float">
              <Image
                src="/realmkin-logo.png"
                alt="Realmkin Logo"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="font-bold text-lg uppercase tracking-wider gold-gradient-text">
              THE REALMKIN
            </h1>
          </div>

          {/* Mobile menu button - always visible */}
          <div className="w-auto flex-shrink-0 flex items-center gap-2">
            <button
              onClick={() => setShowTutorial(true)}
              className="flex items-center gap-1 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
              title="Show tutorial"
            >
              <span>?</span>
            </button>
            <button
              onClick={() => setShowMobileActions((v) => !v)}
              className="flex items-center gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
              aria-expanded={showMobileActions}
              aria-haspopup="true"
            >
              <span
                className={`text-xs transition-transform ${showMobileActions ? "rotate-180" : ""}`}
              >
                ⋯
              </span>
            </button>
          </div>
        </header>

        {/* Mobile Menu Modal */}
        <MobileMenuOverlay
          isOpen={showMobileActions}
          onClose={() => setShowMobileActions(false)}
          menuItems={mobileMenuItems}
          isAdmin={userData?.admin}
          isConnected={isConnected}
          account={account}
          isConnecting={isConnecting}
          discordLinked={discordLinked}
          discordConnecting={discordConnecting}
          discordUnlinking={discordUnlinking}
          onDiscordConnect={handleDiscordConnect}
          onDiscordDisconnect={handleDiscordDisconnect}
          onConnectWallet={connectWallet}
          onDisconnectWallet={disconnectWallet}
        />

        {/* Admin Dashboard Section removed in favor of dedicated /admin page */}

        {/* Tutorial Modal */}
        {showTutorial && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTutorial(false)}
          >
            <div
              className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-[#DA9C2F]/30 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[#DA9C2F]">
                    Quick Start Guide
                  </h2>
                  <button
                    onClick={() => setShowTutorial(false)}
                    className="text-white/60 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
                <QuickStartGuide />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Container */}
        <div className="p-4 md:mx-[10%] lg:mx-[15%]">
          {/* Reward Section */}
          <section className="card mb-6 premium-card interactive-element">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-label">REWARD</h2>
              <div className="flex gap-2">
                {/* Admin Test Wallet Toggle (only for admins) */}
                {userData?.admin && (
                  <button
                    onClick={() => {
                      setAdminTestMode(!adminTestMode);
                      if (adminTestMode) {
                        setTestWalletAddress("");
                      }
                    }}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${
                      adminTestMode
                        ? "bg-purple-500/20 border-purple-400 text-purple-400"
                        : "bg-white/5 border-white/20 text-white/60 hover:border-white/40"
                    }`}
                    title="Enter any wallet address to test rewards"
                  >
                    {adminTestMode ? "✓ Test Wallet ON" : "Test Wallet"}
                  </button>
                )}
                {/* Reload Configs Button */}
                {isDevelopment && (
                  <button
                    onClick={handleReloadConfigs}
                    disabled={reloadingConfigs}
                    className="text-xs px-3 py-1 rounded-full border bg-blue-500/20 border-blue-400 text-blue-400 hover:bg-blue-500/30 transition-all disabled:opacity-50"
                    title="Force reload contract configs from Firestore"
                  >
                    {reloadingConfigs ? "⟳ Reloading..." : "🔄 Reload Configs"}
                  </button>
                )}
                {/* Test Mode Toggle (only in development) */}
                {isDevelopment && (
                  <button
                    onClick={() => setTestMode(!testMode)}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${
                      testMode
                        ? "bg-[#DA9C2F]/20 border-[#DA9C2F] text-[#DA9C2F]"
                        : "bg-white/5 border-white/20 text-white/60 hover:border-white/40"
                    }`}
                    title="Enable test mode to simulate NFT from GZv3n contract"
                  >
                    {testMode ? "✓ Test Mode ON" : "Test Mode"}
                  </button>
                )}
              </div>
            </div>
            {userData?.admin && adminTestMode && (
              <div className="mb-4 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                <p className="text-purple-400 text-sm font-semibold mb-2">
                  👤 Admin Test Wallet Mode
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter wallet address to test..."
                    value={testWalletAddress}
                    onChange={(e) => setTestWalletAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0B09] border border-purple-400/30 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-purple-400"
                  />
                  <p className="text-white/50 text-xs">
                    Enter any Solana wallet address to test reward calculations and NFT holdings.
                  </p>
                  {testWalletAddress && (
                    <p className="text-purple-400/80 text-xs font-mono">
                      Testing: {testWalletAddress.slice(0, 8)}...{testWalletAddress.slice(-6)}
                    </p>
                  )}
                </div>
              </div>
            )}
            {isDevelopment && testMode && (
              <div className="mb-4 p-3 bg-[#DA9C2F]/10 border border-[#DA9C2F]/30 rounded-lg">
                <p className="text-[#DA9C2F] text-sm font-semibold mb-1">
                  🧪 Test Mode Active
                </p>
                <p className="text-white/70 text-xs">
                  Simulating 1 NFT from contract: Realmkin Mass Mint
                </p>
                <p className="text-white/60 text-xs mt-1">
                  EzjhzaTBqXohJTsaMKFSX6fgXcDJyXAV85NK7RK79u3Z
                </p>
                <p className="text-white/50 text-xs mt-1">
                  Check your mining rate below to see the reward calculation.
                </p>
              </div>
            )}
            <div className="text-left space-y-4">
              {/* Total Claimable */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/60 text-sm mb-1">Total Claimable</p>
                  <div className="text-white font-bold text-3xl">
                    {userRewards
                      ? rewardsService.formatMKIN(userRewards.totalRealmkin)
                      : "₥0"}{" "}
                    <span className="text-lg text-[#DA9C2F]">MKIN</span>
                  </div>
                </div>

                {/* Wallet Balance - Right aligned */}
                {(isConnected || adminTestMode) && (
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-white/60 text-xs">
                      {adminTestMode ? "Test Wallet" : "Wallet Balance"}
                    </p>
                    <div className="flex items-center gap-2 text-[#DA9C2F] font-medium">
                      <Image
                        src="/wallet.jpeg"
                        alt="Wallet"
                        width={20}
                        height={20}
                        className="w-5 h-5 object-contain"
                      />
                      <span className="whitespace-nowrap">
                        {formattedWalletBalance}
                      </span>
                    </div>
                    {adminTestMode && effectiveAccount && (
                      <p className="text-purple-400/60 text-[10px] mt-0.5 font-mono">
                        {effectiveAccount.slice(0, 4)}...{effectiveAccount.slice(-4)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Mining Rate Per Week - Collapsible */}
              <div className="rounded-lg bg-[#DA9C2F]/10 border border-[#DA9C2F]/20 overflow-hidden">
                <button
                  onClick={() =>
                    setShowMiningRateDetails(!showMiningRateDetails)
                  }
                  className="w-full p-3 flex justify-between items-center hover:bg-[#DA9C2F]/20 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-[#DA9C2F] font-semibold text-sm">
                      ⛏️ Mining Rate / Week
                    </p>
                    <p className="text-white font-bold text-xl mt-1">
                      {userRewards && rewardsCalculation
                        ? rewardsService.formatMKIN(
                            rewardsCalculation.weeklyRate || 0,
                          )
                        : "₥0"}{" "}
                      <span className="text-sm text-white/60">MKIN/week</span>
                    </p>
                  </div>
                  <span
                    className={`text-[#DA9C2F] text-lg transition-transform ${showMiningRateDetails ? "rotate-180" : ""}`}
                  >
                    ▼
                  </span>
                </button>

                {/* Conditions Breakdown - Collapsible Content */}
                {showMiningRateDetails && rewardsCalculation && (
                  <div className="p-3 border-t border-[#DA9C2F]/20 bg-[#0f0f0f]/50">
                    <p className="text-white/60 text-xs font-semibold mb-2 uppercase">
                      Earning Conditions
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-xs">
                        <span
                          className={
                            nfts.length > 0 ? "text-green-400" : "text-white/40"
                          }
                        >
                          {nfts.length > 0 ? "✓" : "○"}
                        </span>
                        <span
                          className={
                            nfts.length > 0 ? "text-green-400" : "text-white/40"
                          }
                        >
                          Hold {nfts.length} Realmkin NFT
                          {nfts.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <span
                          className={
                            isConnected ? "text-green-400" : "text-white/40"
                          }
                        >
                          {isConnected ? "✓" : "○"}
                        </span>
                        <span
                          className={
                            isConnected ? "text-green-400" : "text-white/40"
                          }
                        >
                          Wallet Connected
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <span
                          className={
                            rewardsCalculation.totalNFTs > 0
                              ? "text-green-400"
                              : "text-white/40"
                          }
                        >
                          {rewardsCalculation.totalNFTs > 0 ? "✓" : "○"}
                        </span>
                        <span
                          className={
                            rewardsCalculation.totalNFTs > 0
                              ? "text-green-400"
                              : "text-white/40"
                          }
                        >
                          Earning{" "}
                          {rewardsService.formatMKIN(
                            rewardsCalculation.weeklyRate,
                          )}{" "}
                          MKIN/week
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-center space-y-3 w-full pt-2">
                {rewardsCalculation &&
                  !rewardsCalculation.canClaim &&
                  rewardsCalculation.nextClaimDate && (
                    <div className="text-xs text-center w-full text-[#DA9C2F]">
                      Next claim available in{" "}
                      {rewardsService.getTimeUntilNextClaim(
                        rewardsCalculation.nextClaimDate,
                      )}
                    </div>
                  )}
              </div>
            </div>
          </section>

          {/* Combined Actions Section */}
          <section className="mb-6">
            {/* <h2 className="text-label mb-4">ACTIONS</h2> */}
            <div className="card premium-card interactive-element grid grid-cols-[65%_30%] md:grid-cols-2 gap-4">
              {/* Left Column: Withdraw + History */}
              <div className="">
                <h3 className="text-label mb-3">WITHDRAW</h3>
                <div className="space-y-3">
                  {/* Info Banner */}
                  <div className="bg-[#DA9C2F]/10 border border-[#DA9C2F]/30 rounded-lg p-3">
                    <p className="text-[#DA9C2F] text-xs font-semibold mb-1">
                      ⚠️ Withdrawal Requirements
                    </p>
                    <ul className="text-white/70 text-xs space-y-1">
                      <li>• Minimum: 1,000 MKIN</li>
                      <li>• Fee: $0.50 in SOL</li>
                    </ul>
                  </div>
                  
                  <div>
                    <label className="text-muted text-xs block mb-1">
                      Amount
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="0"
                        value={withdrawAmount}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          console.log("Input onChange fired:", newValue);
                          console.log("Current withdrawAmount state before update:", withdrawAmount);
                          setWithdrawAmount(newValue);
                          // Force immediate log after state update (will show in next render)
                          setTimeout(() => console.log("withdrawAmount state after setState:", withdrawAmount), 0);
                        }}
                        onFocus={() => console.log("Input focused. Current value:", withdrawAmount)}
                        onBlur={() => console.log("Input blurred. Final value:", withdrawAmount)}
                        className="input-field flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount((userRewards?.totalRealmkin || 0).toString())}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                    <p className="text-white/50 text-xs mt-1">
                      Min: 1,000 MKIN • Available: {(userRewards?.totalRealmkin || 0).toLocaleString()} MKIN
                    </p>
                  </div>
                  {withdrawError && (
                    <div className="error-message warning whitespace-pre-line">{withdrawError}</div>
                  )}
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawLoading || (userRewards?.totalRealmkin || 0) < 1000}
                    className={`btn-primary w-full text-sm ${(withdrawLoading || (userRewards?.totalRealmkin || 0) < 1000) ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={(userRewards?.totalRealmkin || 0) < 1000 ? "Minimum 1,000 MKIN required" : ""}
                  >
                    {withdrawLoading ? "PROCESSING..." : (withdrawAmount && withdrawAmount.trim() !== "" ? `WITHDRAW ${parseFloat(withdrawAmount).toLocaleString()} MKIN` : "WITHDRAW ALL")}
                  </button>
                </div>

                {/* History Section */}
                <div className="mt-6 pt-4 border-t border-[#404040]">
                  <h4 className="text-label mb-3">HISTORY</h4>
                  <div className="space-y-2">
                    {transactionHistory.length > 0 ? (
                      transactionHistory.map((transaction, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-white">
                            {transaction.description}
                          </span>
                          <span className="text-muted">
                            {transaction.date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted text-xs">
                          No transactions yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Transfer */}
              <div>
                <h3 className="text-label mb-3">TRANSFER</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-muted text-xs block mb-1">
                      Recipient
                    </label>
                    <input
                      type="text"
                      placeholder="6Xd2...Hcy"
                      value={transferRecipient}
                      onChange={(e) => setTransferRecipient(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-muted text-xs block mb-1">
                      Amount
                    </label>
                    <input
                      type="text"
                      placeholder="0"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="input-field w-full"
                    />
                  </div>
                  {transferError && (
                    <div className="error-message warning">{transferError}</div>
                  )}
                  <button
                    onClick={handleTransfer}
                    disabled={transferLoading}
                    className="btn-primary w-full text-sm text-center"
                  >
                    {transferLoading ? "PROCESSING..." : "SEND"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* NFT Section */}
          <section className="mb-20">
            {/* <div className="flex justify-between items-center mb-4">
            <h2 className="text-label">MY WARDEN KINS</h2>
            <span className="text-white font-medium text-sm">
              {isConnected && account
                ? `${nfts.length} ${nfts.length === 1 ? "KIN" : "KINS"}`
                : "CONNECT WALLET"}
            </span>
          </div> */}

            {/* {isConnected && account ? (
            <div className="card premium-card interactive-element">
              {nftLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-realmkin">
                    <div className="loading-realmkin-spinner"></div>
                    <div className="loading-realmkin-particles">
                      <div className="loading-realmkin-particle"></div>
                      <div className="loading-realmkin-particle"></div>
                      <div className="loading-realmkin-particle"></div>
                      <div className="loading-realmkin-particle"></div>
                    </div>
                  </div>
                  <span className="ml-3 text-white text-sm">
                    Loading NFTs...
                  </span>
                </div>
              ) : nftError ? (
                <div className="text-center py-6">
                  <div className="text-[#ef4444] mb-2 text-sm">{nftError}</div>
                  <button
                    onClick={fetchUserNFTs}
                    className="btn-secondary text-xs"
                  >
                    Retry
                  </button>
                </div>
              ) : nfts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {nfts.slice(0, 4).map((nft, index) => (
                    <NFTCard
                      key={nft.id}
                      nft={nft}
                      size="small"
                      animationDelay={`${index * 0.1}s`}
                    />
                  ))}
                  {nfts.length > 4 && (
                    <div className="col-span-2 text-center">
                      <button className="btn-secondary w-full text-xs">
                        View All ({nfts.length})
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-2xl mb-2">🎭</div>
                  <p className="text-muted text-sm">No Realmkin NFTs found</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card premium-card interactive-element text-center py-8">
              <div className="text-3xl mb-4">🔗</div>
              <h3 className="text-white font-medium mb-2">
                CONNECT YOUR WALLET
              </h3>
              <p className="text-muted text-sm mb-4">
                Connect your wallet to view your NFT collection
              </p>
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="btn-primary"
              >
                {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
              </button>
            </div>
          )} */}
          </section>

          {/* Social Links */}
          <section className="text-center text-white">
            <h4 className="mb-3 text-xs uppercase tracking-[0.6em] text-white/70">
              OUR SOCIALS
            </h4>
            <SocialLinks variant="light" className="justify-between" />
          </section>
        </div>

        {/* Modals */}
        <RewardsDashboard
          isOpen={showRewardsDashboard}
          onClose={() => setShowRewardsDashboard(false)}
        />
        <WithdrawalConfirmationModal
          isOpen={showWithdrawalConfirmation}
          onClose={() => setShowWithdrawalConfirmation(false)}
          amount={lastClaimAmount}
          walletAddress={lastClaimWallet}
        />
        <TransferConfirmationModal
          isOpen={showTransferConfirmation}
          onClose={() => setShowTransferConfirmation(false)}
          amount={lastTransferAmount}
          recipient={lastTransferRecipient}
        />
      </div>
    </ProtectedRoute>
  );
}
