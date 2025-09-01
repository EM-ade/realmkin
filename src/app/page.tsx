"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { formatAddress, detectWalletType } from "@/utils/formatAddress";
import SocialLinks from "@/components/SocialLinks";
import NFTCard from "@/components/NFTCard";
import RewardsDashboard from "@/components/RewardsDashboard";
import WithdrawalConfirmationModal from "@/components/WithdrawalConfirmationModal";
import TransferConfirmationModal from "@/components/TransferConfirmationModal";
import { nftService, NFTMetadata } from "@/services/nftService";
import {
  rewardsService,
  UserRewards,
  RewardsCalculation,
} from "@/services/rewardsService";
import {
  MagicalButton,
  MagicalCard,
  EtherealParticles,
  ConstellationBackground,
  MagicalLoading
} from "@/components/MagicalAnimations";

export default function Home() {
  const { user, userData, logout, getUserByWallet } = useAuth();
  const {
    account,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
  } = useWeb3();

  // NFT state
  const [nfts, setNfts] = useState<NFTMetadata[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);

  // Rewards state
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
  const [rewardsCalculation, setRewardsCalculation] =
    useState<RewardsCalculation | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [showRewardsDashboard, setShowRewardsDashboard] = useState(false);
  const [bonusNotification, setBonusNotification] = useState<string | null>(
    null
  );
  const [showWithdrawalConfirmation, setShowWithdrawalConfirmation] =
    useState(false);
  const [lastClaimAmount, setLastClaimAmount] = useState<number>(0);
  const [lastClaimWallet, setLastClaimWallet] = useState<string>("");

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

  const fetchUserNFTs = useCallback(async () => {
    if (!account || !user) return;

    setNftLoading(true);
    setNftError(null);

    try {
      const nftCollection = await nftService.fetchUserNFTs(account);
      setNfts(nftCollection.nfts);

      // Initialize/update rewards based on NFT count
      if (user) {
        try {
          const rewards = await rewardsService.initializeUserRewards(
            user.uid,
            account,
            nftCollection.nfts.length
          );
          setUserRewards(rewards);

          // Calculate current pending rewards
          const calculation = rewardsService.calculatePendingRewards(
            rewards,
            nftCollection.nfts.length
          );
          setRewardsCalculation(calculation);
        } catch (error) {
          console.error("Error initializing rewards:", error);
        }
      }

      if (nftCollection.nfts.length === 0) {
        setNftError("No Realmkin NFTs found in this wallet");
      }
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      setNftError("Failed to load NFTs. Please try again.");
    } finally {
      setNftLoading(false);
    }
  }, [account, user]);

  // Handle reward claim
  const handleClaimRewards = useCallback(async () => {
    if (!user || !account || !rewardsCalculation?.canClaim) return;

    setClaimLoading(true);
    setClaimError(null);

    try {
      const claimRecord = await rewardsService.claimRewards(user.uid, account);

      // Refresh rewards data after claim
      const rewards = await rewardsService.initializeUserRewards(
        user.uid,
        account,
        nfts.length
      );
      setUserRewards(rewards);

      const calculation = rewardsService.calculatePendingRewards(
        rewards,
        nfts.length
      );
      setRewardsCalculation(calculation);

      // Show withdrawal confirmation modal
      setLastClaimAmount(claimRecord.amount);
      setLastClaimWallet(account);
      setShowWithdrawalConfirmation(true);

      // Save to transaction history in Firestore
      await rewardsService.saveTransactionHistory({
        userId: user.uid,
        walletAddress: account,
        type: "claim",
        amount: claimRecord.amount,
        description: `Claimed ${rewardsService.formatMKIN(claimRecord.amount)}`,
      });

      // Add to local state
      setTransactionHistory((prev) => [
        {
          type: "claim",
          amount: claimRecord.amount,
          description: `Claimed ${rewardsService.formatMKIN(claimRecord.amount)}`,
          date: new Date(),
        },
        ...prev.slice(0, 9), // Keep only last 10 transactions
      ]);
    } catch (error) {
      console.error("Error claiming rewards:", error);
      setClaimError(
        error instanceof Error ? error.message : "Failed to claim rewards"
      );
    } finally {
      setClaimLoading(false);
    }
  }, [user, account, rewardsCalculation, nfts.length]);

  // Handle withdrawal
  const handleWithdraw = useCallback(async () => {
    if (!user || !account || !withdrawAmount) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError("Please enter a valid amount");
      return;
    }

    // Check if user has sufficient balance
    const userBalance = userRewards?.totalRealmkin || 0;
    if (amount > userBalance) {
      setWithdrawError("Insufficient funds for withdrawal");
      return;
    }

    setWithdrawLoading(true);
    setWithdrawError(null);

    try {
      // Simulate withdrawal process (replace with actual blockchain transaction)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Show withdrawal confirmation
      setLastClaimAmount(amount);
      setLastClaimWallet(account);
      setShowWithdrawalConfirmation(true);

      // Save to transaction history in Firestore
      await rewardsService.saveTransactionHistory({
        userId: user.uid,
        walletAddress: account,
        type: "withdraw",
        amount: amount,
        description: `Withdrawn ${rewardsService.formatMKIN(amount)}`,
      });

      // Add to local state
      setTransactionHistory((prev) => [
        {
          type: "withdraw",
          amount: amount,
          description: `Withdrawn ${rewardsService.formatMKIN(amount)}`,
          date: new Date(),
        },
        ...prev.slice(0, 9), // Keep only last 10 transactions
      ]);

      // Clear input field
      setWithdrawAmount("");
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      setWithdrawError(
        error instanceof Error ? error.message : "Failed to process withdrawal"
      );
    } finally {
      setWithdrawLoading(false);
    }
  }, [user, account, withdrawAmount, userRewards]);

  // Handle transfer
  const handleTransfer = useCallback(async () => {
    if (!user || !account || !transferRecipient || !transferAmount) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError("Please enter a valid amount");
      return;
    }

    // Validate recipient address (basic validation)
    if (transferRecipient.length < 6) {
      setTransferError("Please enter a valid recipient address");
      return;
    }

    // Check if user has sufficient balance
    const userBalance = userRewards?.totalRealmkin || 0;
    if (amount > userBalance) {
      setTransferError("Insufficient funds for transfer");
      return;
    }

    setTransferLoading(true);
    setTransferError(null);

    try {
      // Check if recipient is a registered user
      const recipientUser = await getUserByWallet(transferRecipient);
      if (!recipientUser) {
        setTransferError(
          "Recipient is not a registered user. They must create an account first."
        );
        return;
      }

      // Get recipient user ID from wallet mapping
      const recipientUserId = await rewardsService.getUserIdByWallet(
        transferRecipient
      );
      if (!recipientUserId) {
        setTransferError("Could not find recipient user ID");
        return;
      }

      // Execute actual transfer
      await rewardsService.transferMKIN(user.uid, recipientUserId, amount);

      // Refresh user rewards to get updated balance
      if (user) {
        const rewards = await rewardsService.initializeUserRewards(
          user.uid,
          account,
          nfts.length
        );
        setUserRewards(rewards);

        const calculation = rewardsService.calculatePendingRewards(
          rewards,
          nfts.length
        );
        setRewardsCalculation(calculation);
      }

      // Show transfer confirmation
      setLastTransferAmount(amount);
      setLastTransferRecipient(transferRecipient);
      setShowTransferConfirmation(true);

      // Save to transaction history in Firestore
      await rewardsService.saveTransactionHistory({
        userId: user.uid,
        walletAddress: account,
        type: "transfer",
        amount: amount,
        description: `Sent ${rewardsService.formatMKIN(amount)} to ${formatAddress(transferRecipient)}`,
        recipientAddress: transferRecipient,
      });

      // Add to local state
      setTransactionHistory((prev) => [
        {
          type: "transfer",
          amount: amount,
          description: `Sent ${rewardsService.formatMKIN(amount)} to ${formatAddress(transferRecipient)}`,
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
        error instanceof Error ? error.message : "Failed to process transfer"
      );
    } finally {
      setTransferLoading(false);
    }
  }, [
    user,
    account,
    transferRecipient,
    transferAmount,
    userRewards,
    getUserByWallet,
    nfts.length,
  ]);

  // Fetch transaction history when user changes
  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (user?.uid) {
        try {
          const history = await rewardsService.getTransactionHistory(user.uid, 10);
          const formattedHistory = history.map(transaction => ({
            type: transaction.type as "claim" | "withdraw" | "transfer",
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.createdAt
          }));
          setTransactionHistory(formattedHistory);
        } catch (error) {
          console.error("Error fetching transaction history:", error);
        }
      }
    };

    fetchTransactionHistory();
  }, [user?.uid]);

  // Fetch NFTs when wallet connects
  useEffect(() => {
    if (isConnected && account) {
      fetchUserNFTs();
    } else {
      setNfts([]);
      setNftError(null);
    }
  }, [isConnected, account, fetchUserNFTs]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#080806] p-4 relative overflow-hidden">
        <EtherealParticles />
        <ConstellationBackground />
        {/* Header Section */}
        <header className="flex justify-between items-center mb-6 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14  animate-float">
              <Image
                src="/realmkin-logo.jpeg"
                alt="Realmkin Logo"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="font-bold text-lg w-1/2 uppercase tracking-wider gold-gradient-text">
              THE REALMKIN
            </h1>
          </div>

          {isConnected && account && (
            <div className="bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040]">
              <div className="text-[#DA9C2F] font-medium text-sm whitespace-nowrap flex items-center gap-2">
                <Image
                  src="/wallet.jpeg"
                  alt="Wallet Logo"
                  width={16}
                  height={16}
                  className="w-6 h-6 object-contain"
                />
                {userRewards
                  ? rewardsService.formatMKIN(userRewards.totalRealmkin)
                  : "0"}{" "}
                MKIN
              </div>
            </div>
          )}
        </header>

        {/* Reward Section */}
        <section className="card mb-6 premium-card interactive-element">
          <h2 className="text-label mb-2">REWARD</h2>
          <div className="text-left">
            <div className="text-white font-bold text-2xl mb-2">
              Claimable:{" "}
              <span className="">
                {rewardsCalculation
                  ? rewardsService.formatMKIN(rewardsCalculation.pendingAmount)
                  : "₥0"}{" "}
                MKIN
              </span>
            </div>

            <button
              onClick={handleClaimRewards}
              disabled={claimLoading || !rewardsCalculation?.canClaim}
              className="btn-primary w-1/2 mb-3"
            >
              {claimLoading
                ? "CLAIMING..."
                : rewardsCalculation?.canClaim
                ? "CLAIM REWARDS"
                : "NOT READY"}
            </button>
            {rewardsCalculation &&
              !rewardsCalculation.canClaim &&
              rewardsCalculation.nextClaimDate && (
                <div className="text-xs text-center w-1/2 text-[#DA9C2F]">
                  Available in{" "}
                  {rewardsService.getTimeUntilNextClaim(
                    rewardsCalculation.nextClaimDate
                  )}
                </div>
              )}
          </div>
        </section>

        {/* Combined Actions Section */}
        <section className="mb-6">
          {/* <h2 className="text-label mb-4">ACTIONS</h2> */}
          <div className="card grid grid-cols-[65%_30%] md:grid-cols-2 gap-4">
            {/* Left Column: Withdraw + History */}
            <div className="">
              <h3 className="text-label mb-3">WITHDRAW</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-muted text-xs block mb-1">
                    Amount
                  </label>
                  <input
                    type="text"
                    placeholder="0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
                {withdrawError && (
                  <div className="error-message warning">{withdrawError}</div>
                )}
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawLoading}
                  className="btn-primary w-full text-sm"
                >
                  {withdrawLoading ? "PROCESSING..." : "WITHDRAW"}
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
                      <p className="text-muted text-xs">No transactions yet</p>
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
        <section className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-label">MY WARDEN KINS</h2>
            <span className="text-white font-medium text-sm">
              {isConnected && account
                ? `${nfts.length} ${nfts.length === 1 ? "KIN" : "KINS"}`
                : "CONNECT WALLET"}
            </span>
          </div>

          {isConnected && account ? (
            <div className="card">
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
            <div className="card text-center py-8">
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
          )}
        </section>

        {/* Social Links */}
        <section className="text-center">
          <h4 className="text-label mb-3">OUR SOCIALS</h4>
          <SocialLinks />
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
    </ProtectedRoute>
  );
}
