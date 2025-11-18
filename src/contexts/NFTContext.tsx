"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useWeb3 } from "./Web3Context";
import { nftService, NFTMetadata, NFTCollection } from "@/services/nftService";
import { PublicKey } from "@solana/web3.js";

interface NFTContextType {
  nfts: NFTMetadata[];
  totalNFTs: number;
  isLoading: boolean;
  error: string | null;
  refreshNFTs: () => Promise<void>;
  getNFTsByRarity: (rarity: string) => NFTMetadata[];
  getTotalPower: () => number;
}

const NFTContext = createContext<NFTContextType>({
  nfts: [],
  totalNFTs: 0,
  isLoading: false,
  error: null,
  refreshNFTs: async () => {},
  getNFTsByRarity: () => [],
  getTotalPower: () => 0,
});

export const useNFT = () => {
  return useContext(NFTContext);
};

interface NFTProviderProps {
  children: ReactNode;
}

export const NFTProvider = ({ children }: NFTProviderProps) => {
  const [nfts, setNFTs] = useState<NFTMetadata[]>([]);
  const [totalNFTs, setTotalNFTs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { account, isConnected } = useWeb3();

  const fetchNFTs = useCallback(async () => {
    if (!account) return;

    // Validate wallet address before fetching NFTs
    try {
      new PublicKey(account); // This will throw if invalid
    } catch (e) {
      console.error("Invalid Solana wallet address:", account);
      setError("Invalid wallet address. Please reconnect your wallet.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cachedData = getCachedNFTs(account);
      if (cachedData && !isCacheExpired(cachedData.timestamp)) {
        setNFTs(cachedData.nfts);
        setTotalNFTs(cachedData.totalCount);
        setIsLoading(false);
        return;
      }

      // Fetch fresh data
      const nftCollection = await nftService.fetchUserNFTs(account);

      // Validate NFT data before setting state
      const validNFTs = nftCollection.nfts.filter(nft => {
        // Validate contract address
        try {
          new PublicKey(nft.contractAddress);
        } catch (e) {
          console.warn("Invalid contract address for NFT:", nft);
          return false;
        }
        
        // Validate token ID
        if (!nft.tokenId) {
          console.warn("Missing token ID for NFT:", nft);
          return false;
        }
        
        return true;
      });

      setNFTs(validNFTs);
      setTotalNFTs(validNFTs.length);

      // Cache the results
      cacheNFTs(account, { nfts: validNFTs, totalCount: validNFTs.length });
    } catch (err) {
      console.error("Error fetching NFTs:", err);
      setError("Failed to load your NFTs. Please try again.");

      // Try to load cached data as fallback
      const cachedData = getCachedNFTs(account);
      if (cachedData) {
        setNFTs(cachedData.nfts);
        setTotalNFTs(cachedData.totalCount);
      }
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  // Fetch NFTs when wallet is connected
  useEffect(() => {
    if (isConnected && account) {
      fetchNFTs();
    } else {
      // Clear NFTs when wallet is disconnected
      setNFTs([]);
      setTotalNFTs(0);
      setError(null);
    }
  }, [isConnected, account, fetchNFTs]);

  const refreshNFTs = async () => {
    if (!account) return;

    // Clear cache and fetch fresh data
    clearCachedNFTs(account);
    await fetchNFTs();
  };

  const getNFTsByRarity = (rarity: string): NFTMetadata[] => {
    return nfts.filter((nft) => nft.rarity === rarity.toUpperCase());
  };

  const getTotalPower = (): number => {
    return nfts.reduce((total, nft) => total + (nft.power || 0), 0);
  };

  // Cache management functions
  const getCachedNFTs = (walletAddress: string) => {
    try {
      const cached = localStorage.getItem(`nfts_${walletAddress}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("Error reading NFT cache:", error);
      return null;
    }
  };

  const cacheNFTs = (walletAddress: string, nftCollection: NFTCollection) => {
    try {
      const cacheData = {
        nfts: nftCollection.nfts,
        totalCount: nftCollection.totalCount,
        timestamp: Date.now(),
      };
      localStorage.setItem(`nfts_${walletAddress}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Error caching NFTs:", error);
    }
  };

  const clearCachedNFTs = (walletAddress: string) => {
    try {
      localStorage.removeItem(`nfts_${walletAddress}`);
    } catch (error) {
      console.error("Error clearing NFT cache:", error);
    }
  };

  const isCacheExpired = (timestamp: number): boolean => {
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    return Date.now() - timestamp > CACHE_DURATION;
  };

  const value = {
    nfts,
    totalNFTs,
    isLoading,
    error,
    refreshNFTs,
    getNFTsByRarity,
    getTotalPower,
  };

  return <NFTContext.Provider value={value}>{children}</NFTContext.Provider>;
};
