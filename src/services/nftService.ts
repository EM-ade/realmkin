import axios from "axios";
import { isValidWalletAddress, detectWalletType } from "@/utils/formatAddress";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

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
  modelUrl?: string; // Optional 3D model URL (GLB/GLTF)
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
  result?: {
    items: HeliusNFT[];
  };
  error?: {
    message: string;
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
  collectionAddress?: string; // Collection contract address
  collectionKey?: string; // Alternative collection address field
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
  weeklyRate?: number;
}

// Contract config type from Firestore
export interface ContractConfig {
  contract_address?: string;
  name?: string;
  blockchain?: string;
  weekly_rate?: number;
  welcome_bonus?: number;
  is_active?: boolean;
  is_tiered?: boolean;
  tiers?: Array<{
    tier_name?: string;
    weekly_rate?: number;
    welcome_bonus?: number;
  }>;
}

class NFTService {
  // Solana Realmkin collection contract addresses
  private readonly REALMKIN_SOLANA_CONTRACT_ADDRESS =
    process.env.NEXT_PUBLIC_REALMKIN_SOLANA_CONTRACT_ADDRESS ||
    "eTQujiFKVvLJXdkAobg9JqULNdDrCt5t4WtDochmVSZ";
  
  // Deprecated placeholder for future chains (not used in filtering path for now)
  private readonly REALMKIN_PREMIUM_CONTRACT_ADDRESS = "0xbb03b613Ede925f17E3ffc437592C66C7c78E317";

  // Collection symbols for different APIs
  private readonly HELIUS_COLLECTION_SYMBOL = "The Realmkin";
  private readonly MAGIC_EDEN_COLLECTION_SYMBOL = "the_realmkin_kins";

  // Helius API key for enhanced Solana NFT data
  private readonly HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

  // Temporary testing mode - set to false for production
  private readonly TESTING_MODE = false;
  

  
  private readonly TEST_WALLET_ADDRESS =
    "F1p6dNLSSTHi4QkUkRVXZw8QurZJKUDcvVBjfF683nU";

  // Cache for NFT data
  private nftCache = new Map<string, NFTCollection>();

  // Magic Eden collection symbols
  private readonly ME_SYMBOLS = ['the_realm_kins', 'Therealmkin', 'therealmkin'];

  // Cache for active contract configs
  private contractsCache: { loadedAt: number; addrs: string[]; configs: Map<string, ContractConfig> } | null = null;

  private async loadActiveContractConfigs(): Promise<{ addresses: string[]; configs: Map<string, ContractConfig> }> {
    const now = Date.now();
    if (this.contractsCache && now - this.contractsCache.loadedAt < 60_000) {
      return { addresses: this.contractsCache.addrs, configs: this.contractsCache.configs };
    }
    try {
      const snap = await getDocs(collection(db, 'contractBonusConfigs'));
      const addresses: string[] = [];
      const configs = new Map<string, ContractConfig>();
      snap.forEach(d => {
        const data = d.data() as ContractConfig;
        if (data.is_active !== false) {
          const addr = d.id;
          if (addr) {
            addresses.push(addr);
            configs.set(addr.toLowerCase(), data);
          }
        }
      });
      this.contractsCache = { loadedAt: now, addrs: addresses, configs };
      console.log(`📋 Loaded ${addresses.length} active contract addresses from Firestore`);
      return { addresses, configs };
    } catch {
      console.warn('Failed to load contractBonusConfigs; using base contract only');
      this.contractsCache = { loadedAt: now, addrs: [], configs: new Map() };
      return { addresses: [], configs: new Map() };
    }
  }

  // Calculate weekly rate for an NFT based on its contract
  private calculateWeeklyRate(contractAddr: string, configs: Map<string, ContractConfig>): number {
    const config = configs.get(contractAddr.toLowerCase());
    if (!config) return 0;

    if (config.is_tiered && config.tiers && config.tiers.length > 0) {
      const totalRate = config.tiers.reduce((sum, tier) => sum + (tier.weekly_rate || 0), 0);
      return totalRate;
    }

    return config.weekly_rate || 0;
  }


