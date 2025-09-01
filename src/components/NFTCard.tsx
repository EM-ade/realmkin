"use client";

import React, { useState } from "react";
import Image from "next/image";
import { NFTMetadata } from "@/services/nftService";

interface NFTCardProps {
  nft: NFTMetadata;
  size?: "small" | "medium" | "large";
  showDetails?: boolean;
  animationDelay?: string;
}

const NFTCard: React.FC<NFTCardProps> = ({
  nft,
  size = "medium",
  showDetails = true,
  animationDelay = "0s",
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const sizeClasses = {
    small: {
      container: "w-full",
      image: "w-full aspect-square",
      text: "text-xs",
      title: "text-xs",
      power: "text-[10px]",
    },
    medium: {
      container: "w-full",
      image: "w-full aspect-square",
      text: "text-sm",
      title: "text-sm",
      power: "text-xs",
    },
    large: {
      container: "w-full max-w-[280px]",
      image: "w-full aspect-square",
      text: "text-base",
      title: "text-base",
      power: "text-sm",
    },
  };

  const currentSize = sizeClasses[size];

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toUpperCase()) {
      case "LEGENDARY":
        return "#d4af37";
      case "EPIC":
        return "#9333ea";
      case "RARE":
        return "#3b82f6";
      case "COMMON":
        return "#6b7280";
      default:
        return "#ef4444";
    }
  };

  return (
    <div
      className={`bg-[#2d2d2d] border border-[#404040] rounded-lg overflow-hidden ${currentSize.container} transition-all duration-200 hover:border-[#d4af37]`}
      style={{ animationDelay }}
    >
      {/* NFT Image */}
      <div
        className={`${currentSize.image} bg-[#3d3d3d] flex items-center justify-center relative`}
        style={{
          borderBottom: `2px solid ${getRarityColor(nft.rarity || "")}`,
        }}
      >
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="loading-realmkin">
              <div className="loading-realmkin-spinner"></div>
              <div className="loading-realmkin-particles">
                <div className="loading-realmkin-particle"></div>
                <div className="loading-realmkin-particle"></div>
                <div className="loading-realmkin-particle"></div>
                <div className="loading-realmkin-particle"></div>
              </div>
            </div>
          </div>
        )}

        {!imageError && nft.image ? (
          <Image
            src={nft.image}
            alt={nft.name}
            width={200}
            height={200}
            className="w-full h-full object-cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
            priority={false}
          />
        ) : (
          <div className="text-3xl">🎭</div>
        )}
      </div>

      {/* NFT Details */}
      {showDetails && (
        <div className="p-3">
          <div className="flex justify-between items-center mb-2">
            <div
              className={`text-white font-semibold ${currentSize.title} truncate`}
              style={{ color: getRarityColor(nft.rarity || "") }}
            >
              {nft.rarity || "LEGENDARY"}
            </div>
            <div className={`text-white font-medium ${currentSize.power}`}>
              {nft.power || 0}
            </div>
          </div>

          <div
            className={`text-gray-300 ${currentSize.text} truncate mb-1`}
            title={nft.name}
          >
            {nft.name}
          </div>

          <div className="text-[#10b981] text-xs font-medium">OWNED</div>
        </div>
      )}
    </div>
  );
};

export default NFTCard;
