"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useWallet } from "@solana/wallet-adapter-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProfileHeader from "@/components/account/ProfileHeader";
import StatsCard from "@/components/account/StatsCard";
import LeaderboardCard from "@/components/account/LeaderboardCard";
import RevenueDistributionCard from "@/components/account/RevenueDistributionCard";
import ProfileEditModal from "@/components/account/ProfileEditModal";
import TransactionHistoryModal from "@/components/account/TransactionHistoryModal";
import WithdrawalConfirmationModal from "@/components/WithdrawalConfirmationModal";
import TransferConfirmationModal from "@/components/TransferConfirmationModal";
import { rewardsService, UserRewards } from "@/services/rewardsService";
import { fetchTop3Miners, fetchTopSecondaryMarketBuyers } from "@/services/leaderboardService";
import { nftService } from "@/services/nftService";
import {
  checkEligibility,
  claimRevenue,
  calculateClaimFee,
  type RevenueEligibility,
  type ClaimFeeEstimate,
} from "@/services/revenueDistributionService";
import { getUserProfile } from "@/services/profileService";
import { getAuth } from "firebase/auth";
import type { Transaction } from "@solana/web3.js";

export default function AccountPage() {
  const { user, userData } = useAuth();
  const { account, isConnected } = useWeb3();
  const { signTransaction: walletAdapterSignTransaction } = useWallet();

  // User data state
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  // Revenue distribution state
  const [revenueEligibility, setRevenueEligibility] = useState<RevenueEligibility | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueClaiming, setRevenueClaiming] = useState(false);
  const [claimFeeEstimate, setClaimFeeEstimate] = useState<ClaimFeeEstimate | null>(null);

  // Leaderboard state
  const [leaderboardEntries, setLeaderboardEntries] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | undefined>();
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Modal states
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [showWithdrawalConfirmation, setShowWithdrawalConfirmation] = useState(false);
  const [showTransferConfirmation, setShowTransferConfirmation] = useState(false);
  const [lastClaimAmount, setLastClaimAmount] = useState<number>(0);
  const [lastClaimWallet, setLastClaimWallet] = useState<string>("");
  const [lastTransferAmount, setLastTransferAmount] = useState<number>(0);
  const [lastTransferRecipient, setLastTransferRecipient] = useState<string>("");
  
  // Profile state
  const [currentUsername, setCurrentUsername] = useState<string | undefined>();
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | undefined>();
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Transfer state
  const [transferRecipient, setTransferRecipient] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Fetch user rewards and NFTs
  useEffect(() => {
    const fetchRewards = async () => {
      if (!user?.uid || !account) return;

      setRewardsLoading(true);
      try {
        // Fetch NFTs to get accurate count
        const nftCollection = await nftService.fetchAllContractNFTs(account);
        const nftCount = nftCollection.nfts.length;

        // Initialize/update rewards (same as wallet page)
        const rewards = await rewardsService.initializeUserRewards(
          user.uid,
          account,
          nftCount,
          nftCollection.nfts
        );
        setUserRewards(rewards);

        console.log("✅ Account page rewards initialized:", {
          weeklyRate: rewards.weeklyRate,
          totalRealmkin: rewards.totalRealmkin,
          pendingRewards: rewards.pendingRewards,
          nftCount: nftCount,
        });
      } catch (error) {
        console.error("Error fetching rewards:", error);
        
        // Fallback: try to get existing rewards
        try {
          const existingRewards = await rewardsService.getUserRewards(user.uid);
          if (existingRewards) {
            setUserRewards(existingRewards);
            console.log("✅ Using existing rewards data");
          }
        } catch (fallbackError) {
          console.error("Error in fallback:", fallbackError);
        }
      } finally {
        setRewardsLoading(false);
      }
    };

    fetchRewards();
  }, [user?.uid, account]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;

      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setCurrentUsername(profile.username);
          setCurrentAvatarUrl(profile.avatarUrl);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, [user?.uid, profileRefreshKey]);

  // Fetch revenue eligibility and claim fee
  useEffect(() => {
    const fetchEligibility = async () => {
      if (!user?.uid || !account) return;

      setRevenueLoading(true);
      try {
        const eligibility = await checkEligibility();
        console.log('💰 Revenue Eligibility Response:', eligibility);
        setRevenueEligibility(eligibility);
        
        // Get claim fee estimate if eligible
        if (eligibility.eligible) {
          const feeEstimate = await calculateClaimFee(account);
          console.log('💵 Claim Fee Estimate:', feeEstimate);
          setClaimFeeEstimate(feeEstimate);
        }
      } catch (error) {
        console.error("Error checking eligibility:", error);
        setRevenueEligibility({ eligible: false, reason: "Unable to check eligibility" });
      } finally {
        setRevenueLoading(false);
      }
    };

    fetchEligibility();
  }, [user?.uid, account]);

  // Fetch leaderboard (Secondary Market Buyers)
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user?.uid) return;

      setLeaderboardLoading(true);
      try {
        // Fetch top 10 secondary market buyers
        const entries = await fetchTopSecondaryMarketBuyers(10);
        setLeaderboardEntries(
          entries.map((entry) => ({
            rank: entry.rank,
            username: entry.username,
            score: entry.nftCount,
            nftCount: entry.nftCount, // Keep nftCount separate
            avatarUrl: entry.avatarUrl,
          }))
        );

        // User rank not shown for secondary market leaderboard
        setUserRank(undefined);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user?.uid]);

  // Handle withdraw (copied from wallet page)
  const handleWithdraw = useCallback(async () => {
    if (!user || !account) return;

    const totalClaimable = userRewards?.totalRealmkin || 0;
    const requestedAmount =
      withdrawAmount && withdrawAmount.trim() !== ""
        ? parseFloat(withdrawAmount)
        : totalClaimable;

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      setWithdrawError("💭 Please enter a valid amount of MKIN to withdraw");
      return;
    }

    if (requestedAmount > totalClaimable) {
      setWithdrawError(
        `❌ You only have ${totalClaimable.toLocaleString()} MKIN available.`
      );
      return;
    }

    setWithdrawLoading(true);
    setWithdrawError(null);

    try {
      const { initiateWithdrawal, completeWithdrawal, deserializeTransaction } =
        await import("@/services/withdrawService");

      const initiateResult = await initiateWithdrawal(requestedAmount, account);

      if (!initiateResult.success || !initiateResult.feeTransaction) {
        setWithdrawError(initiateResult.error || "Failed to initiate withdrawal");
        return;
      }

      const transaction = deserializeTransaction(initiateResult.feeTransaction);

      const { Connection } = await import("@solana/web3.js");
      const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      const rpcUrl = heliusApiKey
        ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
        : process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      let signedTransaction;
      if (walletAdapterSignTransaction) {
        signedTransaction = (await walletAdapterSignTransaction(
          transaction
        )) as Transaction;
      } else {
        setWithdrawError("Wallet adapter not ready");
        return;
      }

      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const completeResult = await completeWithdrawal(signature, requestedAmount, account);

      if (completeResult.success) {
        setLastClaimAmount(requestedAmount);
        setLastClaimWallet(account);
        setShowWithdrawalConfirmation(true);
        setShowWithdrawModal(false);
        setWithdrawAmount("");

        // Refresh rewards
        const rewards = await rewardsService.getUserRewards(user.uid);
        setUserRewards(rewards);
      } else {
        setWithdrawError(completeResult.error || "Failed to complete withdrawal");
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      setWithdrawError(
        error instanceof Error ? error.message : "Withdrawal failed"
      );
    } finally {
      setWithdrawLoading(false);
    }
  }, [user, account, userRewards, withdrawAmount, walletAdapterSignTransaction]);

  // Handle transfer (copied from wallet page)
  const handleTransfer = useCallback(async () => {
    if (!account || !transferRecipient || !transferAmount) return;

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
      const auth = getAuth();
      if (!auth.currentUser) {
        setTransferError("You must be signed in to transfer.");
        return;
      }

      const token = await auth.currentUser.getIdToken();
      const gatekeeperBase =
        process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com";
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

      setLastTransferAmount(amount);
      setLastTransferRecipient(transferRecipient);
      setShowTransferConfirmation(true);
      setShowTransferModal(false);
      setTransferRecipient("");
      setTransferAmount("");

      // Refresh rewards
      if (user) {
        const rewards = await rewardsService.getUserRewards(user.uid);
        setUserRewards(rewards);
      }
    } catch (error) {
      console.error("Error processing transfer:", error);
      setTransferError(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  }, [account, transferRecipient, transferAmount, userRewards, user]);

  // Handle revenue claim
  const handleRevenueClaim = useCallback(async () => {
    if (!revenueEligibility?.eligible || !revenueEligibility.distributionId || !claimFeeEstimate) return;

    setRevenueClaiming(true);
    try {
      const { Connection, Transaction, SystemProgram, PublicKey } = await import(
        "@solana/web3.js"
      );

      const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      const rpcUrl = heliusApiKey
        ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
        : process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");

      // Gatekeeper public key (derived from GATEKEEPER_KEYPAIR on backend)
      const gatekeeperAddress = process.env.NEXT_PUBLIC_GATEKEEPER_ADDRESS || "8w1dD5Von2GBTa9cVASeC2A9F3gRrCqHA7QPds5pfXsM";
      const gatekeeperPubkey = new PublicKey(gatekeeperAddress);
      const userPubkey = new PublicKey(account || "");

      // Calculate exact lamports to send (ensuring precision)
      const lamportsToSend = Math.floor(claimFeeEstimate.totalFeeSol * 1e9);
      
      // Log fee payment details for debugging
      console.log("🔐 Revenue Claim Fee Payment:");
      console.log("   Gatekeeper:", gatekeeperAddress);
      console.log("   User:", account);
      console.log("   Fee (SOL):", claimFeeEstimate.totalFeeSol);
      console.log("   Fee (lamports):", lamportsToSend);
      console.log("   Fee (USD):", claimFeeEstimate.totalFeeUsd);
      console.log("   Base Fee (USD):", claimFeeEstimate.baseFeeUsd);
      console.log("   Token Account Creation (USD):", claimFeeEstimate.accountCreationFeeUsd);
      console.log("   Accounts to Create:", claimFeeEstimate.accountsToCreate);
      
      // Validate the fee amount before creating transaction
      if (lamportsToSend <= 0 || !isFinite(lamportsToSend)) {
        throw new Error(`Invalid fee amount calculated: ${lamportsToSend} lamports`);
      }
      
      console.log("   ✅ Fee validation passed, creating transaction...");

      // Create fee payment transaction (base fee + token account creation fee)
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userPubkey,
          toPubkey: gatekeeperPubkey,
          lamports: lamportsToSend,
        })
      );
      
      console.log("   ✅ Transaction created with transfer instruction");

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = userPubkey;

      // Sign transaction
      console.log("   📝 Requesting user to sign transaction...");
      let signedTransaction;
      if (walletAdapterSignTransaction) {
        signedTransaction = (await walletAdapterSignTransaction(
          transaction
        )) as Transaction;
        console.log("   ✅ Transaction signed by user");
      } else {
        throw new Error("Wallet adapter not ready");
      }

      // Verify the signed transaction contains the correct transfer
      console.log("   🔍 Verifying signed transaction...");
      const transferInstruction = signedTransaction.instructions[0];
      if (transferInstruction && transferInstruction.programId.toBase58() === "11111111111111111111111111111111") {
        console.log("   ✅ Transaction contains SOL transfer instruction");
      } else {
        console.error("   ❌ Transaction missing SOL transfer instruction");
      }

      // Send transaction
      console.log("   📡 Sending transaction to network...");
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );
      console.log("   ✅ Transaction sent! Signature:", signature);

      // Wait for confirmation
      console.log("   ⏳ Waiting for transaction confirmation...");
      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );
      console.log("   ✅ Transaction confirmed on-chain!");

      // Submit claim to backend
      console.log("   📤 Submitting claim to backend with transaction signature...");
      console.log("   Transaction Signature:", signature);
      console.log("   Distribution ID:", revenueEligibility.distributionId);
      const result = await claimRevenue(signature, revenueEligibility.distributionId);
      console.log("   📥 Backend response:", result);

      if (result.success) {
        const { notifySuccess } = await import("@/utils/toastNotifications");
        
        const accountsMsg = result.accountsCreated && result.accountsCreated.length > 0
          ? ` (Created ${result.accountsCreated.join(', ')} token accounts)`
          : '';
        
        notifySuccess(
          `Successfully claimed revenue!${accountsMsg}\n` +
          `You received:\n` +
          `- ${result.amountSol?.toFixed(6)} SOL\n` +
          `- ${result.amountEmpire?.toLocaleString()} EMPIRE\n` +
          `- ${result.amountMkin?.toLocaleString()} MKIN\n\n` +
          `Transaction:\n${result.payoutSignature}`,
          8000 // Show for 8 seconds
        );

        // Log successful revenue claim to transaction history
        if (user) {
          try {
            const { logTransaction } = await import("@/services/transactionHistoryService");
            const { Timestamp } = await import("firebase/firestore");
            
            await logTransaction(user.uid, {
              type: "revenue_share",
              status: "success",
              amount: result.amountMkin || 0,
              token: "MKIN",
              txSignature: result.payoutSignature,
              timestamp: Timestamp.now(),
              metadata: {
                distributionId: revenueEligibility.distributionId,
                amountSol: result.amountSol,
                amountEmpire: result.amountEmpire,
                amountMkin: result.amountMkin,
                accountsCreated: result.accountsCreated,
                feeSignature: signature,
              },
            });
          } catch (logError) {
            console.error("Error logging transaction to history:", logError);
            // Don't fail the whole flow if logging fails
          }
        }

        // Refresh eligibility and rewards
        const eligibility = await checkEligibility();
        setRevenueEligibility(eligibility);
        
        if (user) {
          const rewards = await rewardsService.getUserRewards(user.uid);
          setUserRewards(rewards);
        }
      } else {
        throw new Error(result.error || "Claim failed");
      }
    } catch (error) {
      console.error("Error claiming revenue:", error);
      const { notifyError } = await import("@/utils/toastNotifications");
      notifyError(
        `Failed to claim revenue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      
      // Log failed attempt to transaction history
      if (user) {
        try {
          const { logTransaction } = await import("@/services/transactionHistoryService");
          const { getFriendlyErrorMessage } = await import("@/services/transactionHistoryService");
          const { Timestamp } = await import("firebase/firestore");
          
          const { errorCode, errorMessage, technicalError } = getFriendlyErrorMessage(error);
          
          await logTransaction(user.uid, {
            type: "revenue_share",
            status: "failed",
            amount: 0,
            token: "MKIN",
            timestamp: Timestamp.now(),
            errorCode,
            errorMessage,
            technicalError,
            metadata: {
              distributionId: revenueEligibility?.distributionId,
            },
          });
        } catch (logError) {
          console.error("Error logging failed transaction:", logError);
        }
      }
    } finally {
      setRevenueClaiming(false);
    }
  }, [revenueEligibility, account, claimFeeEstimate, walletAdapterSignTransaction, user]);

  // Calculate level based on weekly mining rate
  const level = Math.min(50, Math.floor((userRewards?.weeklyRate || 0) / 10) + 1);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#050505] flex justify-center items-start py-10 px-4">
        <main className="w-full max-w-[400px] md:max-w-[600px] lg:max-w-[800px] xl:max-w-[1000px] flex flex-col gap-5">
          {/* Profile Card */}
          <ProfileHeader
            userId={user?.uid || ""}
            level={level}
            onEditProfile={() => setShowProfileEditModal(true)}
            onViewHistory={() => setShowHistoryModal(true)}
            onWithdraw={() => setShowWithdrawModal(true)}
            onTransfer={() => setShowTransferModal(true)}
            refreshKey={profileRefreshKey}
          />

          {/* Stats Section */}
          <section className="flex flex-col gap-3">
            {/* Total MKIN Earned (Total accumulated earnings) */}
            <StatsCard
              label="Total MKIN Earned"
              value={rewardsLoading ? "..." : (userRewards?.totalRealmkin || 0).toLocaleString()}
              unit="MKIN"
              subtext="Total accumulated earnings"
              variant="orange"
              icon={
                <svg
                  className="w-6 h-6 text-orange-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
                </svg>
              }
            />

            {/* Mining Rate (Weekly) */}
            <StatsCard
              label="Mining Rate"
              value={rewardsLoading ? "..." : Math.round(userRewards?.weeklyRate || 0)}
              unit="MKIN/week"
              subtext="Your current weekly mining rate"
              variant="yellow"
              icon={
                <svg
                  className="w-6 h-6 text-[#eab308]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    clipRule="evenodd"
                    d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
                    fillRule="evenodd"
                  />
                </svg>
              }
            />

            {/* Revenue Distribution Card - Only show if eligible */}
            {revenueEligibility?.eligible && (
              <RevenueDistributionCard
                mkinAmount={revenueEligibility?.amountMkin || 0}
                empireAmount={revenueEligibility?.amountEmpire || 0}
                solAmount={revenueEligibility?.amountSol || 0}
                eligible={revenueEligibility?.eligible || false}
                loading={revenueLoading}
                onClaim={handleRevenueClaim}
                claiming={revenueClaiming}
                claimFeeUsd={claimFeeEstimate?.totalFeeUsd || 0.10}
                accountsToCreate={claimFeeEstimate?.accountsToCreate}
              />
            )}
          </section>

          {/* Leaderboard Card */}
          <LeaderboardCard
            title="Leaderboard"
            entries={leaderboardEntries}
            userRank={userRank}
            loading={leaderboardLoading}
          />
        </main>

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowWithdrawModal(false)}
          >
            <div
              className="w-full max-w-[440px] bg-[#121212] rounded-2xl border border-[#fbbf24] shadow-[0_0_15px_rgba(255,184,0,0.15)] overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-2 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#fbbf24]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                    account_balance_wallet
                  </span>
                  Withdraw Assets
                </h2>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                    close
                  </span>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Balance Display */}
                <div className="mb-6 bg-black/40 rounded-xl p-4 border border-[#27272a]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Balance</span>
                    <span className="text-xs font-semibold text-[#fbbf24] bg-[#fbbf24]/10 px-2 py-0.5 rounded">MKIN TOKEN</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {(userRewards?.totalRealmkin || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-gray-400">MKIN</span>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 ml-1">Withdrawal Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full h-14 pl-4 pr-20 bg-[#1a1a1a] border border-[#333] rounded-xl text-lg font-semibold text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(userRewards?.totalRealmkin || 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold rounded-lg transition-colors uppercase tracking-tight"
                    >
                      MAX
                    </button>
                  </div>
                  <div className="flex justify-between px-1 mt-1">
                    <span className="text-[11px] text-gray-500">Min: 100 MKIN</span>
                    <span className="text-[11px] text-gray-500">Network Fee: 0.5%</span>
                  </div>
                </div>

                {/* Error Message */}
                {withdrawError && (
                  <div className="mt-4 bg-red-900/20 border border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-400">{withdrawError}</p>
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawLoading}
                  className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white font-bold text-base shadow-lg shadow-purple-900/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawLoading ? "Processing..." : "Confirm Withdrawal"}
                </button>

                <p className="text-center text-[10px] text-gray-600 mt-4 uppercase tracking-widest">
                  Secure transaction powered by Realmkin Vault
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            onClick={() => setShowTransferModal(false)}
          >
            <div
              className="w-full max-w-[440px] bg-[#121212] rounded-2xl border-2 border-[#fbbf24] relative overflow-hidden shadow-[0_0_50px_rgba(251,191,36,0.15)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/30">
                    <span className="material-symbols-outlined text-[#8b5cf6]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                      send
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Transfer Assets</h2>
                    <p className="text-xs text-gray-400">Send MKIN to any Realmkin address</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                    close
                  </span>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Recipient Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 ml-1">
                    Recipient Username/Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#fbbf24] transition-colors">
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                        person
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 0x71C... or @username"
                      value={transferRecipient}
                      onChange={(e) => setTransferRecipient(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#fbbf24] focus:border-[#fbbf24] transition-all placeholder:text-gray-600"
                    />
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Amount</label>
                    <span className="text-[10px] text-gray-500 font-mono">
                      Available: {(userRewards?.totalRealmkin || 0).toLocaleString()} MKIN
                    </span>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#fbbf24] transition-colors">
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                        token
                      </span>
                    </div>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 pl-11 pr-20 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#fbbf24] focus:border-[#fbbf24] transition-all placeholder:text-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setTransferAmount(String(userRewards?.totalRealmkin || 0))}
                      className="absolute right-2 top-1.5 bottom-1.5 px-4 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] text-[10px] font-bold rounded-lg border border-[#8b5cf6]/30 transition-all uppercase tracking-tighter"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Fee Info */}
                <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Estimated Network Fee</span>
                    <span className="text-xs font-mono text-gray-300">0.025 MKIN</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Transaction Time</span>
                    <span className="text-xs font-mono text-[#22c55e]">~30 Seconds</span>
                  </div>
                </div>

                {/* Error Message */}
                {transferError && (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-400">{transferError}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 pt-2">
                <button
                  onClick={handleTransfer}
                  disabled={transferLoading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white font-bold text-sm flex justify-center items-center gap-2 shadow-lg shadow-purple-900/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                    verified_user
                  </span>
                  {transferLoading ? "Processing..." : "Send Transfer"}
                </button>
                <p className="text-center text-[10px] text-gray-500 mt-4 px-4 leading-relaxed">
                  By confirming this transaction, you agree to the Realmkin Protocol terms. Please double check the recipient address before sending.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Edit Modal */}
        {user && account && (
          <ProfileEditModal
            isOpen={showProfileEditModal}
            onClose={() => setShowProfileEditModal(false)}
            userId={user.uid}
            walletAddress={account}
            currentUsername={currentUsername}
            currentAvatarUrl={currentAvatarUrl}
            onSuccess={() => {
              setProfileRefreshKey((prev) => prev + 1);
              setShowProfileEditModal(false);
            }}
          />
        )}

        {/* Transaction History Modal */}
        {user && (
          <TransactionHistoryModal
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            userId={user.uid}
          />
        )}

        {/* Confirmation Modals */}
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
