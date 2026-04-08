# Revenue Share Formula Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the revenue distribution system to use the new February 2026 rewards breakdown with three tiers (Holder Share 35%, Tier 3 Special Perks, Tier 2 Top 5, Tier 1 Top 3) and change the distribution schedule from the 27th to end-of-month.

**Architecture:** The current system uses a simple weight-based distribution. The new system requires:
1. A multi-tier reward structure with different eligibility criteria and rewards per tier
2. A leaderboard-based ranking system using secondary market purchases
3. Separate reward pools for each tier (SOL, $MKIN, $EMPIRE)
4. Automated monthly distribution triggered at month-end

**Tech Stack:** TypeScript (frontend), JavaScript/Node.js (backend), Solana Web3.js, Firebase/Firestore, SPL Token

---

## Current State Analysis

### Current Formula (Old)
- Single pool: 0.16 SOL + 22,500 EMPIRE + 100,000 MKIN
- Distributed proportionally to ALL holders based on NFT count
- Minimum 1 NFT required
- Distribution on 27th of each month

### New Formula (February 2026)

| Tier | Requirement | Rewards | Distribution Basis |
|------|-------------|---------|-------------------|
| **Holder Share** | Hold 1+ NFTs | 35% of royalty pool | Proportional to holdings (listed + unlisted) |
| **Tier 3: Special Perks** | Mint 12+ Realmkin | 1.5 SOL reward pool | Based on secondary market purchases |
| **Tier 2: Top 5** | Top 5 leaderboard | 300,000 $MKIN + 1.5 SOL pool | Rank-based (secondary market purchases) |
| **Tier 1: Top 3** | Top 3 leaderboard | 450,000 $EMPIRE + 300,000 $MKIN + 1.5 SOL pool | Rank-based (secondary market purchases) |

**Leaderboard Ranking:** Monthly secondary market purchases (not total holdings)

**Distribution Schedule:** End of every month (not just 27th)

---

## Implementation Tasks

### Task 1: Update Backend Revenue Distribution Logic

**Files:**
- Modify: `backend-api/routes/revenue-distribution.js:1-100` (CONFIG section)
- Modify: `backend-api/routes/revenue-distribution.js:250-450` (allocation logic)
- Create: `backend-api/utils/rewardTierCalculator.js`

**Step 1: Create the reward tier calculator utility**

```javascript
// backend-api/utils/rewardTierCalculator.js

/**
 * Reward pool configuration for February 2026
 */
export const REWARD_TIERS = {
  // Holder Share: 35% of royalty distributed to all holders
  HOLDER_SHARE: {
    name: 'Holder Share',
    minNfts: 1,
    poolSol: 0.0, // Calculated as 35% of royalty pool
    poolEmpire: 0.0,
    poolMkin: 0.0,
    distributionType: 'proportional', // Based on NFT count
    includesListed: true, // Include listed NFTs in count
  },
  
  // Tier 3: Special Perks
  TIER_3: {
    name: 'Special Perks',
    minNfts: 12,
    poolSol: 1.5,
    poolEmpire: 0,
    poolMkin: 0,
    distributionType: 'secondary-market-weight', // Based on secondary purchases
  },
  
  // Tier 2: Top 5
  TIER_2: {
    name: 'Top 5',
    maxRank: 5,
    poolSol: 1.5,
    poolEmpire: 0,
    poolMkin: 300000,
    distributionType: 'rank-based',
    // Rank distribution for MKIN (example: 1st=50%, 2nd=30%, 3rd=15%, 4th=3%, 5th=2%)
    rankDistribution: [0.50, 0.30, 0.15, 0.03, 0.02],
  },
  
  // Tier 1: Top 3
  TIER_1: {
    name: 'Top 3',
    maxRank: 3,
    poolSol: 1.5,
    poolEmpire: 450000,
    poolMkin: 300000,
    distributionType: 'rank-based',
    // Rank distribution (example: 1st=60%, 2nd=30%, 3rd=10%)
    rankDistribution: [0.60, 0.30, 0.10],
  },
};

/**
 * Calculate holder share rewards (35% royalty pool)
 * @param {Array} holders - Array of {userId, walletAddress, nftCount}
 * @param {number} totalRoyaltyPool - Total royalty pool in USD
 * @returns {Array} - Array with calculated rewards per user
 */
export function calculateHolderShare(holders, totalRoyaltyPool) {
  const totalNfts = holders.reduce((sum, h) => sum + h.nftCount, 0);
  const solPrice = getSolPrice(); // Implement price fetch
  
  return holders.map(holder => {
    const weight = holder.nftCount / totalNfts;
    return {
      ...holder,
      tier: 'HOLDER_SHARE',
      weight,
      amountSol: (totalRoyaltyPool * 0.35 / solPrice) * weight,
      amountEmpire: 0,
      amountMkin: 0,
    };
  });
}

/**
 * Calculate Tier 3 rewards (12+ NFTs, secondary market pool)
 * @param {Array} eligibleUsers - Users with 12+ NFTs and secondary purchases
 * @param {Map} secondaryPurchaseCounts - Map of wallet -> purchase count
 * @returns {Array}
 */
export function calculateTier3Rewards(eligibleUsers, secondaryPurchaseCounts) {
  const totalPurchases = eligibleUsers.reduce(
    (sum, u) => sum + (secondaryPurchaseCounts.get(u.walletAddress) || 0),
    0
  );
  
  return eligibleUsers.map(user => {
    const purchases = secondaryPurchaseCounts.get(user.walletAddress) || 0;
    const weight = purchases / totalPurchases;
    return {
      ...user,
      tier: 'TIER_3',
      weight,
      amountSol: REWARD_TIERS.TIER_3.poolSol * weight,
      amountEmpire: 0,
      amountMkin: 0,
    };
  });
}

/**
 * Calculate rank-based rewards (Tier 1 and Tier 2)
 * @param {Array} leaderboard - Sorted leaderboard entries
 * @param {string} tier - 'TIER_1' or 'TIER_2'
 * @returns {Array}
 */
export function calculateRankBasedRewards(leaderboard, tier) {
  const tierConfig = REWARD_TIERS[tier];
  const topUsers = leaderboard.slice(0, tierConfig.maxRank);
  
  return topUsers.map((user, index) => {
    const rankDistribution = tierConfig.rankDistribution[index];
    return {
      ...user,
      tier,
      rank: index + 1,
      weight: rankDistribution,
      amountSol: tierConfig.poolSol * rankDistribution,
      amountEmpire: tierConfig.poolEmpire * rankDistribution,
      amountMkin: tierConfig.poolMkin * rankDistribution,
    };
  });
}

/**
 * Get SOL price from oracle/API
 */
async function getSolPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    return 100; // Fallback
  }
}
```

