# Secondary Market Leaderboard Implementation

## Overview

This document describes the implementation of the **Secondary Market Leaderboard** feature that fetches and displays users ranked by their total secondary market NFT purchases.

---

## Schema Deduction (Firebase Collections)

Based on analysis of the codebase, here's the Firebase Firestore data structure:

### Collections Used

| Collection | Document ID | Purpose |
|------------|-------------|---------|
| `users` | Firebase Auth UID | Registered user accounts with profile data |
| `userRewards` | Firebase Auth UID | User wallet mappings and NFT counts |
| `wallets` | Wallet address (lowercase) | Wallet-to-user mapping (primary source) |
| `secondarySaleCache` | Wallet address | Cached secondary market purchase data |

### Document Structures

#### `users` Collection
```typescript
{
  username: string;
  email: string;
  avatarUrl?: string;
  // ... other user profile fields
}
```

#### `userRewards` Collection
```typescript
{
  walletAddress: string;
  totalRealmkin: number;  // NFT count
  totalMKIN: number;
  // ... other reward fields
}
```

#### `wallets` Collection
```typescript
{
  uid: string;        // Firebase Auth UID
  userId: string;     // Alternative UID field
  username: string;
  // ... other wallet fields
}
```

#### `secondarySaleCache` Collection
```typescript
{
  walletAddress: string;
  salesCount: number;      // Total secondary market purchases
  hasSecondarySale: boolean;
  lastCheckedAt: Timestamp;
  lastPurchaseTime?: Timestamp;
}
```

---

## Key Questions Answered

### Q1: Which collection holds the registered users?
**A:** The `users` collection contains registered user accounts. Wallet linkage is done through:
- Primary: `wallets` collection (wallet address → user ID)
- Fallback: `userRewards` collection (user ID → wallet address)

### Q2: Which collection holds the secondary market transactions?
**A:** The `secondarySaleCache` collection holds **pre-aggregated** purchase data. Individual transactions are NOT stored in Firestore - only the total count (`salesCount`) per wallet.

### Q3: Is "total purchased" already aggregated?
**A:** **Yes!** The `salesCount` field in `secondarySaleCache` contains the total number of secondary market purchases per wallet. This aggregation is performed by the backend when the cache is refreshed via the `/api/revenue-distribution/refresh-secondary-market` endpoint.

---

## Query Strategy

### Most Efficient Approach

Since the data is already aggregated in `secondarySaleCache`, we use this strategy:

1. **Query `secondarySaleCache`** - Fetch all cache entries
2. **Filter & Sort** - Keep only entries with `salesCount > 0`, sort descending
3. **Lookup User IDs** - Batch fetch from `wallets` (primary) and `userRewards` (fallback)
4. **Fetch Profiles** - Batch load user profiles from `users` collection
5. **Return Formatted Data** - Build leaderboard with rank, username, wallet, and total purchases

### Why This Works

- ✅ No need to fetch individual transactions (already summed in `salesCount`)
- ✅ Uses Firebase batch `getDocs` for efficient reads
- ✅ Avoids Cloud Functions for typical use cases (< 1000 users)
- ✅ Only includes users with actual registered accounts

### Read Cost Estimate

For a leaderboard with N secondary market buyers:
- ~1 read per `secondarySaleCache` entry
- ~1 read per `wallets` document
- ~1 read per `users` document
- **Total: ~2N to 3N reads** (very efficient!)

---

## Code Implementation

### Function Signature

```typescript
export async function fetchSecondaryMarketLeaderboard(
  limit: number = 50
): Promise<
  Array<{
    rank: number;
    username: string;
    walletAddress: string;
    totalPurchased: number;
    avatarUrl?: string;
  }>
>
```

### Location

File: `realmkin/src/services/leaderboardService.ts`

### Implementation Steps

