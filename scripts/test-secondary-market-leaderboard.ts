/**
 * Test Script: Fetch Secondary Market Leaderboard
 * 
 * This script fetches the secondary market leaderboard and saves it to a JSON file.
 * 
 * Usage:
 *   npx tsx scripts/test-secondary-market-leaderboard.ts
 * 
 * Or with Node.js (after building):
 *   node dist/scripts/test-secondary-market-leaderboard.js
 */

// Load environment variables from .env.local
import 'dotenv/config';

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../../backend-api/firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Interface for secondary sale cache data
interface SecondarySaleCacheData {
  walletAddress?: string;
  salesCount?: number;
  hasSecondarySale?: boolean;
  lastCheckedAt?: any;
  lastPurchaseTime?: any;
}

// Interface for leaderboard entry
interface LeaderboardEntry {
  rank: number;
  userId: string | null;
  username: string;
  walletAddress: string;
  totalPurchased: number;
  avatarUrl?: string;
}

/**
 * Fetch secondary market leaderboard directly from Firestore
 */
async function fetchSecondaryMarketLeaderboard(
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  try {
    console.log('[Test Script] Starting leaderboard fetch...');
    
    // Step 1: Query all secondarySaleCache entries
    const cacheSnapshot = await db.collection('secondarySaleCache').get();

    if (cacheSnapshot.empty) {
      console.log('[Test Script] No cache data available');
      return [];
    }

    console.log(`[Test Script] Found ${cacheSnapshot.docs.length} cache entries`);

    // Step 2: Filter for users with sales and sort by salesCount descending
    const sortedBuyers = cacheSnapshot.docs
      .map((doc) => {
        const data = doc.data() as SecondarySaleCacheData;
        return {
          id: doc.id,
          walletAddress: data.walletAddress || doc.id,
          salesCount: data.salesCount || 0,
        };
      })
      .filter((buyer) => buyer.salesCount > 0)
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, limit);

    if (sortedBuyers.length === 0) {
      console.log('[Test Script] No users with secondary market purchases');
      return [];
    }

    console.log(
      `[Test Script] Found ${sortedBuyers.length} buyers, fetching user data...`
    );

    // Step 3: Batch lookup user IDs from wallets collection (primary source)
    const walletAddresses = sortedBuyers.map((buyer) => buyer.walletAddress.toLowerCase());
    const walletLookup = new Map<
      string,
      { userId: string; username?: string; source: string }
    >();

    // Fetch wallets in batches (Firestore limit: 500 per batch)
    const BATCH_SIZE = 500;
    for (let i = 0; i < walletAddresses.length; i += BATCH_SIZE) {
      const batch = walletAddresses.slice(i, i + BATCH_SIZE);
      const walletDocs = await Promise.all(
        batch.map((addr) => db.collection('wallets').doc(addr).get())
      );

      walletDocs.forEach((doc, idx) => {
        if (doc.exists) {
          const data = doc.data();
          if (!data) return;
          const originalAddress = batch[idx];
          walletLookup.set(originalAddress, {
            userId: data.uid || data.userId,
            username: data.username,
            source: 'wallets',
          });
        }
      });
    }

    console.log(
      `[Test Script] Found ${walletLookup.size} users in wallets collection`
    );

    // Step 4: For wallets not found, check userRewards (fallback)
    const notFoundWallets = walletAddresses.filter(
      (addr) => !walletLookup.has(addr)
    );

    if (notFoundWallets.length > 0) {
      console.log(
        `[Test Script] Checking userRewards for ${notFoundWallets.length} remaining wallets...`
      );

      const userRewardsSnapshot = await db.collection('userRewards').get();

      userRewardsSnapshot.forEach((doc) => {
        const data = doc.data();
        const walletAddr = data.walletAddress?.toLowerCase();
        if (walletAddr && notFoundWallets.includes(walletAddr)) {
          walletLookup.set(walletAddr, {
            userId: doc.id,
            source: 'userRewards',
          });
        }
      });

      console.log(
        `[Test Script] Found ${walletLookup.size} total users after userRewards check`
      );
    }

    // Step 5: Batch get user profiles for all found userIds
    const userIds = Array.from(
      new Set(
        Array.from(walletLookup.values())
          .map((data) => data.userId)
          .filter((id): id is string => !!id)
      )
    );

    console.log(
      `[Test Script] Fetching ${userIds.length} user profiles...`
    );

    const userProfiles = new Map<
      string,
      { username: string; avatarUrl?: string }
    >();

    if (userIds.length > 0) {
      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batchIds = userIds.slice(i, i + BATCH_SIZE);
        const userDocs = await Promise.all(
          batchIds.map((id) => db.collection('users').doc(id).get())
        );

        userDocs.forEach((doc, idx) => {
          if (doc.exists) {
            const data = doc.data();
            if (!data) return;
            userProfiles.set(batchIds[idx], {
              username: data.username || data.email?.split('@')[0] || `User${batchIds[idx].slice(-4)}`,
              avatarUrl: data.avatarUrl,
            });
          }
        });
      }
    }

    console.log(
      `[Test Script] Fetched ${userProfiles.size} user profiles`
    );

    // Step 6: Build final leaderboard
    const leaderboard = sortedBuyers.map((cacheData, index) => {
      const walletAddress = cacheData.walletAddress;
      const walletData = walletLookup.get(walletAddress.toLowerCase());

      let userId = walletData?.userId || null;
      let username = `User ${walletAddress.slice(0, 6)}`;
      let avatarUrl: string | undefined = undefined;

      if (walletData?.username) {
        username = walletData.username;
      }

      if (userId) {
        const profile = userProfiles.get(userId);
        if (profile) {
          username = profile.username || username;
          avatarUrl = profile.avatarUrl;
        }
      }

      return {
        rank: index + 1,
        userId: userId || walletAddress,
        username,
        walletAddress,
        totalPurchased: cacheData.salesCount,
        avatarUrl,
      };
    });

    console.log(
      `[Test Script] Successfully built leaderboard with ${leaderboard.length} entries`
    );

    return leaderboard;
  } catch (error) {
    console.error(
      '[Test Script] Error fetching leaderboard:',
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(80));
  console.log('🚀 Secondary Market Leaderboard Test Script');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log('');

  // Fetch leaderboard
  const leaderboard = await fetchSecondaryMarketLeaderboard(50);

  if (leaderboard.length === 0) {
    console.log('\n⚠️  No leaderboard data found!');
    console.log('Make sure:');
    console.log('  1. You have .env.local file with Firebase credentials');
    console.log('  2. The secondarySaleCache collection has data');
    return;
  }

  // Display summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 LEADERBOARD SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Entries: ${leaderboard.length}`);
  console.log(`Top Buyer: ${leaderboard[0]?.username} (${leaderboard[0]?.totalPurchased} purchases)`);
  console.log(`Last Place: ${leaderboard[leaderboard.length - 1]?.username} (${leaderboard[leaderboard.length - 1]?.totalPurchased} purchases)`);
  
  const totalPurchases = leaderboard.reduce((sum, entry) => sum + entry.totalPurchased, 0);
  console.log(`Total Purchases (Top ${leaderboard.length}): ${totalPurchases}`);
  console.log(`Average per Buyer: ${(totalPurchases / leaderboard.length).toFixed(2)}`);

  // Display top 10
  console.log('\n' + '='.repeat(80));
  console.log('🏆 TOP 10 BUYERS');
  console.log('='.repeat(80));
  leaderboard.slice(0, 10).forEach((entry, index) => {
    const medal = ['🥇', '🥈', '🥉'][index] || `#${index + 1}`;
    console.log(`${medal} ${entry.username.padEnd(20)} | ${entry.totalPurchased.toString().padStart(3)} purchases | ${entry.walletAddress.slice(0, 8)}...`);
  });

  // Save to file
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `secondary-market-leaderboard-${timestamp}.json`);
  
  const outputData = {
    fetchedAt: new Date().toISOString(),
    totalEntries: leaderboard.length,
    summary: {
      totalPurchases: leaderboard.reduce((sum, entry) => sum + entry.totalPurchased, 0),
      averagePerBuyer: (totalPurchases / leaderboard.length).toFixed(2),
      topBuyer: leaderboard[0],
    },
    leaderboard,
  };

  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  console.log('\n' + '='.repeat(80));
  console.log('💾 DATA SAVED');
  console.log('='.repeat(80));
  console.log(`Output File: ${outputPath}`);
  console.log(`File Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log('');
  console.log('✅ Test script completed successfully!');
  console.log('='.repeat(80));
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