**Step 2: Run test to verify utility functions work**

```bash
cd backend-api
node -e "
import { calculateHolderShare, calculateTier3Rewards } from './utils/rewardTierCalculator.js';
console.log('Utility loaded successfully');
"
```

Expected: "Utility loaded successfully"

**Step 3: Update CONFIG in revenue-distribution.js**

```javascript
// Replace the old CONFIG.POOL_* constants with new tier structure
const CONFIG = {
  // ... keep existing constants ...
  
  // NEW: Multi-tier reward structure
  REWARD_TIERS: {
    HOLDER_SHARE: {
      enabled: true,
      minNfts: 1,
      royaltyPercentage: 0.35, // 35% of royalty pool
    },
    TIER_3: {
      enabled: true,
      minNfts: 12,
      poolSol: 1.5,
    },
    TIER_2: {
      enabled: true,
      maxRank: 5,
      poolSol: 1.5,
      poolMkin: 300000,
    },
    TIER_1: {
      enabled: true,
      maxRank: 3,
      poolSol: 1.5,
      poolEmpire: 450000,
      poolMkin: 300000,
    },
  },
  
  // Distribution schedule
  DISTRIBUTION_DAY: 'last', // 'last' = last day of month, or number 1-31
};
```

**Step 4: Update allocation logic to use new tier system**

Replace the weight calculation section (around line 380-420) with:

```javascript
// NEW: Multi-tier reward calculation
console.log(`\n📊 Step 4: Calculating multi-tier rewards...`);

const { 
  calculateHolderShare, 
  calculateTier3Rewards, 
  calculateRankBasedRewards,
  getLeaderboardForMonth 
} = await import('../utils/rewardTierCalculator.js');

// Get secondary market purchase data
const leaderboardModule = await import('../routes/leaderboard.js');
const leaderboard = await leaderboardModule.getSecondaryMarketLeaderboard(50);
const secondaryPurchaseMap = new Map(
  leaderboard.map(e => [e.walletAddress, e.purchaseCount])
);

// Calculate each tier
const allAllocations = [];

// Tier 1: Holder Share (35% royalty to all holders)
const holders = eligible.filter(u => u.totalRealmkin >= CONFIG.REWARD_TIERS.HOLDER_SHARE.minNfts);
const holderAllocations = calculateHolderShare(holders, TOTAL_ROYALTY_POOL);
allAllocations.push(...holderAllocations);
console.log(`   Holder Share: ${holderAllocations.length} users`);

// Tier 3: Special Perks (12+ NFTs)
const tier3Eligible = eligible.filter(u => u.totalRealmkin >= CONFIG.REWARD_TIERS.TIER_3.minNfts);
const tier3Allocations = calculateTier3Rewards(tier3Eligible, secondaryPurchaseMap);
allAllocations.push(...tier3Allocations);
console.log(`   Tier 3 (Special Perks): ${tier3Allocations.length} users`);

// Tier 2: Top 5
const tier2Allocations = calculateRankBasedRewards(leaderboard, 'TIER_2');
allAllocations.push(...tier2Allocations);
console.log(`   Tier 2 (Top 5): ${tier2Allocations.length} users`);

// Tier 1: Top 3
const tier1Allocations = calculateRankBasedRewards(leaderboard, 'TIER_1');
allAllocations.push(...tier1Allocations);
console.log(`   Tier 1 (Top 3): ${tier1Allocations.length} users`);

// Merge allocations per user (users can be in multiple tiers)
const mergedAllocations = mergeUserAllocations(allAllocations);
```

