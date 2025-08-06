"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { NFTMetadata } from '@/services/nftService';

interface NFTCardProps {
  nft: NFTMetadata;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  animationDelay?: string;
}

const NFTCard: React.FC<NFTCardProps> = ({ 
  nft, 
  size = 'medium', 
  showDetails = true,
  animationDelay = '0s'
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const sizeClasses = {
    small: {
      container: 'w-32 h-auto',
      image: 'p-8',
      text: 'text-xs',
      title: 'text-xs',
      power: 'text-[10px]',
    },
    medium: {
      container: 'w-40 h-auto',
      image: 'p-12',
      text: 'text-sm',
      title: 'text-sm',
      power: 'text-xs',
    },
    large: {
      container: 'w-full max-w-[400px]',
      image: 'p-4 lg:p-14',
      text: 'text-base lg:text-lg',
      title: 'text-base lg:text-lg',
      power: 'text-sm',
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
      case 'LEGENDARY':
        return 'from-yellow-500 to-orange-600';
      case 'EPIC':
        return 'from-purple-500 to-pink-600';
      case 'RARE':
        return 'from-blue-500 to-cyan-600';
      case 'COMMON':
        return 'from-gray-500 to-gray-600';
      default:
        return 'from-red-500 to-purple-600';
    }
  };

  return (
    <div 
      className={`border-4 border-[#d3b136] bg-[#2b1c3b] p-2 overflow-hidden ${currentSize.container} card-hover flex-shrink-0`}
      style={{ animationDelay }}
    >
      {/* NFT Image */}
      <div className={`border-2 border-[#d3b136] ${currentSize.image} mb-2 aspect-square bg-gradient-to-br ${getRarityColor(nft.rarity || '')} flex items-center justify-center shadow-lg shadow-purple-500/30 relative`}>
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
        
        {!imageError && nft.image ? (
          <Image
            src={nft.image}
            alt={nft.name}
            width={200}
            height={200}
            className="w-full h-full object-cover rounded animate-float"
            style={{ animationDelay }}
            onError={handleImageError}
            onLoad={handleImageLoad}
            priority={false}
          />
        ) : (
          <div className="text-4xl lg:text-6xl animate-float" style={{ animationDelay }}>
            🎭
          </div>
        )}
      </div>

      {/* NFT Details */}
      {showDetails && (
        <div className="bg-[#2b1c3b] text-center p-2">
          <div className={`text-white px-2 font-bold ${currentSize.title} mb-1 truncate`}>
            {nft.rarity || 'LEGENDARY'}
          </div>
          <div className={`font-bold text-white ${currentSize.power} mb-1`}>
            POWER: {nft.power || 0}
          </div>
          <div className="text-[10px] text-gray-400">OWNED</div>
          
          {/* NFT Name (tooltip on hover) */}
          <div 
            className={`text-gray-300 ${currentSize.text} mt-1 truncate cursor-help`}
            title={nft.name}
          >
            {nft.name}
          </div>
        </div>
      )}
    </div>
  );
};

export default NFTCard;