```typescript
// Step 1: Query all secondarySaleCache entries
const cacheSnapshot = await getDocs(collection(db, "secondarySaleCache"));

// Step 2: Filter and sort by salesCount descending
const sortedBuyers = cacheSnapshot.docs
  .map((doc) => ({
    id: doc.id,
    walletAddress: doc.data().walletAddress || doc.id,
    salesCount: doc.data().salesCount || 0,
  }))
  .filter((buyer) => buyer.salesCount > 0)
  .sort((a, b) => b.salesCount - a.salesCount)
  .slice(0, limit);

// Step 3: Batch lookup user IDs from wallets collection
const walletLookup = new Map();
// ... batch fetch wallets ...

// Step 4: Fallback to userRewards for missing wallets
// ... query userRewards ...

// Step 5: Batch fetch user profiles
const userProfiles = new Map();
// ... batch fetch users ...

// Step 6: Build final leaderboard
const leaderboard = sortedBuyers.map((cacheData, index) => ({
  rank: index + 1,
  username: /* from user profile */,
  walletAddress: cacheData.walletAddress,
  totalPurchased: cacheData.salesCount,
  avatarUrl: /* from user profile */,
}));
```

---

## Usage Examples

### Basic Usage

```typescript
import { fetchSecondaryMarketLeaderboard } from '@/services/leaderboardService';

// Fetch top 50 secondary market buyers
const leaderboard = await fetchSecondaryMarketLeaderboard(50);

console.log(leaderboard);
// [
//   {
//     rank: 1,
//     userId: "abc123...",
//     username: "JohnDoe",
//     walletAddress: "8w1dD5V...pfXsM",
//     totalPurchased: 15,
//     avatarUrl: "https://..."
//   },
//   ...
// ]
```

### React Component Example

```typescript
'use client';

import { useEffect, useState } from 'react';
import { fetchSecondaryMarketLeaderboard } from '@/services/leaderboardService';

export default function SecondaryMarketLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSecondaryMarketLeaderboard(50);
        setLeaderboard(data);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Top Secondary Market Buyers</h2>
      {leaderboard.map((entry) => (
        <div key={entry.rank}>
          <span>#{entry.rank}</span>
          <span>{entry.username}</span>
          <span>{entry.totalPurchased} NFTs</span>
        </div>
      ))}
    </div>
  );
}
```

### Get Total Market Volume

```typescript
const allBuyers = await fetchSecondaryMarketLeaderboard(500);
const totalPurchases = allBuyers.reduce((sum, entry) => 
  sum + entry.totalPurchased, 0
);

console.log(`Total secondary market purchases: ${totalPurchases}`);
console.log(`Unique buyers: ${allBuyers.length}`);
```

### Check User Rank

```typescript
const leaderboard = await fetchSecondaryMarketLeaderboard(100);
const userEntry = leaderboard.find(
  entry => entry.walletAddress.toLowerCase() === userWallet.toLowerCase()
);

if (userEntry) {
  console.log(`User ranked #${userEntry.rank} with ${userEntry.totalPurchased} purchases!`);
}
```

---

## Important Notes

### Cache Freshness

The function reads from the `secondarySaleCache` collection. This cache is populated by:

1. **Backend API:** `/api/revenue-distribution/refresh-secondary-market`
2. **Automatic refresh:** Daily at 02:00 AM WAT (Nigerian time)
3. **Manual refresh:** Users can trigger refresh from the account page

For the freshest data, call the backend API before fetching the leaderboard:

```typescript
// Trigger cache refresh
await fetch('/api/revenue-distribution/refresh-secondary-market', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});

// Wait for cache to update
await new Promise(resolve => setTimeout(resolve, 1000));

// Fetch fresh leaderboard
const leaderboard = await fetchSecondaryMarketLeaderboard(50);
```

### Data Validation

- ✅ Only includes users with **actual registered accounts**
- ✅ Only includes wallets with **salesCount > 0**
- ✅ Sorted by **highest purchases first** (descending order)
- ✅ Returns **data only** (no UI components)

### Error Handling

The function returns an empty array `[]` on error. Always check the result:

```typescript
const leaderboard = await fetchSecondaryMarketLeaderboard(50);
if (leaderboard.length === 0) {
  console.log('No secondary market buyers found or error occurred');
}
```

---

## Testing

See example usage in: `src/services/examples/secondaryMarketLeaderboard.example.ts`

---

## Related Files

- `src/services/leaderboardService.ts` - Main implementation
- `backend-api/routes/leaderboard.js` - Backend API endpoint
- `backend-api/routes/revenue-distribution.js` - Cache refresh endpoint
- `backend-api/services/secondarySaleVerification.js` - Cache population logic

---

## Author

Generated as part of the Secondary Market Leaderboard implementation task.
