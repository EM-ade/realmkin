import axios from "axios";

export interface NFTMetadata {
  id: string;
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  contractAddress: string;
  tokenId: string;
  rarity?: string;
  power?: number;
}

export interface NFTCollection {
  nfts: NFTMetadata[];
  totalCount: number;
}

class NFTService {
  private readonly ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  private readonly MAGIC_EDEN_API_KEY =
    process.env.NEXT_PUBLIC_MAGIC_EDEN_API_KEY;

  // Realmkin contract address - you'll need to update this with your actual contract
  private readonly REALMKIN_CONTRACT_ADDRESS =
    process.env.NEXT_PUBLIC_REALMKIN_CONTRACT_ADDRESS || "0x...";

  // Magic Eden collection symbol - update with your actual collection symbol
  private readonly REALMKIN_COLLECTION_SYMBOL =
    process.env.NEXT_PUBLIC_REALMKIN_COLLECTION_SYMBOL || "realmkin";

  /**
   * Fetch NFTs owned by a wallet address using Alchemy API
   */
  async fetchNFTsWithAlchemy(walletAddress: string): Promise<NFTCollection> {
    if (!this.ALCHEMY_API_KEY) {
      throw new Error("Alchemy API key not configured");
    }

    try {
      const response = await axios.get(
        `https://eth-mainnet.g.alchemy.com/nft/v3/${this.ALCHEMY_API_KEY}/getNFTsForOwner`,
        {
          params: {
            owner: walletAddress,
            contractAddresses: [this.REALMKIN_CONTRACT_ADDRESS],
            withMetadata: true,
            pageSize: 100,
          },
        }
      );

      const nfts = await Promise.all(
        response.data.ownedNfts.map(async (nft: any) => {
          return await this.processNFTData(nft);
        })
      );

      return {
        nfts: nfts.filter((nft) => nft !== null),
        totalCount: response.data.totalCount || nfts.length,
      };
    } catch (error) {
      console.error("Error fetching NFTs with Alchemy:", error);
      throw error;
    }
  }

  /**
   * Fetch NFTs using Magic Eden API as fallback
   */
  async fetchNFTsWithMagicEden(walletAddress: string): Promise<NFTCollection> {
    try {
      const headers: any = {
        Accept: "application/json",
      };

      if (this.MAGIC_EDEN_API_KEY) {
        headers["Authorization"] = `Bearer ${this.MAGIC_EDEN_API_KEY}`;
      }

      // Magic Eden V2 API endpoint for wallet tokens
      const response = await axios.get(
        `https://api-mainnet.magiceden.dev/v2/wallets/${walletAddress}/tokens`,
        {
          headers,
          params: {
            collection: this.REALMKIN_COLLECTION_SYMBOL,
            limit: 500,
            offset: 0,
          },
        }
      );

      const nfts = await Promise.all(
        response.data.map(async (nft: any) => {
          return await this.processMagicEdenNFTData(nft);
        })
      );

      return {
        nfts: nfts.filter((nft) => nft !== null),
        totalCount: response.data.length,
      };
    } catch (error) {
      console.error("Error fetching NFTs with Magic Eden:", error);

      // Try alternative Magic Eden endpoint
      return await this.fetchNFTsWithMagicEdenV3(walletAddress);
    }
  }

  /**
   * Fetch NFTs using Magic Eden V3 API as alternative
   */
  async fetchNFTsWithMagicEdenV3(
    walletAddress: string
  ): Promise<NFTCollection> {
    try {
      const headers: any = {
        Accept: "application/json",
      };

      if (this.MAGIC_EDEN_API_KEY) {
        headers["Authorization"] = `Bearer ${this.MAGIC_EDEN_API_KEY}`;
      }

      // Magic Eden V3 API endpoint
      const response = await axios.get(
        `https://api-mainnet.magiceden.dev/v3/rtp/ethereum/users/${walletAddress}/tokens/v7`,
        {
          headers,
          params: {
            collection: this.REALMKIN_COLLECTION_SYMBOL,
            limit: 500,
            includeAttributes: true,
            includeLastSale: false,
          },
        }
      );

      const nfts = await Promise.all(
        response.data.tokens.map(async (nft: any) => {
          return await this.processMagicEdenV3NFTData(nft);
        })
      );

      return {
        nfts: nfts.filter((nft) => nft !== null),
        totalCount: response.data.tokens.length,
      };
    } catch (error) {
      console.error("Error fetching NFTs with Magic Eden V3:", error);
      throw error;
    }
  }

