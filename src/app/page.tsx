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
import { nftService, NFTMetadata } from "@/services/nftService";
import {
  rewardsService,
  UserRewards,
  RewardsCalculation,
} from "@/services/rewardsService";

export default function Home() {
  const { user, userData, logout } = useAuth();
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

  const fetchUserNFTs = useCallback(async () => {
    if (!account || !user) return;

    console.log("🔍 Main Page: Fetching NFTs for account:", account);
    console.log("🔍 Main Page: Account type:", typeof account);
    console.log("🔍 Main Page: Account length:", account?.length);
    console.log(
      "🔍 Main Page: Detected wallet type:",
      detectWalletType(account)
    );

    setNftLoading(true);
    setNftError(null);

    try {
      const nftCollection = await nftService.fetchUserNFTs(account);
      setNfts(nftCollection.nfts);

      // Initialize/update rewards based on NFT count
      if (user) {
        try {
          // Get previous rewards to check for new NFTs
          const previousRewards = await rewardsService.getUserRewards(user.uid);
          const previousNFTCount = previousRewards?.totalNFTs || 0;

          const rewards = await rewardsService.initializeUserRewards(
            user.uid,
            account,
            nftCollection.nfts.length
          );
          setUserRewards(rewards);

          // Check for new NFTs and show bonus notification
          const newNFTsAcquired = Math.max(
            0,
            nftCollection.nfts.length - previousNFTCount
          );
          if (newNFTsAcquired > 0 && previousNFTCount > 0) {
            const bonusAmount = newNFTsAcquired * 200;
            setBonusNotification(
              `+₥${bonusAmount} bonus for ${newNFTsAcquired} new NFT${
                newNFTsAcquired > 1 ? "s" : ""
              }!`
            );
            // Clear notification after 5 seconds
            setTimeout(() => setBonusNotification(null), 5000);
          } else if (previousNFTCount === 0 && nftCollection.nfts.length > 0) {
            const welcomeBonus = nftCollection.nfts.length * 200;
            setBonusNotification(
              `Welcome bonus: +₥${welcomeBonus} for your ${
                nftCollection.nfts.length
              } NFT${nftCollection.nfts.length > 1 ? "s" : ""}!`
            );
            // Clear notification after 5 seconds
            setTimeout(() => setBonusNotification(null), 5000);
          }

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

      // Refetch user rewards to update the total balance
      const updatedRewards = await rewardsService.getUserRewards(user.uid);
      setUserRewards(updatedRewards);

      // Show withdrawal confirmation modal
      setLastClaimAmount(claimRecord.amount);
      setLastClaimWallet(account);
      setShowWithdrawalConfirmation(true);
    } catch (error) {
      console.error("Error claiming rewards:", error);
      setClaimError(
        error instanceof Error ? error.message : "Failed to claim rewards"
      );
    } finally {
      setClaimLoading(false);
    }
  }, [user, account, rewardsCalculation, nfts.length]);



  // Fetch NFTs when wallet connects
  useEffect(() => {
    console.log(
      "🔍 Main Page: useEffect triggered - isConnected:",
      isConnected,
      "account:",
      account
    );
    if (isConnected && account) {
      console.log("🔍 Main Page: Fetching NFTs for connected wallet");
      fetchUserNFTs();
    } else {
      console.log("🔍 Main Page: Clearing NFTs - wallet not connected");
      setNfts([]);
      setNftError(null);
    }
  }, [isConnected, account, fetchUserNFTs]);

  // Dynamic welcome message logic
  const getWelcomeMessage = () => {
    if (user && userData?.username) {
      return `Welcome ${userData.username}`;
    } else if (user) {
      return "Welcome";
    }
    return "Welcome";
  };
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black bg-gradient-to-br from-[#2b1c3b] via-[#2b1c3b] to-[#2b1c3b] bg-pattern p-3 sm:p-4 md:p-6 lg:p-8 xl:px-20 2xl:px-20">
        <div className="border-6 border-[#d3b136] animate-pulse-glow px-2 sm:px-4 md:px-6 py-0 min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)] xl:min-h-[calc(100vh-5rem)] 2xl:min-h-[calc(100vh-6rem)] max-w-7xl mx-auto">
          <div className="text-white font-sans">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-center px-2 sm:px-4 md:px-6 py-4 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden animate-float">
                  <Image
                    src="/realmkin-logo.png"
                    alt="Realmkin Logo"
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h1
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-[0.1em] sm:tracking-[0.15em] md:tracking-[0.2em] lg:tracking-[0.25em] xl:tracking-[0.3em] text-gradient"
                  style={{ fontFamily: "var(--font-hertical-sans)" }}
                >
                  THE REALMKIN
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-3 w-full sm:w-auto">
                {/* Admin Button */}
                {userData &&
                  [
                    "ABjnax7QfDmG6wR2KJoNc3UyiouwTEZ3b5tnTrLLyNSp",
                    "F1p6dNLSSTHi4QkUkRVXZw8QurZJKUDcvVBjfF683nU",
                  ].includes(userData.walletAddress ?? "") && (
                    <a
                      href="/admin"
                      className="relative group border-2 border-[#d3b136] bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 sm:px-4 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/20 w-full sm:w-auto btn-enhanced"
                      style={{
                        clipPath:
                          "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                      }}
                    >
                      <div
                        className="flex items-center justify-center space-x-2"
                        style={{ fontFamily: "var(--font-gothic-cg)" }}
                      >
                        <span className="text-base sm:text-lg">👑</span>
                        <span className="text-xs sm:text-sm font-bold tracking-wide">
                          ADMIN
                        </span>
                      </div>
                    </a>
                  )}

                {/* Connect Wallet Button */}
                <button
                  onClick={isConnected ? disconnectWallet : connectWallet}
                  disabled={isConnecting}
                  className={`relative group border-2 border-[#d3b136] font-bold py-2 px-3 sm:px-4 transition-all duration-300 transform hover:scale-105 w-full sm:w-auto btn-enhanced ${
                    isConnected
                      ? "bg-[#2b1c3b] hover:bg-purple-700 text-white shadow-lg shadow-yellow-400/20"
                      : "bg-[#2b1c3b] hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                  }`}
                  style={{
                    clipPath:
                      "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                  }}
                >
                  <div
                    className="flex items-center justify-center space-x-2"
                    style={{ fontFamily: "var(--font-gothic-cg)" }}
                  >
                    <span className="text-base sm:text-lg">
                      {isConnected ? "⚡" : "🔮"}
                    </span>
                    <span className="text-xs sm:text-sm font-bold tracking-wide">
                      {isConnecting
                        ? "LINKING..."
                        : isConnected
                        ? "LINKED"
                        : "LINK WALLET"}
                    </span>
                  </div>
                </button>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="relative group border-2 border-[#d3b136] bg-[#2b1c3b] hover:bg-red-700 text-white font-bold py-2 px-3 sm:px-4 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/20 w-full sm:w-auto btn-enhanced"
                  style={{
                    clipPath:
                      "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                  }}
                >
                  <div
                    className="flex items-center justify-center space-x-2"
                    style={{ fontFamily: "var(--font-gothic-cg)" }}
                  >
                    <span className="text-base sm:text-lg">⚔️</span>
                    <span className="text-xs sm:text-sm font-bold tracking-wide">
                      LOGOUT
                    </span>
                  </div>
                </button>
              </div>
            </header>

            <div className="px-2 sm:px-6 max-w-7xl mx-auto">
              {/* Welcome Section */}
              <div className="border-6 border-[#d3b136] p-4 sm:p-8 pt-6 sm:pt-10 mb-2 card-hover">
                <h2
                  className="text-4xl sm:text-6xl lg:text-8xl font-bold mb-6 sm:mb-10 tracking-wider text-center sm:text-left text-glow"
                  style={{ fontFamily: "var(--font-impact-regular)" }}
                >
                  {getWelcomeMessage().toUpperCase()}
                </h2>
                {isConnected && account && (
                  <p
                    className="text-2xl sm:text-3xl lg:text-4xl mb-4 sm:mb-6 font-bold text-gray-300 tracking-wider text-center sm:text-left"
                    style={{ fontFamily: "var(--font-impact-regular)" }}
                  >
                    {formatAddress(account)}
                  </p>
                )}

                <p className="text-sm sm:text-base lg:text-lg text-gray-300 max-w-2xl mx-auto sm:mx-0 text-center sm:text-left">
                  &ldquo; INCREASE YOUR WEEKLY EARNINGS BY HOLDING MORE NFTS-
                  EACH WARDEN KIN BOOSTS YOUR $MKIN REWARD &rdquo;
                </p>
              </div>

              {/* Account Section */}
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-row sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                  <h3
                    className="text-lg sm:text-2xl font-bold pl-2"
                    style={{ fontFamily: "var(--font-gothic-cg)" }}
                  >
                    ACCOUNT
                  </h3>
                  <div className="relative mb-2">
                    <div className="bg-cyan-500 text-white px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm tracking-wider shadow-lg shadow-cyan-500/30 animate-pulse-glow-teal">
                      <div
                        className="flex items-center justify-center space-x-2"
                        style={{ fontFamily: "var(--font-gothic-cg)" }}
                      >
                        <span>ACTIVE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {isConnected && account ? (
                  <div className="border-6 border-[#d3b136] p-4 card-hover">
                    <div className="flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-8">
                      <div className="coin-container w-36 h-36 sm:w-48 sm:h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96">
                        <div className="w-full h-full rounded-full overflow-hidden animate-spin-3d shadow-2xl shadow-yellow-400/20">
                          <Image
                            src="/realmkin.png"
                            alt="The Realmkin"
                            width={256}
                            height={256}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-3 sm:mb-4 md:mb-5 text-gradient">
                          {userRewards
                            ? rewardsService.formatMKIN(
                                userRewards.totalRealmkin
                              )
                            : "₥0 MKIN"}
                        </div>
                        <div className="mb-4">
                          <div className="text-base sm:text-lg md:text-xl text-cyan-400 mb-2">
                            Claimable:{" "}
                            {rewardsCalculation
                              ? rewardsService.formatMKIN(
                                  rewardsCalculation.pendingAmount
                                )
                              : "₥0"}
                          </div>
                          <div className="text-xs sm:text-sm md:text-base text-gray-300 mb-2">
                            {nfts.length} NFTs × ₥200/week ={" "}
                            {rewardsService.formatMKIN(nfts.length * 200)}
                            /week
                          </div>
                          {rewardsCalculation &&
                            !rewardsCalculation.canClaim &&
                            rewardsCalculation.nextClaimDate && (
                              <div className="text-xs sm:text-sm text-yellow-400">
                                Next claim:{" "}
                                {rewardsService.getTimeUntilNextClaim(
                                  rewardsCalculation.nextClaimDate
                                )}
                              </div>
                            )}
                          {claimError && (
                            <div className="text-xs text-red-400 mb-2">
                              {claimError}
                            </div>
                          )}
                          {bonusNotification && (
                            <div className="text-xs text-green-400 mb-2 animate-pulse">
                              🎉 {bonusNotification}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleClaimRewards}
                          disabled={
                            claimLoading || !rewardsCalculation?.canClaim
                          }
                          className={`
                            font-bold py-2 sm:py-3 md:py-4 px-4 sm:px-6 md:px-8 text-base sm:text-lg md:text-xl transition-all duration-300 w-full sm:w-auto btn-enhanced transform hover:scale-105 shadow-lg
                            ${
                              rewardsCalculation?.canClaim && !claimLoading
                                ? "bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/30"
                                : "bg-gray-600 text-gray-400 cursor-not-allowed shadow-gray-600/30"
                            }
                          `}
                        >
                          {claimLoading
                            ? "CLAIMING..."
                            : rewardsCalculation?.canClaim
                            ? "CLAIM"
                            : "NOT READY"}
                        </button>

                        <button
                          onClick={() => setShowRewardsDashboard(true)}
                          className="ml-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 text-xs sm:text-sm transition-all duration-300 btn-enhanced transform hover:scale-105 shadow-lg shadow-purple-500/30"
                        >
                          HISTORY
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-6 border-[#d3b136] p-6 sm:p-8 card-hover">
                    <div className="text-center py-8">
                      <div className="mb-6">
                        <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 animate-float">
                          💰
                        </div>
                        <h3
                          className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4 text-glow"
                          style={{ fontFamily: "var(--font-gothic-cg)" }}
                        >
                          CONNECT TO CLAIM REWARDS
                        </h3>
                        <p className="text-gray-300 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 px-3 sm:px-4">
                          Connect your wallet to access your ₥KIN token balance
                          and claim mining rewards
                        </p>
                      </div>
                      <div className="border-4 border-[#d3b136] bg-[#2b1c3b] p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 max-w-md mx-auto">
                        <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                          <div className="text-xl sm:text-2xl">💎</div>
                          <div className="text-xl sm:text-2xl">⚡</div>
                          <div className="text-xl sm:text-2xl">🏆</div>
                        </div>
                        <p className="text-white text-xs sm:text-sm font-bold">
                          EARN $MKIN TOKENS DAILY
                        </p>
                      </div>
                      <button
                        onClick={connectWallet}
                        disabled={isConnecting}
                        className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 md:py-4 md:px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-yellow-500/30 text-sm sm:text-base md:text-lg"
                      >
                        {isConnecting ? "CONNECTING..." : "CONNECT TO CLAIM"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* NFT Section */}
              <div className="mb-4 sm:mb-6">
                <div
                  className="flex flex-row sm:flex-row justify-between items-center mb-2 sm:space-y-0"
                  style={{ fontFamily: "var(--font-gothic-cg)" }}
                >
                  <h3 className="text-lg sm:text-2xl font-bold pl-2 text-glow">
                    MY WARDEN KINS
                  </h3>
                  <span className="text-lg sm:text-2xl font-bold text-gradient">
                    {isConnected && account
                      ? `${nfts.length} ${nfts.length === 1 ? "KIN" : "KINS"}`
                      : "CONNECT WALLET"}
                  </span>
                </div>

                {isConnected && account ? (
                  // Show NFT Cards when wallet is connected
                  <div className="border-6 border-[#d3b136] p-4 card-hover">
                    {/* Mobile: Horizontal Scroll */}
                    <div className="sm:hidden">
                      {nftLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d3b136]"></div>
                          <span className="ml-3 text-white text-sm">
                            Loading NFTs...
                          </span>
                        </div>
                      ) : nftError ? (
                        <div className="text-center py-6">
                          <div className="text-red-400 mb-3 text-4xl">⚠️</div>
                          <p className="text-red-400 text-xs mb-3">
                            {nftError}
                          </p>
                          <button
                            onClick={fetchUserNFTs}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                      ) : nfts.length > 0 ? (
                        <div
                          className={`
                            ${
                              nfts.length <= 2
                                ? "flex justify-center space-x-4"
                                : "flex space-x-3 overflow-x-auto"
                            }
                            pb-3 px-1
                          `}
                        >
                          {nfts.map((nft, index) => (
                            <NFTCard
                              key={nft.id}
                              nft={nft}
                              size="small"
                              animationDelay={`${index * 0.15}s`}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="text-5xl mb-3">🎭</div>
                          <p className="text-gray-400 text-xs">
                            No Realmkin NFTs found in this wallet
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Tablet & Desktop: Grid Layout */}
                    <div className="hidden sm:block">
                      {nftLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#d3b136]"></div>
                          <span className="ml-3 text-white text-base">
                            Loading NFTs...
                          </span>
                        </div>
                      ) : nftError ? (
                        <div className="text-center py-8">
                          <div className="text-red-400 mb-4 text-5xl">⚠️</div>
                          <p className="text-red-400 text-sm mb-4">
                            {nftError}
                          </p>
                          <button
                            onClick={fetchUserNFTs}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                      ) : nfts.length > 0 ? (
                        // Responsive grid that adapts to NFT count for optimal visual balance
                        <div
                          className={`
                            ${
                              nfts.length === 1
                                ? "flex justify-center" // Single NFT: centered
                                : nfts.length === 2
                                ? "grid grid-cols-2 gap-4 justify-items-center max-w-xl mx-auto" // Two NFTs: side by side
                                : nfts.length === 3
                                ? "grid grid-cols-1 sm:grid-cols-3 gap-3 justify-items-center max-w-3xl mx-auto" // Three NFTs: responsive row
                                : nfts.length === 4
                                ? "grid grid-cols-2 lg:grid-cols-4 gap-3 justify-items-center max-w-4xl mx-auto" // Four NFTs: 2x2 then 1x4
                                : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 justify-items-center" // Many NFTs: full responsive grid
                            }
                          `}
                        >
                          {nfts.map((nft, index) => (
                            <NFTCard
                              key={nft.id}
                              nft={nft}
                              size="medium"
                              animationDelay={`${index * 0.1}s`}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-7xl mb-4">🎭</div>
                          <p className="text-gray-400 text-base">
                            No Realmkin NFTs found in this wallet
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Show Connect Wallet CTA when wallet is not connected
                  <div className="border-6 border-[#d3b136] p-6 sm:p-8 card-hover">
                    {/* Mobile: Connect Wallet CTA */}
                    <div className="sm:hidden">
                      <div className="text-center py-8">
                        <div className="mb-6">
                          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 animate-float">
                            🔗
                          </div>
                          <h3
                            className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 text-glow"
                            style={{ fontFamily: "var(--font-gothic-cg)" }}
                          >
                            CONNECT YOUR WALLET
                          </h3>
                          <p className="text-gray-300 text-xs sm:text-sm mb-4 sm:mb-6 px-3 sm:px-4">
                            Connect your wallet to view and manage your Realmkin
                            NFT collection
                          </p>
                        </div>
                        <div className="border-4 border-[#d3b136] bg-[#2b1c3b] p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                          <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                            <div className="text-xl sm:text-2xl">🎭</div>
                            <div className="text-xl sm:text-2xl">⚔️</div>
                            <div className="text-xl sm:text-2xl">🏆</div>
                          </div>
                          <p className="text-white text-xs sm:text-sm font-bold">
                            DISCOVER YOUR LEGENDARY COLLECTION
                          </p>
                        </div>
                        <button
                          onClick={connectWallet}
                          disabled={isConnecting}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 w-full text-sm sm:text-base"
                        >
                          {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
                        </button>
                      </div>
                    </div>

                    {/* Desktop: Connect Wallet CTA */}
                    <div className="hidden sm:block">
                      <div className="text-center py-12">
                        <div className="mb-8">
                          <div className="text-7xl sm:text-8xl mb-5 sm:mb-6 animate-float">
                            🔗
                          </div>
                          <h3
                            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 sm:mb-6 text-glow"
                            style={{ fontFamily: "var(--font-gothic-cg)" }}
                          >
                            CONNECT YOUR WALLET
                          </h3>
                          <p className="text-gray-300 text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
                            Connect your wallet to view and manage your
                            legendary Realmkin NFT collection. Discover your
                            unique characters and their mystical powers.
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 max-w-md mx-auto">
                          <div className="border-4 border-[#d3b136] bg-[#2b1c3b] p-3 sm:p-4 rounded-lg card-hover">
                            <div className="text-3xl sm:text-4xl mb-2">🎭</div>
                            <p className="text-white text-xs sm:text-sm font-bold">
                              RARE CHARACTERS
                            </p>
                          </div>
                          <div className="border-4 border-[#d3b136] bg-[#2b1c3b] p-3 sm:p-4 rounded-lg card-hover">
                            <div className="text-3xl sm:text-4xl mb-2">⚔️</div>
                            <p className="text-white text-xs sm:text-sm font-bold">
                              EPIC POWERS
                            </p>
                          </div>
                          <div className="border-4 border-[#d3b136] bg-[#2b1c3b] p-3 sm:p-4 rounded-lg card-hover">
                            <div className="text-3xl sm:text-4xl mb-2">🏆</div>
                            <p className="text-white text-xs sm:text-sm font-bold">
                              LEGENDARY STATUS
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={connectWallet}
                          disabled={isConnecting}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/30 text-base sm:text-lg"
                        >
                          {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="mt-6 sm:mt-8 text-center mystical-glow">
                <h4
                  className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6 text-glow"
                  style={{ fontFamily: "var(--font-gothic-cg)" }}
                >
                  OUR SOCIALS:
                </h4>
                <SocialLinks />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Rewards Dashboard Modal */}
      <RewardsDashboard
        isOpen={showRewardsDashboard}
        onClose={() => setShowRewardsDashboard(false)}
      />

      {/* Withdrawal Confirmation Modal */}
      <WithdrawalConfirmationModal
        isOpen={showWithdrawalConfirmation}
        onClose={() => setShowWithdrawalConfirmation(false)}
        amount={lastClaimAmount}
        walletAddress={lastClaimWallet}
      />
    </ProtectedRoute>
  );
}
