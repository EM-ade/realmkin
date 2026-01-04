/**
 * Script to fetch and analyze NFT metadata from the Realmkin collection
 * Collection Address: EzjhzaTBqXohJTsaMKFSX6fgXcDJyXAV85NK7RK79u3Z
 * 
 * Booster NFTs to identify:
 * - Random 1/1 : 1.17x multiplier
 * - Custom 1/1 : 1.23x multiplier
 * - Solana miner : 1.27x multiplier
 */

import { Connection, PublicKey } from "@solana/web3.js";

const COLLECTION_ADDRESS = "EzjhzaTBqXohJTsaMKFSX6fgXcDJyXAV85NK7RK79u3Z";
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// Sample NFT mints to test (we'll need actual mint addresses)
const TEST_MINTS = [
  // Add some known NFT mint addresses from the collection here
  // For now we'll use the collection address to start
];

interface NFTMetadata {
  name: string;
  symbol: string;
  uri: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: any;
  collection?: {
    name: string;
    family: string;
  };
}

async function fetchMetadataFromURI(uri: string): Promise<any> {
  try {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return null;
  }
}

async function analyzeNFTMetadata() {
  const connection = new Connection(RPC_URL, "confirmed");

  console.log("🔍 Analyzing Realmkin NFT Collection");
  console.log("Collection Address:", COLLECTION_ADDRESS);
  console.log("=" .repeat(80));
  console.log("\n📝 Note: This script will analyze the metadata structure");
  console.log("to determine how we can identify the booster NFTs:\n");
  console.log("  - Random 1/1 : 1.17x multiplier");
  console.log("  - Custom 1/1 : 1.23x multiplier");
  console.log("  - Solana miner : 1.27x multiplier\n");
  console.log("=" .repeat(80));

  // Strategy 1: Use DAS (Digital Asset Standard) API if available
  console.log("\n🔄 Attempting to fetch collection NFTs using DAS API...\n");
  
  try {
    // Try Helius or similar RPC that supports DAS
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "my-id",
        method: "getAssetsByGroup",
        params: {
          groupKey: "collection",
          groupValue: COLLECTION_ADDRESS,
          page: 1,
          limit: 10,
        },
      }),
    });

    const data = await response.json();
    
    if (data.result && data.result.items) {
      console.log(`✅ Found ${data.result.total} NFTs using DAS API\n`);
      console.log(`Analyzing first ${data.result.items.length} NFTs...\n`);

      const boosterPatterns = [
        { name: "Random 1/1", pattern: /random.*1\/1/i, multiplier: 1.17 },
        { name: "Custom 1/1", pattern: /custom.*1\/1/i, multiplier: 1.23 },
        { name: "Solana miner", pattern: /solana.*miner/i, multiplier: 1.27 },
      ];

      const foundBoosters: any[] = [];

      for (const item of data.result.items.slice(0, 20)) {
        console.log(`\n--- Analyzing NFT ---`);
        console.log("Mint:", item.id);
        console.log("Name:", item.content?.metadata?.name || "N/A");
        console.log("Symbol:", item.content?.metadata?.symbol || "N/A");

        if (item.content?.json_uri) {
          console.log("Metadata URI:", item.content.json_uri);
          
          // Fetch full metadata
          const metadata = await fetchMetadataFromURI(item.content.json_uri);
          if (metadata) {
            console.log("\nMetadata Content:");
            console.log("- Name:", metadata.name);
            console.log("- Description:", metadata.description);
            console.log("- Attributes:", JSON.stringify(metadata.attributes, null, 2));
            console.log("- Properties:", JSON.stringify(metadata.properties, null, 2));
            
            // Check if this is a booster NFT
            for (const booster of boosterPatterns) {
              if (booster.pattern.test(metadata.name)) {
                console.log(`\n🎯 FOUND BOOSTER: ${booster.name} (${booster.multiplier}x)`);
                foundBoosters.push({
                  type: booster.name,
                  multiplier: booster.multiplier,
                  mint: item.id,
                  name: metadata.name,
                  metadata,
                });
              }
            }
          }
        }

        console.log("-".repeat(80));
      }

      // Summary
      console.log("\n\n" + "=".repeat(80));
      console.log("📋 BOOSTER DETECTION SUMMARY");
      console.log("=".repeat(80));
      console.log(`Total NFTs in collection: ${data.result.total}`);
      console.log(`Boosters found: ${foundBoosters.length}/3\n`);

      if (foundBoosters.length > 0) {
        console.log("✅ Identified Boosters:");
        foundBoosters.forEach((b) => {
          console.log(`\n  ${b.type} (${b.multiplier}x):`);
          console.log(`    Name: ${b.name}`);
          console.log(`    Mint: ${b.mint}`);
        });

        console.log("\n\n🎯 RECOMMENDED IDENTIFICATION STRATEGY:");
        console.log("=" .repeat(80));
        console.log("1. Use NFT name pattern matching");
        console.log("2. Verify the NFT belongs to the collection");
        console.log("3. Check attributes if available for additional validation");
        console.log("\nBooster patterns to use:");
        boosterPatterns.forEach((p) => {
          console.log(`  - ${p.name}: ${p.pattern.toString()} → ${p.multiplier}x`);
        });
      } else {
        console.log("⚠️  No boosters found in sample. May need to:");
        console.log("1. Check more NFTs (increase sample size)");
        console.log("2. Verify booster NFT names match expected patterns");
        console.log("3. Provide specific mint addresses if available");
      }

    } else {
      throw new Error("DAS API not supported or no results");
    }

  } catch (error) {
    console.error("\n❌ DAS API approach failed:", error);
    console.log("\n📝 NEXT STEPS:");
    console.log("=" .repeat(80));
    console.log("1. Provide specific NFT mint addresses for the booster NFTs");
    console.log("2. Or use a Helius/QuickNode RPC endpoint with DAS support");
    console.log("3. Or manually verify booster NFTs in wallet and we'll use name matching");
    console.log("\nTo proceed, please provide:");
    console.log("  - Mint addresses of the booster NFTs, OR");
    console.log("  - A DAS-compatible RPC endpoint (Helius/QuickNode)");
  }
}

// Run the script
analyzeNFTMetadata().catch(console.error);