  /**
   * Main method to fetch NFTs - tries multiple sources
   */
  async fetchUserNFTs(walletAddress: string): Promise<NFTCollection> {
    try {
      // Try Alchemy first
      if (this.ALCHEMY_API_KEY) {
        return await this.fetchNFTsWithAlchemy(walletAddress);
      }

      // Fallback to Magic Eden
      return await this.fetchNFTsWithMagicEden(walletAddress);
    } catch (error) {
      console.error("Error fetching NFTs:", error);

      // Return mock data for development/testing
      return this.getMockNFTs();
    }
  }

  /**
   * Process NFT data from Alchemy API
   */
  private async processNFTData(nft: any): Promise<NFTMetadata | null> {
    try {
      const metadata = nft.metadata || {};

      // Handle IPFS URLs
      let imageUrl = metadata.image || nft.media?.[0]?.gateway || "";
      imageUrl = this.resolveIPFSUrl(imageUrl);

      // Calculate power based on attributes (customize this logic)
      const power = this.calculateNFTPower(metadata.attributes || []);
      const rarity = this.determineRarity(metadata.attributes || []);

      return {
        id: `${nft.contract.address}-${nft.tokenId}`,
        name: metadata.name || `Realmkin #${nft.tokenId}`,
        description: metadata.description || "",
        image: imageUrl,
        attributes: metadata.attributes || [],
        contractAddress: nft.contract.address,
        tokenId: nft.tokenId,
        rarity,
        power,
      };
    } catch (error) {
      console.error("Error processing NFT data:", error);
      return null;
    }
  }

  /**
   * Process NFT data from Magic Eden V2 API
   */
  private async processMagicEdenNFTData(nft: any): Promise<NFTMetadata | null> {
    try {
      let imageUrl = nft.image || nft.img || "";
      imageUrl = this.resolveIPFSUrl(imageUrl);

      const attributes = nft.attributes || nft.traits || [];
      const power = this.calculateNFTPower(attributes);
      const rarity = this.determineRarity(attributes);

      return {
        id: `${nft.mintAddress || nft.tokenMint}`,
        name: nft.name || `Realmkin #${nft.tokenId || nft.tokenMint}`,
        description: nft.description || "",
        image: imageUrl,
        attributes: attributes,
        contractAddress: nft.collection || "",
        tokenId: nft.tokenId || nft.tokenMint || "",
        rarity,
        power,
      };
    } catch (error) {
      console.error("Error processing Magic Eden NFT data:", error);
      return null;
    }
  }

  /**
   * Process NFT data from Magic Eden V3 API
   */
  private async processMagicEdenV3NFTData(
    nft: any
  ): Promise<NFTMetadata | null> {
    try {
      let imageUrl = nft.token?.image || nft.token?.imageSmall || "";
      imageUrl = this.resolveIPFSUrl(imageUrl);

      const attributes = nft.token?.attributes || [];
      const power = this.calculateNFTPower(attributes);
      const rarity = this.determineRarity(attributes);

      return {
        id: `${nft.token?.contract}-${nft.token?.tokenId}`,
        name: nft.token?.name || `Realmkin #${nft.token?.tokenId}`,
        description: nft.token?.description || "",
        image: imageUrl,
        attributes: attributes,
        contractAddress: nft.token?.contract || "",
        tokenId: nft.token?.tokenId || "",
        rarity,
        power,
      };
    } catch (error) {
      console.error("Error processing Magic Eden V3 NFT data:", error);
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
  private calculateNFTPower(attributes: any[]): number {
    // Customize this logic based on your NFT attributes
    let power = 1000; // Base power

    attributes.forEach((attr) => {
      if (attr.trait_type === "Strength" || attr.trait_type === "Power") {
        power += parseInt(attr.value) * 10;
      }
      if (attr.trait_type === "Rarity" && attr.value === "Legendary") {
        power += 500;
      }
      if (attr.trait_type === "Level") {
        power += parseInt(attr.value) * 50;
      }
    });

    return Math.min(power, 9999); // Cap at 9999
  }

  /**
   * Determine rarity based on attributes
   */
  private determineRarity(attributes: any[]): string {
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
