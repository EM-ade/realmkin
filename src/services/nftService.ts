import axios from "axios";
import { isValidWalletAddress, detectWalletType } from "@/utils/formatAddress";

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export interface NFTMetadata {
  id: string;
  name: string;
  description: string;
  image: string;
  attributes: NFTAttribute[];
  contractAddress: string;
  tokenId: string;
  rarity?: string;
  power?: number;
}

// Helius API Response types
interface HeliusNFT {
  id: string;
  mint?: string;
  content?: {
    metadata?: {
      name?: string;
      description?: string;
      attributes?: NFTAttribute[];
    };
    links?: {
      image?: string;
    };
    files?: Array<{
      uri: string;
      type: string;
    }>;
  };
  grouping?: Array<{
    group_key: string;
    group_value: string;
  }>;
}

interface HeliusResponse {
  result: {
    items: HeliusNFT[];
  };
}

// Magic Eden Solana API Response types
interface MagicEdenSolanaNFT {
  mintAddress: string;
  tokenMint?: string;
  mint?: string;
  name?: string;
  description?: string;
  image?: string;
  img?: string;
  animationUrl?: string;
  attributes?: NFTAttribute[];
  traits?: NFTAttribute[];
  collection?: string;
  symbol?: string;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category?: string;
  };
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
}

export interface NFTCollection {
  nfts: NFTMetadata[];
  totalCount: number;
}

class NFTService {
  // Solana Realmkin collection contract address
  private readonly REALMKIN_SOLANA_CONTRACT_ADDRESS =
    process.env.NEXT_PUBLIC_REALMKIN_SOLANA_CONTRACT_ADDRESS ||
    "eTQujiFKVvLJXdkAobg9JqULNdDrCt5t4WtDochmVSZ";

  // Magic Eden collection symbol for Solana
  private readonly REALMKIN_COLLECTION_SYMBOL =
    process.env.NEXT_PUBLIC_REALMKIN_COLLECTION_SYMBOL || "The Realmkin";

  // Optional: Helius API key for enhanced Solana NFT data
  private readonly HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

  // Temporary testing mode - set to false for production
  private readonly TESTING_MODE = false;
  

  
  private readonly TEST_WALLET_ADDRESS =
    "F1p6dNLSSTHi4QkUkRVXZw8QurZJKUDcvVBjfF683nU";

