import React, { useState } from "react";
import Image from "next/image";

interface NFTDetail {
  mint: string;
  name: string;
  image: string | null;
  symbol?: string;
  description?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

interface BoosterSlotProps {
  booster?: {
    type: string;
    name: string;
    multiplier: number;
    category?: string;
    mints: string[];
    detectedAt: Date | string;
    nftDetails?: NFTDetail[];
  };
  onClick?: () => void;
  showNFTImage?: boolean;
}

export function BoosterSlot({
  booster,
  onClick,
  showNFTImage = true,
}: BoosterSlotProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const getBoosterColor = (type: string) => {
    switch (type) {
      case "random_1_1":
        return "from-blue-500/20 to-blue-600";
      case "custom_1_1":
        return "from-purple-500/20 to-purple-600";
      case "solana_miner":
        return "from-orange-500/20 to-orange-600";
      default:
        return "from-gray-500/20 to-gray-600";
    }
  };

  const getBoosterIcon = (type: string) => {
    switch (type) {
      case "random_1_1":
        return "🎲";
      case "custom_1_1":
        return "🎨";
      case "solana_miner":
        return "⛏️";
      default:
        return "✨";
    }
  };

  const getBoosterBorderColor = (type: string) => {
    switch (type) {
      case "random_1_1":
        return "border-blue-500/50 hover:border-blue-400";
      case "custom_1_1":
        return "border-purple-500/50 hover:border-purple-400";
      case "solana_miner":
        return "border-orange-500/50 hover:border-orange-400";
      default:
        return "border-[#f4c752]/20 hover:border-[#f4c752]/50";
    }
  };

  // Get the first NFT image from nftDetails
  const nftImage = booster?.nftDetails?.[0]?.image;
  const nftName = booster?.nftDetails?.[0]?.name;
  const hasValidImage = showNFTImage && nftImage && !imageError;

  return (
    <div
      onClick={onClick}
      className={`relative aspect-square rounded-xl bg-black/40 border ${booster ? getBoosterBorderColor(booster.type) : "border-[#f4c752]/20 hover:border-[#f4c752]/50"} transition-all cursor-pointer group overflow-hidden flex items-center justify-center`}
    >
      {booster ? (
        <>
          {/* Background - either NFT image or gradient */}
          <div className="absolute inset-0">
            {hasValidImage ? (
              <>
                {/* Loading skeleton */}
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
                )}
                {/* NFT Image */}
                <Image
                  src={nftImage}
                  alt={nftName || booster.name}
                  fill
                  className={`object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  sizes="(max-width: 768px) 100vw, 200px"
                  loading="lazy"
                />
                {/* Overlay gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </>
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-br ${getBoosterColor(booster.type)}`}
              />
            )}
          </div>

          {/* Content overlay */}
          <div className="z-10 text-center p-2 flex flex-col justify-end h-full">
            <div className="mt-auto">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-lg drop-shadow-lg">
                  {getBoosterIcon(booster.type)}
                </span>
                <div className="text-[#f4c752] font-bold text-sm uppercase tracking-wider drop-shadow-lg">
                  {booster.name}
                </div>
              </div>
              <div className="text-white/80 text-xs font-semibold drop-shadow-lg">
                ×
                {(booster.mints.length > 0 && booster.multiplier > 1.0
                  ? Math.pow(booster.multiplier, booster.mints.length)
                  : booster.multiplier
                ).toFixed(2)}{" "}
                Multiplier
              </div>
              <div className="text-white/60 text-xs mt-1 drop-shadow-lg">
                {booster.mints.length} NFT
                {booster.mints.length === 1 ? "" : "s"} detected
              </div>
            </div>
          </div>

          {/* Active badge */}
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#f4c752] text-black text-[10px] font-bold uppercase rounded-full shadow-lg">
            Active
          </div>

          {/* Hover effect - show NFT name tooltip */}
          {hasValidImage && nftName && (
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-[80%]">
              <div className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white truncate">
                {nftName}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 text-[#f7dca1]/30 group-hover:text-[#f4c752]/60 transition-colors">
          <span className="text-2xl">+</span>
          <span className="text-xs uppercase tracking-widest">Add Booster</span>
        </div>
      )}
    </div>
  );
}