  /**
   * Fetch NFTs owned by a Solana wallet using Helius API
   */
  async fetchNFTsWithHelius(walletAddress: string): Promise<NFTCollection> {
    // Check cache first
    if (this.nftCache.has(walletAddress)) {
      return this.nftCache.get(walletAddress)!;
    }

    if (!this.HELIUS_API_KEY) {
      console.warn("Helius API key not configured, falling back to Magic Eden");
      return await this.fetchNFTsWithMagicEdenSolana(walletAddress);
    }

    try {
      const { addresses: contractAddresses, configs } = await this.loadActiveContractConfigs();
      if (contractAddresses.length === 0) {
        return { nfts: [], totalCount: 0, weeklyRate: 0 };
      }

      const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${this.HELIUS_API_KEY}`;
      let allItems: HeliusNFT[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await axios.post<HeliusResponse>(
          rpcUrl,
          {
            jsonrpc: "2.0",
            id: "realmkin-helius",
            method: "getAssetsByOwner",
            params: {
              ownerAddress: walletAddress,
              page: page,
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

        if (response.data.error) {
          console.warn(`⚠️ Helius API error on page ${page}:`, response.data.error);
          break;
        }

        const items: HeliusNFT[] = response.data.result?.items || [];
        console.log(`🛰️ Helius page ${page}: fetched ${items.length} NFTs (total so far: ${allItems.length + items.length})`);

        allItems = allItems.concat(items);

        hasMore = items.length === 1000;
        if (hasMore) {
          page++;
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      // Filter by collection grouping OR mint address
      const allowedContractsLower = contractAddresses.map((addr: string) => addr.toLowerCase());
      const filtered = allItems.filter((nft: HeliusNFT) => {
        const hasCollectionGrouping = nft.grouping?.some(
          (group) => group.group_key === "collection" && allowedContractsLower.includes(group.group_value?.toLowerCase())
        );

        const mintMatches = allowedContractsLower.includes((nft.id || nft.mint || "").toLowerCase());

        return hasCollectionGrouping || mintMatches;
      });

      const nfts = filtered
        .map((nft: HeliusNFT) => {
          const contractAddr = nft.grouping?.find((g) => g.group_key === "collection")?.group_value || nft.id || nft.mint || "";
          let imageUrl = nft.content?.links?.image || nft.content?.files?.[0]?.uri || "";
          imageUrl = this.resolveIPFSUrl(imageUrl);

          return {
            id: nft.id || nft.mint || "",
            name: nft.content?.metadata?.name || `Realmkin #${nft.id}`,
            description: nft.content?.metadata?.description || "",
            image: imageUrl,
            attributes: nft.content?.metadata?.attributes || [],
            power: this.calculateNFTPower(nft.content?.metadata?.attributes || []),
            rarity: this.determineRarity(nft.content?.metadata?.attributes || []),
            contractAddress: contractAddr,
            tokenId: nft.id || nft.mint || "",
          };
        })
        .filter((n) => n.contractAddress);

      // Calculate total weekly rate
      let totalWeeklyRate = 0;
      nfts.forEach((nft) => {
        const rate = this.calculateWeeklyRate(nft.contractAddress, configs);
        totalWeeklyRate += rate;
      });

      const result = {
        nfts,
        totalCount: nfts.length,
        weeklyRate: totalWeeklyRate,
      };

      // Cache the result
      this.nftCache.set(walletAddress, result);
      return result;
    } catch (error) {
      console.error("Error fetching NFTs with Helius:", error);
      // Fallback to Magic Eden
      return await this.fetchNFTsWithMagicEdenSolana(walletAddress);
    }
  }

  /**
   * Fetch NFTs using Magic Eden Solana API
   */
  async fetchNFTsWithMagicEdenSolana(walletAddress: string): Promise<NFTCollection> {
    // Check cache first
    if (this.nftCache.has(walletAddress)) {
      return this.nftCache.get(walletAddress)!;
    }

    try {
      const { configs } = await this.loadActiveContractConfigs();

      // Fetch from all ME symbols in parallel
      const meResults = await Promise.all(
        this.ME_SYMBOLS.map((symbol: string) => this.fetchNFTsByMESymbol(walletAddress, symbol))
      );

      const nfts = meResults.flat();

      // Calculate total weekly rate
      let totalWeeklyRate = 0;
      nfts.forEach((nft) => {
        const rate = this.calculateWeeklyRate(nft.contractAddress, configs);
        totalWeeklyRate += rate;
      });

      const result: NFTCollection = {
        nfts,
        totalCount: nfts.length,
        weeklyRate: totalWeeklyRate,
      };

      // Cache the result
      this.nftCache.set(walletAddress, result);
      return result;
    } catch (error) {
      console.error("Error fetching NFTs with Magic Eden:", error);
      return { nfts: [], totalCount: 0, weeklyRate: 0 };
    }
  }

  /**
   * Fetch NFTs from Magic Eden by symbol
   */
  private async fetchNFTsByMESymbol(wallet: string, symbol: string): Promise<NFTMetadata[]> {
    try {
      const url = `https://api-mainnet.magiceden.dev/v2/wallets/${wallet}/tokens?collection_symbol=${encodeURIComponent(symbol)}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        console.warn(`⚠️ Magic Eden search failed for symbol "${symbol}":`, res.status);
        return [];
      }

      const data = await res.json();
      const items: Array<Record<string, unknown>> = Array.isArray(data) ? data : [];

      const mapped: NFTMetadata[] = items
        .map((it: Record<string, unknown>) => ({
          id: String(it.mintAddress || it.tokenMint || it.id || ""),
          name: String(it.name || "Unknown NFT"),
          description: String(it.description || ""),
          image: String(it.image || it.img || it.media || ""),
          attributes: Array.isArray(it.attributes) ? it.attributes : Array.isArray(it.traits) ? it.traits : [],
          power: undefined,
          rarity: it?.rarity ? String(it.rarity) : undefined,
          contractAddress: String(it.mintAddress || it.tokenMint || ""),
          tokenId: String(it.mintAddress || it.tokenMint || it.id || ""),
        }))
        .filter((n) => n.contractAddress);

      console.log(`✅ Magic Eden symbol "${symbol}" returned ${mapped.length} NFTs`);
      return mapped;
    } catch (e) {
      console.error(`❌ Error fetching Magic Eden symbol "${symbol}":`, e);
      return [];
    }
  }

  /**
   * Fetch NFTs from both standard and premium contracts
   */
  async fetchAllContractNFTs(walletAddress: string): Promise<NFTCollection> {
    try {
      // Fetch from both Solana and Ethereum contracts
      const [solanaCollection, ethereumCollection] = await Promise.all([
        this.fetchUserNFTs(walletAddress),
        this.fetchEthereumNFTs(walletAddress)
      ]);

      // Combine collections
      const combinedNFTs = [...solanaCollection.nfts, ...ethereumCollection.nfts];
      
      return {
        nfts: combinedNFTs,
        totalCount: combinedNFTs.length
      };
    } catch (error) {
      console.error("Error fetching NFTs from all contracts:", error);
      // Fallback to Solana only
      return this.fetchUserNFTs(walletAddress);
    }
  }

  /**
   * Fetch NFTs from Ethereum premium contract
   */
  async fetchEthereumNFTs(_walletAddress: string): Promise<NFTCollection> {
    try {
      // For now, return empty collection as Ethereum integration would require additional setup
      // This is a placeholder for future Ethereum NFT integration
      console.log("🔍 Checking Ethereum premium contract:", this.REALMKIN_PREMIUM_CONTRACT_ADDRESS);
      
      // TODO: Implement Ethereum NFT fetching using Alchemy, Moralis, or similar service
      return { nfts: [], totalCount: 0 };
    } catch (error) {
      console.error("Error fetching Ethereum NFTs:", error);
      return { nfts: [], totalCount: 0 };
    }
  }

  /**
   * Main method to fetch Solana NFTs - tries both Helius and Magic Eden
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

      // Check wallet type (only Solana is supported)
      const walletType = detectWalletType(walletAddress);
      console.log("🔍 NFT Service: Detected wallet type:", walletType);

      if (walletType !== 'solana') {
        console.error("❌ NFT Service: Unsupported wallet type:", walletType);
        throw new Error("Unsupported wallet type");
      }
      
      // Use test wallet address if in testing mode
      const addressToUse = this.TESTING_MODE
        ? this.TEST_WALLET_ADDRESS
        : walletAddress;
        
      console.log("🔍 NFT Service: Using address:", addressToUse);

      const { addresses: configuredAddrs } = await this.loadActiveContractConfigs();
      const promises: Promise<NFTCollection>[] = [];
      if (this.HELIUS_API_KEY && configuredAddrs.length > 0) {
        promises.push(this.fetchNFTsWithHelius(addressToUse));
      }
      promises.push(this.fetchNFTsWithMagicEdenSolana(addressToUse));
      const results = await Promise.allSettled(promises);

      // Combine results from both APIs
      const allNFTs: NFTMetadata[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allNFTs.push(...result.value.nfts);
        } else {
          console.warn("API fetch failed:", result.reason);
        }
      });

      // Remove duplicates based on token ID
      const uniqueNFTs = this.removeDuplicateNFTs(allNFTs);

      const result = {
        nfts: uniqueNFTs,
        totalCount: uniqueNFTs.length,
      };

      // Cache the result
      this.nftCache.set(walletAddress, result);
      return result;
    } catch (error) {
      console.error("Error fetching Solana NFTs:", error);

      // Return mock data for development/testing
      return this.getMockNFTs();
    }
  }

  /**
   * Compatibility alias for test pages expecting fetchAllNFTs
   */
  async fetchAllNFTs(walletAddress: string): Promise<NFTCollection> {
    return this.fetchUserNFTs(walletAddress);
  }

  /**
   * Remove duplicate NFTs based on token ID
   */
  private removeDuplicateNFTs(nfts: NFTMetadata[]): NFTMetadata[] {
    const seen = new Set();
    return nfts.filter(nft => {
      const id = nft.id || nft.tokenId;
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
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

      // Extract the collection/contract address from grouping; if missing, drop
      const contractAddr = nft.grouping?.find(g => g.group_key === 'collection')?.group_value;
      if (!contractAddr) {
        return null;
      }

      return {
        id: nft.id || nft.mint || "",
        name: nft.content?.metadata?.name || `Realmkin #${nft.id}`,
        description: nft.content?.metadata?.description || "",
        image: imageUrl,
        attributes,
        power,
        rarity,
        contractAddress: contractAddr,
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

      // Try to extract collection address from various fields
      // If not available, try to extract from creators (first verified creator is often the collection)
      let contractAddress = nft.collectionAddress || nft.collectionKey;
      if (!contractAddress && nft.creators && nft.creators.length > 0) {
        const verifiedCreator = nft.creators.find(c => c.verified);
        contractAddress = verifiedCreator?.address || nft.creators[0].address;
      }
      // If we cannot resolve a contract address, drop the token (cannot verify)
      if (!contractAddress) {
        return null;
      }

      return {
        id: nft.mintAddress || nft.tokenMint || nft.mint || "",
        name: nft.name || `Realmkin #${nft.mintAddress}`,
        description: nft.description || "",
        image: imageUrl,
        attributes,
        power,
        rarity,
        contractAddress,
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
      const cleaned = url.replace("ipfs://ipfs/", "ipfs://");
      return cleaned.replace("ipfs://", "https://nftstorage.link/ipfs/");
    }
    if (url.includes("ipfs.io/ipfs/")) {
      return url.replace("https://ipfs.io/ipfs/", "https://nftstorage.link/ipfs/");
    }
    if (url.startsWith("ar://")) {
      return url.replace("ar://", "https://arweave.net/");
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
          contractAddress: this.REALMKIN_SOLANA_CONTRACT_ADDRESS,
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
          contractAddress: this.REALMKIN_SOLANA_CONTRACT_ADDRESS,
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
          contractAddress: this.REALMKIN_SOLANA_CONTRACT_ADDRESS,
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
