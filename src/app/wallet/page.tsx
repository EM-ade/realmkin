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

// Lazy load background effects for better performance
const EtherealParticles = dynamic(
  () => import("@/components/MagicalAnimations").then(mod => mod.EtherealParticles),
  { ssr: false }
);
const ConstellationBackground = dynamic(
  () => import("@/components/MagicalAnimations").then(mod => mod.ConstellationBackground),
  { ssr: false }
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
  const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";
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

  const formattedWalletBalance = useMemo(
    () => `${rewardsService.formatMKIN(walletDisplayValue)} MKIN`,
    [walletDisplayValue]
  );

  const mobileMenuItems = useMemo(
    () => [
      { label: "Home", href: "/", icon: "/dashboard.png" },
      { label: "Wallet", href: "/wallet", icon: "/wallet.png" },
      { label: "Staking", href: "/staking", icon: "/staking.png" },
      { label: "Game", href: "/game", icon: "/game.png" },
      { label: "My NFT", href: "/my-nft", icon: "/flex-model.png" },
      { label: "Merches", href: "/merches", icon: "/merches.png" },
    ],
    []
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
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      setDiscordLinked(false);
      setShowDiscordMenu(false);
      setShowMobileActions(false);
      try {
        localStorage.removeItem('realmkin_discord_linked');
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


  const fetchUserNFTs = useCallback(async () => {
    if (!account || !user) return;

    setNftLoading(true);
    setNftError(null);

    try {
      // Fetch from both standard and premium contracts
      const nftCollection = await nftService.fetchAllContractNFTs(account);
      setNfts(nftCollection.nfts);

      // Initialize/update rewards based on NFT count and contract types
      if (user) {
        try {
          const rewards = await rewardsService.initializeUserRewards(
            user.uid,
            account,
            nftCollection.nfts.length,
            nftCollection.nfts
          );
          setUserRewards(rewards);

          // Calculate current pending rewards with contract-aware calculation
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

      // Mirror to unified ledger (debit)
      try {
        const auth = getAuth();
        const token = await auth.currentUser!.getIdToken();
        const refId = `withdraw:${user.uid}:${Date.now()}`;
        await fetch(`${gatekeeperBase}/api/ledger`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ delta: -Math.trunc(amount), reason: 'withdrawal', refId }),
        });
      } catch (e) {
        console.warn('Failed to mirror withdrawal to ledger:', e);
      }

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
  }, [user, account, withdrawAmount, userRewards, gatekeeperBase]);

  // Handle transfer
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
    // Call Gatekeeper transfer API (atomic debit/credit)
    const auth = getAuth();
    if (!auth.currentUser) {
      setTransferError("You must be signed in to transfer.");
      return;
    }
    const token = await auth.currentUser.getIdToken();
    const refId = `transfer:${auth.currentUser.uid}:${transferRecipient}:${Date.now()}`;
    const res = await fetch(`${gatekeeperBase}/api/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      throw new Error(j?.error || 'Transfer failed');
    }

    // Balance will be refreshed automatically via userRewards state

    // Show transfer confirmation
    setLastTransferAmount(amount);
    setLastTransferRecipient(transferRecipient);
    setShowTransferConfirmation(true);

    // Save to transaction history in Firestore
    await rewardsService.saveTransactionHistory({
      userId: user!.uid,
      walletAddress: account,
      type: "transfer",
      amount: amount,
      description: `Sent ${rewardsService.formatMKIN(amount)} to ${formatAddress(transferRecipient || '')}`,
      recipientAddress: transferRecipient,
    });

    // Add to local state
    setTransactionHistory((prev) => [
      {
        type: "transfer",
        amount: amount,
        description: `Sent ${rewardsService.formatMKIN(amount)} to ${formatAddress(transferRecipient || '')}`,
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
      error instanceof Error ? error.message : "Transfer failed"
    );
  } finally {
    setTransferLoading(false);
  }
}, [account, transferRecipient, transferAmount, userRewards, getUserByWallet, nfts.length, gatekeeperBase, user]);

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

  // Fetch Discord link status when user session changes
  useEffect(() => {
    async function checkLink() {
      try {
        const auth = getAuth();
        if (!auth.currentUser) {
          // Fall back to local cache
          try {
            const cachedLinked = localStorage.getItem("realmkin_discord_linked");
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
            const cachedLinked = localStorage.getItem("realmkin_discord_linked");
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
          <div className="w-auto flex-shrink-0">
            <button
              onClick={() => setShowMobileActions((v) => !v)}
              className="flex items-center gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
              aria-expanded={showMobileActions}
              aria-haspopup="true"
            >
              <span className={`text-xs transition-transform ${showMobileActions ? 'rotate-180' : ''}`}>⋯</span>
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

        {/* Main Content Container */}
        <div className="p-4 md:mx-[10%] lg:mx-[15%]">
        {/* Reward Section */}
        <section className="card mb-6 premium-card interactive-element">
          <h2 className="text-label mb-2">REWARD</h2>
          <div className="text-left">
            {/* <h1 className="text-3xl font-bold text-[#DA9C2F] tracking-wider">
              REALMKIN
            </h1>
            <p className="text-[#C4A962] text-sm">
              Web3 Gaming Ecosystem • Multi-Contract Support
            </p> */}
            <div className="flex justify-between items-center">
              <div className="text-white font-bold text-2xl">
                Claimable:{" "}
                <span className="">
                  {userRewards
                    ? rewardsService.formatMKIN(userRewards.pendingRewards)
                    : "₥0"}{" "}
                  MKIN
                </span>
              </div>

              {/* Wallet Balance - Right aligned */}
              {isConnected && (
                <div className="flex items-center gap-2 text-[#DA9C2F] font-medium text-sm">
                  <Image
                    src="/wallet.jpeg"
                    alt="Wallet"
                    width={20}
                    height={20}
                    className="w-5 h-5 object-contain"
                  />
                  <span className="whitespace-nowrap">{formattedWalletBalance}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center space-y-3 w-full">
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
                  className={`btn-primary w-full text-sm ${withdrawLoading ? "opacity-50 cursor-not-allowed" : ""}`}
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
          <h4 className="mb-3 text-xs uppercase tracking-[0.6em] text-white/70">OUR SOCIALS</h4>
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
