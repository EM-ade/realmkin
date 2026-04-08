/**
 * Example usage of fetchSecondaryMarketLeaderboard
 * 
 * This script demonstrates how to fetch the secondary market leaderboard
 * in your React components or server-side code.
 */

import { fetchSecondaryMarketLeaderboard } from '@/services/leaderboardService';

/**
 * Example 1: Basic usage in a React component
 */
export async function example_ReactComponent() {
  // Fetch top 50 secondary market buyers
  const leaderboard = await fetchSecondaryMarketLeaderboard(50);
  
  console.log('Secondary Market Leaderboard:');
  leaderboard.forEach((entry) => {
    console.log(`#${entry.rank} - ${entry.username} (${entry.walletAddress})`);
    console.log(`   Total Purchases: ${entry.totalPurchased}`);
    console.log(`   Avatar: ${entry.avatarUrl || 'N/A'}`);
    console.log('---');
  });
  
  return leaderboard;
}

/**
 * Example 2: Get only top 3 buyers
 */
export async function example_Top3Only() {
  const top3 = await fetchSecondaryMarketLeaderboard(3);
  return top3;
}

/**
 * Example 3: Filter for users with significant purchases (10+ NFTs)
 */
export async function example_WhaleBuyers() {
  const allBuyers = await fetchSecondaryMarketLeaderboard(100);
  const whaleBuyers = allBuyers.filter(entry => entry.totalPurchased >= 10);
  return whaleBuyers;
}

/**
 * Example 4: Get total secondary market volume
 */
export async function example_TotalVolume() {
  const allBuyers = await fetchSecondaryMarketLeaderboard(500);
  const totalPurchases = allBuyers.reduce((sum, entry) => sum + entry.totalPurchased, 0);
  
  console.log(`Total secondary market purchases: ${totalPurchases}`);
  console.log(`Unique buyers: ${allBuyers.length}`);
  console.log(`Average purchases per buyer: ${(totalPurchases / allBuyers.length).toFixed(2)}`);
  
  return {
    totalPurchases,
    uniqueBuyers: allBuyers.length,
    averagePerBuyer: totalPurchases / allBuyers.length,
  };
}

/**
 * Example 5: Check if a specific user is in the leaderboard
 */
export async function example_CheckUserRank(walletAddress: string) {
  const leaderboard = await fetchSecondaryMarketLeaderboard(100);
  const userEntry = leaderboard.find(
    entry => entry.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  
  if (userEntry) {
    console.log(`User found at rank #${userEntry.rank}!`);
    console.log(`Username: ${userEntry.username}`);
    console.log(`Total Purchases: ${userEntry.totalPurchased}`);
  } else {
    console.log('User not found in top 100');
  }
  
  return userEntry || null;
}