**Step 5: Add helper function to merge user allocations**

```javascript
// Add to rewardTierCalculator.js

/**
 * Merge multiple tier allocations per user
 * @param {Array} allocations - All tier allocations
 * @returns {Array} - Merged allocations per user
 */
export function mergeUserAllocations(allocations) {
  const userMap = new Map();
  
  for (const alloc of allocations) {
    const key = alloc.userId;
    if (!userMap.has(key)) {
      userMap.set(key, {
        userId: alloc.userId,
        walletAddress: alloc.walletAddress,
        tiers: [],
        amountSol: 0,
        amountEmpire: 0,
        amountMkin: 0,
        totalWeight: 0,
      });
    }
    
    const user = userMap.get(key);
    user.tiers.push(alloc.tier);
    user.amountSol += alloc.amountSol;
    user.amountEmpire += alloc.amountEmpire;
    user.amountMkin += alloc.amountMkin;
    user.totalWeight += alloc.weight;
  }
  
  return Array.from(userMap.values());
}
```

**Step 6: Commit**

```bash
cd backend-api
git add utils/rewardTierCalculator.js routes/revenue-distribution.js
git commit -m "feat: implement multi-tier revenue share formula (Feb 2026)"
```

---

### Task 2: Add End-of-Month Distribution Scheduling

**Files:**
- Modify: `backend-api/routes/revenue-distribution.js:60-80` (getCurrentDistributionId function)
- Create: `backend-api/utils/distributionScheduler.js`
- Modify: `backend-api/scripts/run-monthly-allocation.js`

**Step 1: Create distribution scheduler utility**

```javascript
// backend-api/utils/distributionScheduler.js

/**
 * Check if today is the distribution day
 * @param {string} scheduleType - 'last' for last day, or number 1-31
 * @returns {boolean}
 */
export function isDistributionDay(scheduleType = 'last') {
  const now = new Date();
  
  if (scheduleType === 'last') {
    // Check if today is the last day of the month
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getMonth() !== now.getMonth();
  } else {
    // Check if today is the specified day
    const scheduleDay = parseInt(scheduleType);
    return now.getDate() === scheduleDay;
  }
}

/**
 * Get current distribution period ID
 * Format: revenue_dist_YYYY_MM
 */
export function getCurrentDistributionId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `revenue_dist_${year}_${month}`;
}

/**
 * Get the next distribution date
 */
export function getNextDistributionDate(scheduleType = 'last') {
  const now = new Date();
  const next = new Date(now);
  
  if (scheduleType === 'last') {
    // Last day of current month
    next.setMonth(next.getMonth() + 1);
    next.setDate(0); // Last day of previous month
  } else {
    const scheduleDay = parseInt(scheduleType);
    next.setDate(scheduleDay);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }
  
  return next;
}

/**
 * Cron expression for end-of-month (at 23:00 UTC)
 */
export const END_OF_MONTH_CRON = '0 23 L * *'; // L = last day of month
```

**Step 2: Update getCurrentDistributionId in revenue-distribution.js**

```javascript
// Replace the existing function with import
import { getCurrentDistributionId } from '../utils/distributionScheduler.js';

// Remove the old inline function
```

**Step 3: Update the monthly allocation script**

```javascript
// backend-api/scripts/run-monthly-allocation.js

import { isDistributionDay, getCurrentDistributionId } from '../utils/distributionScheduler.js';

// Add check before running allocation
if (!isDistributionDay('last') && !process.env.FORCE_RUN) {
  console.log('⚠️  Not the last day of the month. Use --force to run anyway.');
  process.exit(0);
}
```

**Step 4: Commit**

```bash
cd backend-api
git add utils/distributionScheduler.js scripts/run-monthly-allocation.js routes/revenue-distribution.js
git commit -m "feat: add end-of-month distribution scheduling"
```

---

### Task 3: Update Leaderboard to Track Secondary Market Purchases