  /**
   * Fetch NFTs owned by a Solana wallet using Helius API
   */
  async fetchNFTsWithHelius(walletAddress: string): Promise<NFTCollection> {
    if (!this.HELIUS_API_KEY) {
      console.warn("Helius API key not configured, falling back to Magic Eden");
      return await this.fetchNFTsWithMagicEdenSolana(walletAddress);
    }

    try {
      const response = await axios.post<HeliusResponse>(
        `https://mainnet.helius-rpc.com/?api-key=${this.HELIUS_API_KEY}`,
        {
          jsonrpc: "2.0",
          id: "my-id",
          method: "getAssetsByOwner",
          params: {
            ownerAddress: walletAddress,
            page: 1,
            limit: 1000,
            displayOptions: {
              showFungible: false,
              showNativeBalance: false,
            },
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Filter for Realmkin collection
      const realmkinNFTs = response.data.result.items.filter((nft: HeliusNFT) =>
        nft.grouping?.some(
          (group) =>
            group.group_key === "collection" &&
            group.group_value === this.REALMKIN_SOLANA_CONTRACT_ADDRESS
        )
      );

      const nfts = await Promise.all(
        realmkinNFTs.map(async (nft: HeliusNFT) => {
          return await this.processHeliusNFTData(nft);
        })
      );

      return {
        nfts: nfts.filter((nft) => nft !== null),
        totalCount: realmkinNFTs.length,
      };
    } catch (error) {
      console.error("Error fetching NFTs with Helius:", error);
      // Fallback to Magic Eden
      return await this.fetchNFTsWithMagicEdenSolana(walletAddress);
    }
  }

  /**
   * Fetch NFTs using Magic Eden Solana API as fallback
   */
  async fetchNFTsWithMagicEdenSolana(
    walletAddress: string
  ): Promise<NFTCollection> {
    try {
      // Magic Eden V2 API endpoint for wallet tokens (no API key required)
      const response = await axios.get<MagicEdenSolanaNFT[]>(
        `https://api-mainnet.magiceden.dev/v2/wallets/${walletAddress}/tokens`,
        {
          headers: {
            Accept: "application/json",
          },
          params: {
            collection: this.REALMKIN_COLLECTION_SYMBOL,
            limit: 500,
            offset: 0,
          },
        }
      );

      const nfts = await Promise.all(
        response.data.map(async (nft: MagicEdenSolanaNFT) => {
          return await this.processMagicEdenSolanaNFTData(nft);
        })
      );

      return {
        nfts: nfts.filter((nft) => nft !== null),
        totalCount: response.data.length,
      };
    } catch (error) {
      console.error("Error fetching NFTs with Magic Eden V2:", error);

      // Return empty collection as fallback
      return { nfts: [], totalCount: 0 };
    }
  }

  /**
   * Main method to fetch Solana NFTs - tries multiple sources
   */
  async fetchUserNFTs(walletAddress: string): Promise<NFTCollection> {
    try {
      console.log("🔍 NFT Service: Fetching NFTs for wallet:", walletAddress);
      console.log("🔍 NFT Service: Wallet address type:", typeof walletAddress);
      console.log("🔍 NFT Service: Wallet address length:", walletAddress?.length);
      
      // Validate wallet address format
      if (!walletAddress || !isValidWalletAddress(walletAddress)) {
        console.error("❌ NFT Service: Invalid wallet address format:", walletAddress);
        throw new Error("Invalid wallet address format");
      }
      
      // Check wallet type
      const walletType = detectWalletType(walletAddress);
      console.log("🔍 NFT Service: Detected wallet type:", walletType);
      
      if (walletType === 'ethereum') {
        console.warn("⚠️ NFT Service: Ethereum wallet detected, but this app is designed for Solana NFTs");
        // For now, return empty collection for Ethereum wallets
        return { nfts: [], totalCount: 0 };
      }
      
      if (walletType !== 'solana') {
        console.error("❌ NFT Service: Unsupported wallet type:", walletType);
        throw new Error("Unsupported wallet type");
      }
      
      // Use test wallet address if in testing mode
      const addressToUse = this.TESTING_MODE
        ? this.TEST_WALLET_ADDRESS
        : walletAddress;
        
      console.log("🔍 NFT Service: Using address:", addressToUse);

      // Try Helius first (best for Solana)
      if (this.HELIUS_API_KEY) {
        console.log("🔍 NFT Service: Using Helius API");
        return await this.fetchNFTsWithHelius(addressToUse);
      }

      // Fallback to Magic Eden Solana
      console.log("🔍 NFT Service: Using Magic Eden API");
      return await this.fetchNFTsWithMagicEdenSolana(addressToUse);
    } catch (error) {
      console.error("Error fetching Solana NFTs:", error);

      // Return mock data for development/testing
      return this.getMockNFTs();
    }
  }

  /**
   * Process NFT data from Helius API
   */
  private async processHeliusNFTData(
    nft: HeliusNFT
  ): Promise<NFTMetadata | null> {
    try {
      let imageUrl =
        nft.content?.links?.image || nft.content?.files?.[0]?.uri || "";
      imageUrl = this.resolveIPFSUrl(imageUrl);

      const attributes = nft.content?.metadata?.attributes || [];
      const power = this.calculateNFTPower(attributes);
      const rarity = this.determineRarity(attributes);

      return {
        id: nft.id || nft.mint || "",
        name: nft.content?.metadata?.name || `Realmkin #${nft.id}`,
        description: nft.content?.metadata?.description || "",
        image: imageUrl,
        attributes,
        power,
        rarity,
        contractAddress: this.REALMKIN_SOLANA_CONTRACT_ADDRESS,
        tokenId: nft.id || nft.mint || "",
      };
    } catch (error) {
      console.error("Error processing Helius NFT data:", error);
      return null;
    }
  }

  /**
   * Process NFT data from Magic Eden Solana API
   */
  private async processMagicEdenSolanaNFTData(
    nft: MagicEdenSolanaNFT
  ): Promise<NFTMetadata | null> {
    try {
      let imageUrl = nft.image || nft.img || "";
      imageUrl = this.resolveIPFSUrl(imageUrl);

      const attributes = nft.attributes || nft.traits || [];
      const power = this.calculateNFTPower(attributes);
      const rarity = this.determineRarity(attributes);

      return {
        id: nft.mintAddress || nft.tokenMint || nft.mint || "",
        name: nft.name || `Realmkin #${nft.mintAddress}`,
        description: nft.description || "",
        image: imageUrl,
        attributes,
        power,
        rarity,
        contractAddress: this.REALMKIN_SOLANA_CONTRACT_ADDRESS,
        tokenId: nft.mintAddress || nft.tokenMint || nft.mint || "",
      };
    } catch (error) {
      console.error("Error processing Magic Eden Solana NFT data:", error);
      return null;
    }
  }

  /**
   * Resolve IPFS URLs to HTTP URLs
   */
  private resolveIPFSUrl(url: string): string {
    if (!url) return "";

    if (url.startsWith("ipfs://")) {
      return url.replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    return url;
  }

  /**
   * Calculate NFT power based on attributes
   */
  private calculateNFTPower(attributes: NFTAttribute[]): number {
    // Customize this logic based on your NFT attributes
    let power = 1000; // Base power

    attributes.forEach((attr) => {
      if (attr.trait_type === "Strength" || attr.trait_type === "Power") {
        power += parseInt(String(attr.value)) * 10;
      }
      if (attr.trait_type === "Rarity" && attr.value === "Legendary") {
        power += 500;
      }
      if (attr.trait_type === "Level") {
        power += parseInt(String(attr.value)) * 50;
      }
    });

    return Math.min(power, 9999); // Cap at 9999
  }

  /**
   * Determine rarity based on attributes
   */
  private determineRarity(attributes: NFTAttribute[]): string {
    // Customize this logic based on your NFT attributes
    const rarityAttr = attributes.find(
      (attr) => attr.trait_type === "Rarity" || attr.trait_type === "Tier"
    );

    if (rarityAttr) {
      return rarityAttr.value.toString().toUpperCase();
    }

    // Default rarity determination
    const powerLevel = this.calculateNFTPower(attributes);
    if (powerLevel > 2500) return "LEGENDARY";
    if (powerLevel > 2000) return "EPIC";
    if (powerLevel > 1500) return "RARE";
    return "COMMON";
  }

  /**
   * Get mock NFT data for development/testing
   */
  private getMockNFTs(): NFTCollection {
    return {
      nfts: [
        {
          id: "mock-1",
          name: "Realmkin Warrior #1",
          description: "A powerful warrior from the Realmkin realm",
          image: "/realmkin.png", // Fallback to existing image
          attributes: [
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Power", value: 2000 },
            { trait_type: "Element", value: "Fire" },
          ],
          contractAddress: "0x...",
          tokenId: "1",
          rarity: "LEGENDARY",
          power: 2000,
        },
        {
          id: "mock-2",
          name: "Realmkin Mage #2",
          description: "A mystical mage with ancient powers",
          image: "/realmkin.png",
          attributes: [
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Power", value: 1840 },
            { trait_type: "Element", value: "Dark" },
          ],
          contractAddress: "0x...",
          tokenId: "2",
          rarity: "LEGENDARY",
          power: 1840,
        },
        {
          id: "mock-3",
          name: "Realmkin Guardian #3",
          description: "A guardian protecting the realm",
          image: "/realmkin.png",
          attributes: [
            { trait_type: "Rarity", value: "Legendary" },
            { trait_type: "Power", value: 2100 },
            { trait_type: "Element", value: "Light" },
          ],
          contractAddress: "0x...",
          tokenId: "3",
          rarity: "LEGENDARY",
          power: 2100,
        },
      ],
      totalCount: 3,
    };
  }
}

export const nftService = new NFTService();
