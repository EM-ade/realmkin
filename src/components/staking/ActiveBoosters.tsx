import React, { useState, useEffect } from 'react';
import { BoosterSlot } from './BoosterSlot';
import { toast } from 'react-hot-toast';

interface Booster {
  type: string;
  name: string;
  multiplier: number;
  category: string;
  mints: string[];
  detectedAt: Date;
}

interface ActiveBoostersProps {
  boosters: Booster[];
  isDetecting?: boolean;
  detectionError?: string | null;
  onRefresh?: () => void;
  onRetry?: () => void;
  lastUpdated?: Date | null;
}

export function ActiveBoosters({
  boosters = [],
  isDetecting = false,
  detectionError = null,
  onRefresh,
  onRetry,
  lastUpdated,
}: ActiveBoostersProps) {
  const [expandedBooster, setExpandedBooster] = useState<string | null>(null);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');

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
    if (onRefresh) {
      try {
        await onRefresh();
        toast.success('Boosters refreshed successfully');
      } catch (error) {
        toast.error('Failed to refresh boosters');
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
    <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] font-medium">
          Active Boosters
        </h3>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[#f7dca1]/40 text-xs">
              Last updated: {timeSinceUpdate}
            </span>
          )}
          <button
            onClick={handleRefresh}
            className="text-[#f7dca1]/40 hover:text-[#f4c752] text-xs uppercase tracking-wider transition-colors"
            disabled={isDetecting}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {boosters.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-[#f7dca1]/60 text-sm mb-4">No active boosters detected</div>
          <div className="text-[#f7dca1]/40 text-xs mb-4">
            Hold Realmkin NFTs to activate mining boosters
          </div>
          <div className="grid grid-cols-3 gap-4">
            <BoosterSlot />
            <BoosterSlot />
            <BoosterSlot />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {boosters.map((booster, index) => (
              <div
                key={`${booster.type}_${index}`}
                className="relative"
                onClick={() => handleBoosterClick(booster.type)}
              >
                <BoosterSlot booster={booster} />
                
                {/* Status indicator */}
                <div className="absolute -top-1 -right-1 px-2 py-1 bg-black/80 rounded-full">
                  <span className={`text-xs font-medium ${getBoosterStatusColor(booster)}`}>
                    {getBoosterStatusText(booster)}
                  </span>
                </div>
                
                {/* Expanded details */}
                {expandedBooster === booster.type && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-black/90 border border-[#f4c752]/30 rounded-lg p-4 shadow-xl">
                    <div className="text-[#f7dca1]/80 text-xs uppercase tracking-wider mb-2">
                      {booster.name} Details
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#f7dca1]/60">Multiplier:</span>
                        <span className="text-[#f4c752] font-mono">×{booster.multiplier}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-[#f7dca1]/60">NFTs:</span>
                        <span className="text-[#f4c752]">{booster.mints.length}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-[#f7dca1]/60">Detected:</span>
                        <span className="text-[#f7dca1]/60">
                          {new Date(booster.detectedAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-[#f7dca1]/60">Status:</span>
                        <span className={`${getBoosterStatusColor(booster)}`}>
                          {getBoosterStatusText(booster)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-[#f4c752]/20">
                      <div className="text-center">
                        <button
                          onClick={() => setExpandedBooster(null)}
                          className="text-[#f7dca1]/40 hover:text-[#f4c752] text-xs uppercase tracking-wider transition-colors"
                        >
                          Close Details
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Booster Summary */}
          <div className="mt-6 pt-4 border-t border-[#f4c752]/20">
            <div className="text-[#f7dca1]/60 text-xs uppercase tracking-wider mb-3">
              Booster Summary
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/40 border border-[#f4c752]/20 rounded-lg p-4">
                <div className="text-[#f7dca1]/60 text-xs uppercase tracking-wider mb-2">
                  Total Multiplier
                </div>
                <div className="text-2xl font-bold text-[#f4c752] font-mono">
                  ×{totalMultiplier.toFixed(3)}
                </div>
                <div className="text-[#f7dca1]/40 text-xs mt-1">
                  {boosters.length} active booster{boosters.length === 1 ? '' : 's'}
                </div>
              </div>
              
              <div className="bg-black/40 border border-[#f4c752]/20 rounded-lg p-4">
                <div className="text-[#f7dca1]/60 text-xs uppercase tracking-wider mb-2">
                  Mining Rate Boost
                </div>
                <div className="text-2xl font-bold text-green-400 font-mono">
                  +{((totalMultiplier - 1) * 100).toFixed(1)}%
                </div>
                <div className="text-[#f7dca1]/40 text-xs mt-1">
                  From {boosters.length} booster{boosters.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}