**Files:**
- Modify: `backend-api/routes/leaderboard.js` (create if doesn't exist)
- Modify: `backend-api/services/secondarySaleVerification.js`

**Step 1: Create leaderboard route for secondary market**

```javascript
// backend-api/routes/leaderboard.js

import express from 'express';
import admin from 'firebase-admin';

const router = express.Router();

/**
 * GET /api/leaderboard/secondary-market
 * Get leaderboard sorted by secondary market purchases
 */
router.get('/secondary-market', async (req, res) => {
  try {
    const db = admin.firestore();
    const limit = parseInt(req.query.limit) || 50;
    
    // Get cached secondary sale data
    const cacheSnapshot = await db
      .collection('secondarySaleCache')
      .where('hasSecondarySale', '==', true)
      .orderBy('salesCount', 'desc')
      .limit(limit)
      .get();
    
    const leaderboard = [];
    let rank = 1;
    
    for (const doc of cacheSnapshot.docs) {
      const data = doc.data();
      
      // Get user profile for username
      const userDoc = await db
        .collection('userProfiles')
        .doc(data.userId)
        .get();
      
      const username = userDoc.exists ? userDoc.data().username : 'Anonymous';
      const avatarUrl = userDoc.exists ? userDoc.data().avatarUrl : null;
      
      leaderboard.push({
        rank,
        userId: data.userId,
        walletAddress: data.walletAddress,
        username,
        avatarUrl,
        nftCount: data.salesCount || 0,
        purchaseCount: data.salesCount || 0,
        lastPurchaseTime: data.lastPurchaseTime?.toDate().toISOString(),
      });
      
      rank++;
    }
    
    res.json({
      success: true,
      leaderboard,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching secondary market leaderboard:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/leaderboard/secondary-market/top3
 * Get top 3 secondary market buyers
 */
router.get('/secondary-market/top3', async (req, res) => {
  try {
    const db = admin.firestore();
    
    const cacheSnapshot = await db
      .collection('secondarySaleCache')
      .where('hasSecondarySale', '==', true)
      .orderBy('salesCount', 'desc')
      .limit(3)
      .get();
    
    const top3 = [];
    let rank = 1;
    
    for (const doc of cacheSnapshot.docs) {
      const data = doc.data();
      const userDoc = await db
        .collection('userProfiles')
        .doc(data.userId)
        .get();
      
      top3.push({
        rank,
        userId: data.userId,
        username: userDoc.exists ? userDoc.data().username : 'Anonymous',
        avatarUrl: userDoc.exists ? userDoc.data().avatarUrl : null,
        nftCount: data.salesCount || 0,
      });
      
      rank++;
    }
    
    res.json({
      success: true,
      top3,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching top 3:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
```

**Step 2: Mount the leaderboard route in server.js**

```javascript
// backend-api/server.js
import leaderboardRouter from './routes/leaderboard.js';

// Add after other route mounts
app.use('/api/leaderboard', leaderboardRouter);
```

**Step 3: Commit**

```bash
cd backend-api
git add routes/leaderboard.js server.js
git commit -m "feat: add secondary market leaderboard endpoints"
```

---

### Task 4: Update Frontend Account Page to Show New Reward Structure

**Files:**
- Modify: `realmkin/src/app/account/page.tsx`
- Modify: `realmkin/src/components/account/RevenueDistributionCard.tsx`
- Modify: `realmkin/src/components/account/LeaderboardCard.tsx`

**Step 1: Update RevenueDistributionCard to show tier breakdown**

```tsx
// realmkin/src/components/account/RevenueDistributionCard.tsx

interface RevenueDistributionCardProps {
  // Existing props...
  tierBreakdown?: {
    holderShare?: { sol: number; empire: number; mkin: number };
    tier3?: { sol: number; empire: number; mkin: number };
    tier2?: { sol: number; empire: number; mkin: number };
    tier1?: { sol: number; empire: number; mkin: number };
  };
  userTiers?: string[]; // ['HOLDER_SHARE', 'TIER_3']
}

export default function RevenueDistributionCard({
  // Existing props...
  tierBreakdown,
  userTiers = [],
}: RevenueDistributionCardProps) {
  return (
    <section className="bg-[#111111] rounded-2xl p-5 border border-[#27272a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Revenue Distribution</h2>
        <span className="text-xs px-2 py-1 rounded bg-purple-900/20 text-purple-400">
          February 2026
        </span>
      </div>

      {/* Tier Info Banner */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-4 border border-purple-500/20 mb-4">
        <h3 className="text-white font-medium text-sm mb-2">🔥 February Rewards Structure</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-green-400">🏰</span>
            <span className="text-gray-300">Holder Share: 35% royalty</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400">🔱</span>
            <span className="text-gray-300">Tier 3: 12+ NFTs → 1.5 SOL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">⚔️</span>
            <span className="text-gray-300">Tier 2: Top 5 → 300K MKIN</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400">👑</span>
            <span className="text-gray-300">Tier 1: Top 3 → 450K EMPIRE</span>
          </div>
        </div>
      </div>

      {/* User's Tiers */}
      {userTiers.length > 0 && (
        <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3 mb-4">
          <p className="text-xs text-green-400 font-medium mb-2">✅ Your Eligible Tiers:</p>
          <div className="flex flex-wrap gap-2">
            {userTiers.map(tier => (
              <span
                key={tier}
                className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-400 border border-green-500/30"
              >
                {tier.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Token Tabs (existing code) */}
      {/* ... */}

      {/* Tier Breakdown */}
      {tierBreakdown && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">Reward Breakdown by Tier:</p>
          <div className="space-y-2 text-xs">
            {tierBreakdown.holderShare && (
              <div className="flex justify-between text-gray-400">
                <span>🏰 Holder Share:</span>
                <span className="text-white">
                  {tierBreakdown.holderShare.sol.toFixed(6)} SOL + 
                  {tierBreakdown.holderShare.mkin.toLocaleString()} MKIN
                </span>
              </div>
            )}
            {tierBreakdown.tier3 && (
              <div className="flex justify-between text-gray-400">
                <span>🔱 Tier 3:</span>
                <span className="text-blue-400">
                  {tierBreakdown.tier3.sol.toFixed(6)} SOL
                </span>
              </div>
            )}
            {tierBreakdown.tier2 && (
              <div className="flex justify-between text-gray-400">
                <span>⚔️ Tier 2:</span>
                <span className="text-yellow-400">
                  {tierBreakdown.tier2.mkin.toLocaleString()} MKIN
                </span>
              </div>
            )}
            {tierBreakdown.tier1 && (
              <div className="flex justify-between text-gray-400">
                <span>👑 Tier 1:</span>
                <span className="text-red-400">
                  {tierBreakdown.tier1.empire.toLocaleString()} EMPIRE
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
```

**Step 2: Update account page to fetch tier data**

```tsx
// realmkin/src/app/account/page.tsx

// Add to state
const [tierBreakdown, setTierBreakdown] = useState<any>(null);
const [userTiers, setUserTiers] = useState<string[]>([]);

// Update the fetchEligibility useEffect
useEffect(() => {
  const fetchEligibility = async () => {
    if (!user?.uid || !account) return;

    setRevenueLoading(true);
    try {
      const eligibility = await checkEligibility();
      setRevenueEligibility(eligibility);

      // Fetch tier breakdown
      if (eligibility.eligible) {
        const feeEstimate = await calculateClaimFee(account);
        setClaimFeeEstimate(feeEstimate);
        
        // Extract tier information from eligibility response
        if (eligibility.tierBreakdown) {
          setTierBreakdown(eligibility.tierBreakdown);
        }
        if (eligibility.userTiers) {
          setUserTiers(eligibility.userTiers);
        }
      }
    } catch (error) {
      console.error("Error checking eligibility:", error);
    } finally {
      setRevenueLoading(false);
    }
  };

  fetchEligibility();
}, [user?.uid, account]);
```

**Step 3: Commit**

```bash
cd realmkin
git add src/components/account/RevenueDistributionCard.tsx src/app/account/page.tsx
git commit -m "feat: update UI to show multi-tier reward structure"
```

---

### Task 5: Add Secondary Market Leaderboard to Account Page

**Files:**
- Modify: `realmkin/src/app/account/page.tsx`
- Modify: `realmkin/src/services/leaderboardService.ts`

**Step 1: Add secondary market leaderboard fetch function**

```typescript
// realmkin/src/services/leaderboardService.ts

export async function fetchTopSecondaryMarketBuyers(limit: number = 10): Promise<
  Array<{
    rank: number;
    username: string;
    nftCount: number;
    avatarUrl?: string;
  }>
> {
  const baseUrl = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || 'https://gatekeeper-bmvu.onrender.com';
  
  try {
    const response = await fetch(
      `${baseUrl}/api/leaderboard/secondary-market?limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch secondary market leaderboard');
    }
    
    const data = await response.json();
    return data.leaderboard || [];
  } catch (error) {
    console.error('Error fetching secondary market leaderboard:', error);
    return [];
  }
}
```

**Step 2: Add leaderboard section to account page**

```tsx
// realmkin/src/app/account/page.tsx

