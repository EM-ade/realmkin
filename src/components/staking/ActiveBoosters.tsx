import React, { useState, useEffect } from 'react';
import { BoosterSlot } from './BoosterSlot';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface NFTDetail {
  mint: string;
  name: string;
  image: string | null;
  symbol?: string;
  description?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

interface Booster {
  type: string;
  name: string;
  multiplier: number;
  category?: string;
  mints: string[];
  detectedAt: Date | string;
  nftDetails?: NFTDetail[];
}

interface ActiveBoostersProps {
  boosters: Booster[];
  isDetecting?: boolean;
  detectionError?: string | null;
  onRefresh?: () => void;
  onRetry?: () => void;
  lastUpdated?: Date | null;
  showNFTImages?: boolean;
}

export function ActiveBoosters({
  boosters = [],
  isDetecting = false,
  detectionError = null,
  onRefresh,
  onRetry,
  lastUpdated,
  showNFTImages = true,
}: ActiveBoostersProps) {
  const [expandedBooster, setExpandedBooster] = useState<string | null>(null);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate time since last update
  useEffect(() => {
    if (lastUpdated) {
      const updateInterval = setInterval(() => {
        const now = new Date();
        const diffMs = now.getTime() - lastUpdated.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffHours > 0) {
          setTimeSinceUpdate(`${diffHours}h ago`);
        } else if (diffMins > 0) {
          setTimeSinceUpdate(`${diffMins}m ago`);
        } else {
          setTimeSinceUpdate('Just now');
        }
      }, 10000);

      return () => clearInterval(updateInterval);
    };
  }, [lastUpdated]);

  const resetTimeSinceUpdate = () => {
    setTimeSinceUpdate('');
  };

  useEffect(() => {
    resetTimeSinceUpdate();
  }, [lastUpdated]);

  const handleBoosterClick = (boosterType: string) => {
    setExpandedBooster(expandedBooster === boosterType ? null : boosterType);
  };

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
        toast.success('Boosters refreshed successfully');
      } catch (error) {
        toast.error('Failed to refresh boosters');
      } finally {
        // Keep spinning for at least 600ms for visual feedback
        setTimeout(() => setIsRefreshing(false), 600);
      }
    }
  };

  const handleRetry = async () => {
    if (onRetry) {
      try {
        await onRetry();
        toast.success('Booster detection retried');
      } catch (error) {
        toast.error('Failed to retry booster detection');
      }
    }
  };

  const getBoosterStatusColor = (booster: Booster) => {
    const now = new Date();
    const detectedAt = new Date(booster.detectedAt);
    const ageMinutes = (now.getTime() - detectedAt.getTime()) / 60000;
    
    if (ageMinutes < 5) {
      return 'text-green-400';
    } else if (ageMinutes < 30) {
      return 'text-yellow-400';
    } else {
      return 'text-orange-400';
    }
  };

  const getBoosterStatusText = (booster: Booster) => {
    const now = new Date();
    const detectedAt = new Date(booster.detectedAt);
    const ageMinutes = (now.getTime() - detectedAt.getTime()) / 60000;
    
    if (ageMinutes < 5) {
      return 'Active';
    } else if (ageMinutes < 30) {
      return 'Recently detected';
    } else {
      return 'Needs refresh';
    }
  };

  const calculateTotalMultiplier = () => {
    if (boosters.length === 0) return 1.0;
    
    return boosters.reduce((total: number, booster: Booster) => {
      return total * booster.multiplier;
    }, 1.0);
  };

  const totalMultiplier = calculateTotalMultiplier();

  if (isDetecting) {
    return (
      <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] font-medium">
            Active Boosters
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 border-2 border-t border-[#f4c752] border-r-transparent animate-spin rounded-full border-t-[#f4c752]" />
            <span className="text-[#f7dca1]/40 text-xs">Detecting boosters...</span>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-[#f4c752]/10 rounded-lg">
              <div className="w-2 h-2 bg-[#f4c752] rounded-full animate-pulse" />
              <span className="text-[#f4c752] text-sm">Scanning wallet for NFTs...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (detectionError) {
    return (
      <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] font-medium">
            Active Boosters
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-xs">⚠️ Detection failed</span>
          </div>
        </div>
        
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
          <div className="text-red-400 text-sm mb-2">{detectionError}</div>
          <button
            onClick={handleRetry}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry Detection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] font-medium">
          Active Boosters
        </h3>
        <button
          onClick={handleRefresh}
          className="text-[#f7dca1]/40 hover:text-[#f4c752] transition-colors p-2 hover:bg-[#f4c752]/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isDetecting || isRefreshing}
          title="Refresh boosters"
        >
          <svg 
            className={`w-4 h-4 transition-transform ${(isDetecting || isRefreshing) ? 'animate-spin-custom' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </button>
      </div>

      {boosters.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-[#f7dca1]/60 text-sm mb-2">No active boosters detected</div>
          <div className="text-[#f7dca1]/40 text-xs">
            Hold Realmkin NFTs to activate mining boosters
          </div>
        </div>
      ) : (
        <>
          {/* Booster Cards */}
          <div className="space-y-2 mb-4">
            {boosters.map((booster, index) => (
              <div
                key={`${booster.type}_${index}`}
                className="bg-black/60 border border-[#f4c752]/30 rounded-lg p-3 hover-lift hover-border-glow cursor-pointer animate-shimmer"
                onClick={() => handleBoosterClick(booster.type)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#f4c752]/20 to-[#f4c752]/5 border border-[#f4c752]/30">
                      {booster.type === 'random_1_1' && (
                        <svg className="w-6 h-6 text-[#f4c752]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 12a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm10-12a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zm0 12a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z"/>
                        </svg>
                      )}
                      {booster.type === 'custom_1_1' && (
                        <svg className="w-6 h-6 text-[#f4c752]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      )}
                      {booster.type === 'solana_miner' && (
                        <svg className="w-6 h-6 text-[#f4c752]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="text-[#f4c752] font-bold text-sm uppercase tracking-wider">
                        {booster.name}
                      </div>
                      <div className="text-[#f7dca1]/60 text-xs">
                        {booster.mints.length} NFT{booster.mints.length === 1 ? '' : 's'} detected
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[#f4c752] font-bold text-lg font-mono">
                      ×{booster.multiplier.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                {/* Expanded details */}
                {expandedBooster === booster.type && (
                  <div className="mt-4 pt-4 border-t border-[#f4c752]/20">
                    {/* NFT Images Gallery */}
                    {showNFTImages && booster.nftDetails && booster.nftDetails.length > 0 && (
                      <div className="mb-4">
                        <div className="text-[#f7dca1]/60 text-xs mb-2 uppercase tracking-wider">Your Booster NFTs</div>
                        <div className="flex flex-wrap gap-2">
                          {booster.nftDetails.map((nft, nftIndex) => (
                            <div 
                              key={nft.mint || nftIndex} 
                              className="relative group/nft"
                              title={`${nft.name}\n${nft.mint.slice(0, 8)}...${nft.mint.slice(-6)}`}
                            >
                              {nft.image ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#f4c752]/30 hover:border-[#f4c752] transition-colors">
                                  <Image
                                    src={nft.image}
                                    alt={nft.name}
                                    width={64}
                                    height={64}
                                    className="object-cover w-full h-full"
                                    loading="lazy"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-black/60 border border-[#f4c752]/30 flex items-center justify-center">
                                  <span className="text-[#f7dca1]/40 text-2xl">🖼️</span>
                                </div>
                              )}
                              {/* NFT Name Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover/nft:opacity-100 transition-opacity pointer-events-none z-20">
                                <div className="bg-black/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-white whitespace-nowrap max-w-[150px] truncate">
                                  {nft.name}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-[#f7dca1]/60 text-xs mb-1">Multiplier</div>
                        <div className="text-[#f4c752] font-mono">×{booster.multiplier}</div>
                      </div>
                      <div>
                        <div className="text-[#f7dca1]/60 text-xs mb-1">Mining Rate Boost</div>
                        <div className="text-green-400 font-mono">+{((booster.multiplier - 1) * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-[#f7dca1]/60 text-xs mb-1">NFTs Detected</div>
                        <div className="text-[#f4c752]">{booster.mints.length}</div>
                      </div>
                      <div>
                        <div className="text-[#f7dca1]/60 text-xs mb-1">Detected At</div>
                        <div className="text-[#f7dca1]/60 text-xs">
                          {new Date(booster.detectedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Mint addresses (collapsed) */}
                    {booster.mints.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#f4c752]/10">
                        <div className="text-[#f7dca1]/40 text-xs mb-1">Mint Addresses</div>
                        <div className="space-y-1">
                          {booster.mints.slice(0, 3).map((mint, i) => (
                            <div key={mint} className="text-[#f7dca1]/50 text-xs font-mono truncate">
                              {mint.slice(0, 12)}...{mint.slice(-8)}
                            </div>
                          ))}
                          {booster.mints.length > 3 && (
                            <div className="text-[#f7dca1]/40 text-xs">
                              +{booster.mints.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedBooster(null);
                        }}
                        className="text-[#f7dca1]/40 hover:text-[#f4c752] text-xs uppercase tracking-wider transition-colors"
                      >
                        Close Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Booster Summary */}
          <div className="pt-4 border-t border-[#f4c752]/20">
            <div className="text-[#f7dca1]/60 text-xs uppercase tracking-wider mb-3">
              Booster Summary
            </div>
            <div className="bg-black/60 border border-[#f4c752]/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[#f7dca1]/60 text-xs uppercase tracking-wider mb-1">
                    Total Multiplier
                  </div>
                  <div className="text-2xl font-bold text-[#f4c752] font-mono">
                    ×{totalMultiplier.toFixed(3)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#f7dca1]/60 text-xs uppercase tracking-wider mb-1">
                    Mining Rate Boost
                  </div>
                  <div className="text-2xl font-bold text-green-400 font-mono">
                    +{((totalMultiplier - 1) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="text-[#f7dca1]/40 text-xs mt-3 text-center">
                From {boosters.length} active booster{boosters.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}