// After the RevenueDistributionCard section, add:

<LeaderboardCard
  title="🏆 Secondary Market Leaderboard"
  entries={leaderboardEntries}
  userRank={userRank}
  loading={leaderboardLoading}
  onRefresh={handleRefreshLeaderboard}
  showRefreshButton={true}
/>
```

**Step 3: Commit**

```bash
cd realmkin
git add src/services/leaderboardService.ts src/app/account/page.tsx
git commit -m "feat: add secondary market leaderboard to account page"
```

---

### Task 6: Update Backend API to Return Tier Breakdown

**Files:**
- Modify: `backend-api/routes/revenue-distribution.js` (check-eligibility endpoint)

**Step 1: Update check-eligibility response**

```javascript
// backend-api/routes/revenue-distribution.js

router.get("/check-eligibility", verifyFirebaseAuth, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.userId;
    const distributionId = getCurrentDistributionId();

    const docId = `${userId}_${distributionId}`;
    const allocationDoc = await db
      .collection(CONFIG.ALLOCATIONS_COLLECTION)
      .doc(docId)
      .get();

    if (!allocationDoc.exists) {
      return res.json({
        success: true,
        eligible: false,
        reason: "No allocation found for current month",
        distributionId,
      });
    }

    const allocation = allocationDoc.data();

    // Check if expired
    const now = Date.now();
    const expiresAt = allocation.expiresAt?.toMillis();
    if (expiresAt && now > expiresAt) {
      return res.json({
        success: true,
        eligible: false,
        reason: "Allocation expired",
        distributionId,
        expiresAt: new Date(expiresAt).toISOString(),
      });
    }

    // Check if already claimed
    if (allocation.status === "claimed") {
      return res.json({
        success: true,
        eligible: false,
        reason: "Already claimed",
        distributionId,
        claimedAt: allocation.claimedAt?.toDate().toISOString(),
      });
    }

    // User is eligible!
    res.json({
      success: true,
      eligible: true,
      distributionId,
      amountSol: allocation.amountSol || 0,
      amountEmpire: allocation.amountEmpire || 0,
      amountMkin: allocation.amountMkin || 0,
      weight: allocation.weight || 0,
      amountUsd: allocation.allocatedAmountUsd,
      claimFeeUsd: CONFIG.CLAIM_FEE_USD,
      expiresAt: new Date(expiresAt).toISOString(),
      nftCount: allocation.nftCount,
      // NEW: Tier breakdown
      userTiers: allocation.tiers || ['HOLDER_SHARE'],
      tierBreakdown: {
        holderShare: {
          sol: allocation.holderShareSol || 0,
          empire: allocation.holderShareEmpire || 0,
          mkin: allocation.holderShareMkin || 0,
        },
        tier3: {
          sol: allocation.tier3Sol || 0,
          empire: allocation.tier3Empire || 0,
          mkin: allocation.tier3Mkin || 0,
        },
        tier2: {
          sol: allocation.tier2Sol || 0,
          empire: allocation.tier2Empire || 0,
          mkin: allocation.tier2Mkin || 0,
        },
        tier1: {
          sol: allocation.tier1Sol || 0,
          empire: allocation.tier1Empire || 0,
          mkin: allocation.tier1Mkin || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error checking eligibility:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

**Step 2: Update allocation storage to include tier data**

In the allocation storage section (around line 450), update the document set:

```javascript
batch.set(docRef, {
  distributionId,
  userId: user.userId,
  walletAddress: user.walletAddress,
  nftCount: user.totalRealmkin,
  weight: user.totalWeight,
  amountSol: user.amountSol,
  amountEmpire: user.amountEmpire,
  amountMkin: user.amountMkin,
  tiers: user.tiers, // NEW: Array of tiers
  // Tier breakdown
  holderShareSol: user.holderShare?.amountSol || 0,
  holderShareEmpire: user.holderShare?.amountEmpire || 0,
  holderShareMkin: user.holderShare?.amountMkin || 0,
  tier3Sol: user.tier3?.amountSol || 0,
  tier3Empire: user.tier3?.amountEmpire || 0,
  tier3Mkin: user.tier3?.amountMkin || 0,
  tier2Sol: user.tier2?.amountSol || 0,
  tier2Empire: user.tier2?.amountEmpire || 0,
  tier2Mkin: user.tier2?.amountMkin || 0,
  tier1Sol: user.tier1?.amountSol || 0,
  tier1Empire: user.tier1?.amountEmpire || 0,
  tier1Mkin: user.tier1?.amountMkin || 0,
  // Legacy field
  allocatedAmountUsd: CONFIG.ALLOCATION_AMOUNT_USD,
  eligibleAt: now,
  expiresAt: expiresAt,
  status: "pending",
  secondarySaleCheckedAt: now,
});
```

**Step 3: Commit**

```bash
cd backend-api
git add routes/revenue-distribution.js
git commit -m "feat: return tier breakdown in eligibility check"
```

---

### Task 7: Testing & Verification

**Files:**
- Create: `backend-api/scripts/test-revenue-share-formula.js`
- Create: `realmkin/scripts/test-tier-display.ts`

**Step 1: Create backend test script**

```javascript
// backend-api/scripts/test-revenue-share-formula.js

import { 
  calculateHolderShare, 
  calculateTier3Rewards,
  calculateRankBasedRewards,
  mergeUserAllocations 
} from '../utils/rewardTierCalculator.js';

console.log('🧪 Testing Revenue Share Formula\n');

// Test data
const mockHolders = [
  { userId: 'user1', walletAddress: 'wallet1', nftCount: 10 },
  { userId: 'user2', walletAddress: 'wallet2', nftCount: 20 },
  { userId: 'user3', walletAddress: 'wallet3', nftCount: 5 },
];

const mockLeaderboard = [
  { userId: 'user1', walletAddress: 'wallet1', purchaseCount: 15 },
  { userId: 'user2', walletAddress: 'wallet2', purchaseCount: 10 },
  { userId: 'user3', walletAddress: 'wallet3', purchaseCount: 5 },
  { userId: 'user4', walletAddress: 'wallet4', purchaseCount: 3 },
  { userId: 'user5', walletAddress: 'wallet5', purchaseCount: 2 },
];

// Test Holder Share
console.log('🏰 Testing Holder Share...');
const holderShare = calculateHolderShare(mockHolders, 1000); // $1000 pool
console.log('   Holder Share Results:');
holderShare.forEach(h => {
  console.log(`   ${h.userId}: ${h.nftCount} NFTs → ${h.amountSol.toFixed(6)} SOL`);
});

// Test Tier 3
console.log('\n🔱 Testing Tier 3 (Special Perks)...');
const purchaseMap = new Map(mockLeaderboard.map(u => [u.walletAddress, u.purchaseCount]));
const tier3Eligible = mockHolders.filter(h => h.nftCount >= 12);
const tier3Rewards = calculateTier3Rewards(tier3Eligible, purchaseMap);
console.log(`   Eligible: ${tier3Eligible.length} users`);
tier3Rewards.forEach(t => {
  console.log(`   ${t.userId}: ${t.amountSol.toFixed(6)} SOL`);
});

// Test Tier 2
console.log('\n⚔️  Testing Tier 2 (Top 5)...');
const tier2Rewards = calculateRankBasedRewards(mockLeaderboard, 'TIER_2');
tier2Rewards.forEach(t => {
  console.log(`   Rank ${t.rank}: ${t.amountMkin.toLocaleString()} MKIN`);
});

// Test Tier 1
console.log('\n👑 Testing Tier 1 (Top 3)...');
const tier1Rewards = calculateRankBasedRewards(mockLeaderboard, 'TIER_1');
tier1Rewards.forEach(t => {
  console.log(`   Rank ${t.rank}: ${t.amountEmpire.toLocaleString()} EMPIRE + ${t.amountMkin.toLocaleString()} MKIN`);
});

// Test Merge
console.log('\n🔀 Testing Allocation Merge...');
const allAllocations = [...holderShare, ...tier3Rewards, ...tier2Rewards, ...tier1Rewards];
const merged = mergeUserAllocations(allAllocations);
console.log(`   Merged ${allAllocations.length} allocations → ${merged.length} users`);
merged.forEach(u => {
  console.log(`   ${u.userId}: ${u.tiers.join(', ')} → ${u.amountSol.toFixed(6)} SOL + ${u.amountMkin} MKIN + ${u.amountEmpire} EMPIRE`);
});

console.log('\n✅ All tests completed!');
```

**Step 2: Run backend test**

```bash
cd backend-api
node scripts/test-revenue-share-formula.js
```

Expected output:
```
🧪 Testing Revenue Share Formula

🏰 Testing Holder Share...
   Holder Share Results:
   user1: 10 NFTs → 0.XXXXXX SOL
   user2: 20 NFTs → 0.XXXXXX SOL
   user3: 5 NFTs → 0.XXXXXX SOL

🔱 Testing Tier 3 (Special Perks)...
   Eligible: X users

⚔️  Testing Tier 2 (Top 5)...
   Rank 1: 150000 MKIN
   Rank 2: 90000 MKIN
   ...

👑 Testing Tier 1 (Top 3)...
   Rank 1: 270000 EMPIRE + 180000 MKIN
   ...

✅ All tests completed!
```

**Step 3: Commit**

```bash
cd backend-api
git add scripts/test-revenue-share-formula.js
git commit -m "test: add revenue share formula test script"
```

---

### Task 8: Documentation Update

**Files:**
- Update: `backend-api/REVENUE_DISTRIBUTION_GUIDE.md`
- Create: `backend-api/REVENUE_SHARE_FORMULA_FEB_2026.md`

**Step 1: Create new formula documentation**

```markdown
# Revenue Share Formula - February 2026

## Overview

Starting February 2026, Realmkin implements a multi-tier reward structure to incentivize:
1. **Holding** - Long-term holders get 35% of royalty pool
2. **Secondary Market Activity** - Active buyers climb the leaderboard
3. **Top Performers** - Top buyers get exclusive EMPIRE and MKIN rewards

## Reward Tiers

### 🏰 Holder Share (35% Royalty Pool)

**Eligibility:** Hold 1+ Realmkin NFTs (listed or unlisted)

**Distribution:** Proportional to total NFT holdings

**Example:**
- Total royalty pool: 100 SOL
- Holder share: 35 SOL
- Your holdings: 10 NFTs
- Total eligible NFTs: 1000
- Your reward: (10/1000) × 35 = 0.35 SOL

---

### 🔱 Tier 3: Special Perks

**Eligibility:** Mint 12+ Realmkin NFTs

**Reward Pool:** 1.5 SOL

**Distribution:** Based on secondary market purchase count

**Example:**
- Your secondary purchases: 15
- Total purchases by eligible users: 150
- Your reward: (15/150) × 1.5 = 0.15 SOL

---

### ⚔️ Tier 2: Top 5

**Eligibility:** Top 5 on secondary market leaderboard

**Reward Pool:**
- 300,000 $MKIN
- 1.5 SOL (shared pool)

**Rank Distribution:**
| Rank | MKIN | SOL (est.) |
|------|------|------------|
| 1st | 150,000 | 0.45 |
| 2nd | 90,000 | 0.30 |
| 3rd | 45,000 | 0.225 |
| 4th | 9,000 | 0.075 |
| 5th | 6,000 | 0.05 |

---

### 👑 Tier 1: Top 3

**Eligibility:** Top 3 on secondary market leaderboard

**Reward Pool:**
- 450,000 $EMPIRE
- 300,000 $MKIN
- 1.5 SOL (shared pool)

**Rank Distribution:**
| Rank | EMPIRE | MKIN | SOL (est.) |
|------|--------|------|------------|
| 1st | 270,000 | 180,000 | 0.90 |
| 2nd | 135,000 | 90,000 | 0.45 |
| 3rd | 45,000 | 30,000 | 0.15 |

---

## Distribution Schedule

**When:** Last day of every month at 23:00 UTC

**Claim Period:** 30 days from distribution date

**Example:**
- Distribution date: February 28, 2026 23:00 UTC
- Claim deadline: March 30, 2026 23:00 UTC

---

## Leaderboard Calculation

**Ranking Criteria:** Monthly secondary market purchases

**Reset:** First day of each month

**Data Source:** Magic Eden buyNow transactions

**Update Frequency:** Real-time (cached for 24 hours)

---

## How to Maximize Rewards

1. **Hold More NFTs** → Higher holder share
2. **Mint 12+ NFTs** → Unlock Tier 3
3. **Buy from Secondary Market** → Climb leaderboard
4. **Reach Top 5** → Unlock Tier 2
5. **Reach Top 3** → Unlock Tier 1 (best rewards)

---

## API Endpoints

### Check Eligibility
```bash
GET /api/revenue-distribution/check-eligibility
Authorization: Bearer {firebaseToken}
```

### Response
```json
{
  "eligible": true,
  "userTiers": ["HOLDER_SHARE", "TIER_3", "TIER_2"],
  "tierBreakdown": {
    "holderShare": { "sol": 0.35, "empire": 0, "mkin": 50000 },
    "tier3": { "sol": 0.15, "empire": 0, "mkin": 0 },
    "tier2": { "sol": 0.225, "empire": 0, "mkin": 45000 },
    "tier1": { "sol": 0, "empire": 0, "mkin": 0 }
  },
  "totalRewards": {
    "sol": 0.725,
    "empire": 0,
    "mkin": 95000
  }
}
```

---

## FAQ

**Q: Can I be in multiple tiers?**
A: Yes! A user can receive rewards from all 4 tiers simultaneously.

**Q: Do listed NFTs count for Holder Share?**
A: Yes, both listed and unlisted NFTs count.

**Q: How often does the leaderboard reset?**
A: Monthly, on the first day of each month.

**Q: What happens if I don't claim?**
A: Unclaimed rewards expire after 30 days and return to the treasury.
```

**Step 2: Commit**

```bash
cd backend-api
git add REVENUE_SHARE_FORMA_FEB_2026.md
git commit -m "docs: add February 2026 revenue share formula documentation"
```

---

## Summary of Changes

### Backend Changes
| File | Change |
|------|--------|
| `utils/rewardTierCalculator.js` | NEW - Multi-tier reward calculation |
| `utils/distributionScheduler.js` | NEW - End-of-month scheduling |
| `routes/revenue-distribution.js` | Modified - New allocation logic, tier breakdown |
| `routes/leaderboard.js` | NEW - Secondary market leaderboard endpoints |
| `server.js` | Modified - Mount leaderboard routes |
| `scripts/run-monthly-allocation.js` | Modified - Add schedule check |
| `scripts/test-revenue-share-formula.js` | NEW - Test script |

### Frontend Changes
| File | Change |
|------|--------|
| `components/account/RevenueDistributionCard.tsx` | Modified - Show tier breakdown |
| `components/account/LeaderboardCard.tsx` | Modified - Add refresh button |
| `app/account/page.tsx` | Modified - Fetch tier data, add leaderboard |
| `services/leaderboardService.ts` | Modified - Add secondary market fetch |

### Documentation
| File | Change |
|------|--------|
| `backend-api/REVENUE_SHARE_FORMULA_FEB_2026.md` | NEW - Complete formula guide |
| `backend-api/REVENUE_DISTRIBUTION_GUIDE.md` | Updated - Reference new formula |

---

## Testing Checklist

- [ ] Run `node scripts/test-revenue-share-formula.js` - Verify calculations
- [ ] Test allocation with mock data - Verify tier merging
- [ ] Test eligibility endpoint - Verify tier breakdown in response
- [ ] Test leaderboard endpoint - Verify ranking
- [ ] Test frontend display - Verify tier cards show correctly
- [ ] Test end-to-end claim - Verify correct amounts distributed

---

## Deployment Steps

1. **Deploy Backend:**
   ```bash
   cd backend-api
   git push
   # Wait for Render deployment
   ```

2. **Run Test Allocation (Dry Run):**
   ```bash
   node scripts/run-monthly-allocation.js --dry-run
   ```

3. **Deploy Frontend:**
   ```bash
   cd realmkin
   npm run build
   ```

4. **Verify in Production:**
   - Check account page shows new tiers
   - Verify leaderboard displays correctly
   - Test claim flow with small amount

---

**Plan complete and saved to `docs/plans/2026-02-22-revenue-share-formula-update.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
