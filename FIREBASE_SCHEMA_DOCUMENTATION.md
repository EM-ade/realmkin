# Firebase Database Schema Documentation

## Overview
This document provides a comprehensive overview of the Realmkin Firebase Firestore database structure, including all collections, their purposes, and field definitions.

---

## Collections Summary

| Collection | Documents | Purpose |
|------------|-----------|---------|
| `users` | ~Active users | User profiles and authentication data |
| `userRewards` | ~Active users | NFT holder mining rewards tracking |
| `usernames` | ~Active users | Username to UID mapping (immutable) |
| `wallets` | ~Active wallets | Wallet address to UID mapping (immutable) |
| `stakes` | Variable | Legacy staking records (flat structure) |
| `staking_records` | Variable | Mirror of staking data |
| `claimRecords` | ~Claims | History of NFT reward claims |
| `transactionHistory` | ~Transactions | Transaction ledger for all operations |
| `transferRecords` | ~Transfers | MKIN transfer records between users |
| `contractBonusConfigs` | ~NFT contracts | Reward configuration per NFT contract |
| `contractWelcomeGrants` | ~User×Contract | Tracks welcome bonuses per user per contract |
| `rateLimits` | ~Active users | Rate limiting for claim operations |
| `leaderboards` | Various | Game leaderboard data |
| `userStats` | ~Active users | User gameplay statistics |
| `kingdoms` | Variable | Gameplay kingdom data |
| `empires` | Variable | Gameplay empire data |
| `monthlyArchive` | Variable | Archived monthly data |
| `adminConfig` | System | Admin configuration (no public access) |
| `adminUids` | Admins | Admin user IDs (no public access) |

---

## Core Collections

### 1. `users/{userId}`
**Purpose:** User profile and authentication data  
**Document ID:** Firebase Auth UID

```typescript
interface User {
  email: string;                    // Auto-generated or user email
  walletAddress?: string;           // Connected Solana wallet address
  username?: string;                // Display username
  admin?: boolean;                  // Admin privileges flag
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  uid?: string;                     // Redundant UID field (for legacy)
  password?: string;                // Legacy field (should not be used)
}
```

**Security Rules:**
- Read: Public
- Create/Update: Owner or Admin only
- Delete: Admin only

---

### 2. `userRewards/{userId}`
**Purpose:** NFT holder mining rewards system (separate from staking)  
**Document ID:** Firebase Auth UID

```typescript
interface UserRewards {
  // Identity
  userId: string;                   // Firebase Auth UID
  walletAddress: string;            // Connected wallet address
  
  // NFT Holdings
  totalNFTs: number;                // Total NFTs held across all contracts
  
  // Mining Rates (MKIN per week)
  weeklyRate: number;               // Base weekly mining rate (tier-based)
  bonusWeeklyRate?: number;         // Admin-granted bonus rate (optional)
  
  // Balance Tracking
  totalEarned: number;              // Total MKIN earned all-time
  totalClaimed: number;             // Total MKIN claimed all-time
  totalRealmkin: number;            // Current MKIN balance (main wallet)
  pendingRewards: number;           // Rewards ready to claim
  
  // Timestamps
  lastCalculated: Timestamp;        // Last reward calculation time
  lastClaimed: Timestamp | null;    // Last successful claim time (null if never claimed)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Key Fields Explained:**
- `weeklyRate`: Calculated based on NFT holdings and tier configurations from `contractBonusConfigs`
- `totalRealmkin`: **This is the user's wallet balance** - the main field for compensation
- `pendingRewards`: Unclaimed mining rewards that accumulate weekly
- `bonusWeeklyRate`: Used for manual admin bonuses or compensation adjustments

**Security Rules:**
- Read: Owner or Admin only
- Create/Update: Owner or Admin only
- Delete: Admin only

---

### 3. `contractBonusConfigs/{contractAddress}`
**Purpose:** Configure mining rewards per NFT contract with tier support  
**Document ID:** NFT contract address (Solana address)

```typescript
interface ContractBonusConfig {
  contract_address?: string;        // Optional (doc ID is primary)
  
  // Tier-based rates (NEW - preferred)
  tiers?: Array<{
    minNFTs: number;                // Minimum NFTs for this tier
    maxNFTs: number;                // Maximum NFTs for this tier
    weeklyRate: number;             // MKIN per NFT per week
  }>;
  
  // Legacy flat rate (OLD - fallback)
  weekly_rate?: number;             // Flat MKIN per NFT per week
  
  // Bonuses
  welcome_bonus: number;            // One-time bonus for new NFT holders
  
  // Status
  is_active: boolean;               // Whether rewards are active
}
```

**Example Tier Configuration:**
```typescript
{
  tiers: [
    { minNFTs: 1, maxNFTs: 1, weeklyRate: 200 },    // 1 NFT = 200 MKIN/week
    { minNFTs: 2, maxNFTs: 4, weeklyRate: 250 },    // 2-4 NFTs = 250 MKIN/NFT/week
    { minNFTs: 5, maxNFTs: 999, weeklyRate: 300 }   // 5+ NFTs = 300 MKIN/NFT/week
  ],
  welcome_bonus: 200,
  is_active: true
}
```

**Security Rules:**
- Read: Public
- Write: Admin only

---

### 4. `claimRecords/{claimId}`
**Purpose:** Historical record of all NFT reward claims  
**Document ID:** Auto-generated `${userId}_${timestamp}_${random}`

```typescript
interface ClaimRecord {
  id: string;                       // Unique claim ID
  userId: string;                   // Firebase Auth UID
  walletAddress: string;            // Wallet that claimed
  amount: number;                   // MKIN amount claimed
  nftCount: number;                 // NFT count at time of claim
  claimedAt: Timestamp;             // Claim timestamp
  weeksClaimed: number;             // Number of weeks claimed
  transactionHash?: string;         // Optional blockchain tx hash
}
```

**Security Rules:**
- Read: Owner or Admin only (with wallet verification)
- Create: Owner only (must match userId)
- Update/Delete: Not allowed

---

### 5. `transactionHistory/{transactionId}`
**Purpose:** Ledger of all MKIN transactions (claims, withdrawals, transfers)  
**Document ID:** Auto-generated `${userId}_${timestamp}_${random}`

```typescript
interface TransactionHistory {
  id: string;                       // Transaction ID
  userId: string;                   // Firebase Auth UID
  walletAddress: string;            // Associated wallet
  type: "claim" | "withdraw" | "transfer"; // Transaction type
  amount: number;                   // MKIN amount
  description: string;              // Human-readable description
  recipientAddress?: string;        // For transfers
  createdAt: Timestamp;
}
```

**Security Rules:**
- Read: Owner or Admin only (with wallet verification)
- Create: Owner only (must match userId)
- Update/Delete: Not allowed

---

### 6. `transferRecords/{transferId}`
**Purpose:** Record of MKIN transfers between users  
**Document ID:** Auto-generated `${senderUserId}_${recipientUserId}_${timestamp}_${random}`

```typescript
interface TransferRecord {
  id: string;                       // Transfer ID
  senderUserId: string;             // Sender Firebase UID
  recipientUserId: string;          // Recipient Firebase UID
  amount: number;                   // MKIN transferred
  transferredAt: Timestamp;         // Transfer timestamp
}
```

**Security Rules:**
- Read: Sender, Recipient, or Admin only
- Create: Sender only (must match senderUserId)
- Update/Delete: Not allowed

---

### 7. `contractWelcomeGrants/{userId}_{contractAddress}`
**Purpose:** Track welcome bonuses granted per user per contract  
**Document ID:** Composite `${userId}_${contractAddress}`

```typescript
interface ContractWelcomeGrant {
  userId: string;                   // Firebase Auth UID
  contractAddress: string;          // NFT contract address
  lastCount: number;                // Last recorded NFT count
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Purpose:** Prevents duplicate welcome bonuses when user acquires more NFTs from the same contract.

**Security Rules:**
- Read: Public
- Create/Update: Owner only (must match userId)
- Delete: Admin only

---

### 8. `rateLimits/{userId}`
**Purpose:** Rate limiting for claim operations  
**Document ID:** Firebase Auth UID

```typescript
interface RateLimit {
  windowStart: number;              // Timestamp (ms) when window started
  attempts: number;                 // Number of attempts in current window
  lastAttempt: number;              // Timestamp (ms) of last attempt
}
```

**Configuration:**
- Window: 60 seconds
- Max attempts: 3 per window

**Security Rules:**
- Read/Write: Owner or Admin only

---

### 9. `usernames/{username}`
**Purpose:** Map username to user ID (immutable bidirectional lookup)  
**Document ID:** Username (lowercase)

```typescript
interface UsernameMapping {
  uid: string;                      // Firebase Auth UID
}
```

**Security Rules:**
- Read: Public
- Create: Any authenticated user
- Update/Delete: Not allowed (immutable)

---

### 10. `wallets/{walletAddress}`
**Purpose:** Map wallet address to user ID (immutable bidirectional lookup)  
**Document ID:** Wallet address (lowercase)

```typescript
interface WalletMapping {
  uid: string;                      // Firebase Auth UID
}
```

**Security Rules:**
- Read: Public
- Create: Owner only (must match uid to auth.uid)
- Update/Delete: Not allowed (immutable)

---

## Staking Collections (Legacy/Separate System)

### 11. `stakes/{stakeId}` (LEGACY - Flat structure)
**Purpose:** Legacy staking records (flat structure - being deprecated?)

```typescript
interface Stake {
  id: string;
  wallet: string;
  amount: number;
  lock_period: "flexible" | "30" | "60" | "90";
  start_date: Timestamp;
  unlock_date: Timestamp;
  status: "active" | "unstaking" | "completed";
  rewards_earned: number;
  last_reward_update: Timestamp;
  tx_signature: string;
  metadata?: Record<string, unknown>;
}
```

### 12. `staking_records/{recordId}`
**Purpose:** Mirror/alternative structure for staking data

```typescript
interface StakingRecord {
  wallet: string;                   // Should be Firebase UID based on rules
  amount: number;
  lock_period: string;
  start_date: Timestamp;
  status: string;
  // ... similar to stakes
}
```

**Security Rules:**
- Read: Owner or Admin (wallet field matches auth.uid)
- Create: Owner only (wallet must match auth.uid)
- Update/Delete: Not allowed (backend/admin SDK only)

---

## Gameplay Collections

### 13. `leaderboards/current/{type}/{userId}`
**Purpose:** Current leaderboard standings

**Subcollections:**
- `totalScore/{userId}`: Total score leaderboard
- `streak/{userId}`: Streak leaderboard
- `metadata/{docId}`: Leaderboard metadata

```typescript
interface LeaderboardEntry {
  userId: string;
  score: number;
  rank?: number;
  username?: string;
  updatedAt: Timestamp;
}
```

**Security Rules:**
- Read: Public
- Create/Update: Owner or Admin
- Delete: Not allowed

---

### 14. `userStats/{userId}`
**Purpose:** User gameplay statistics

```typescript
interface UserStats {
  userId: string;
  gamesPlayed: number;
  totalScore: number;
  highScore: number;
  currentStreak: number;
  longestStreak: number;
  achievements?: string[];
  lastPlayedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Security Rules:**
- Read: Owner or Admin only
- Create/Update: Owner or Admin only
- Delete: Not allowed

---

### 15. `kingdoms/{kingdomId}` & 16. `empires/{empireId}`
**Purpose:** Gameplay realm/kingdom/empire data

```typescript
interface Kingdom {
  kingdomId: string;
  owner: string;                    // Firebase Auth UID
  name?: string;
  resources?: Record<string, number>;
  buildings?: Array<any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Security Rules:**
- Read: Public
- Create/Update: Owner only (owner field must match auth.uid)
- Delete: Not allowed

---

## Reward Calculation Formulas

### NFT Mining Rewards (Weekly)

```typescript
// 1. Calculate base weekly rate from tier configuration
function calculateWeeklyRate(nfts: NFT[], userId: string): number {
  let totalWeeklyRate = 0;
  
  // Group NFTs by contract
  const nftsByContract = groupByContract(nfts);
  
  for (const [contractAddress, nftCount] of nftsByContract) {
    const config = getContractConfig(contractAddress);
    
    if (config.tiers) {
      // Tier-based calculation (NEW)
      const tier = config.tiers.find(t => 
        nftCount >= t.minNFTs && nftCount <= t.maxNFTs
      );
      totalWeeklyRate += (tier?.weeklyRate || 0) * nftCount;
    } else if (config.weekly_rate) {
      // Legacy flat rate (OLD)
      totalWeeklyRate += config.weekly_rate * nftCount;
    }
  }
  
  // Add user-specific bonus
  totalWeeklyRate += getUserBonusRate(userId);
  
  return totalWeeklyRate;
}

// 2. Calculate pending rewards
function calculatePendingRewards(userRewards: UserRewards): number {
  const now = Date.now();
  const lastClaim = userRewards.lastClaimed?.getTime() || userRewards.createdAt.getTime();
  const timeSinceLastClaim = now - lastClaim;
  const weeksElapsed = Math.floor(timeSinceLastClaim / (7 * 24 * 60 * 60 * 1000));
  
  return userRewards.weeklyRate * weeksElapsed;
}

// 3. Welcome bonus for new NFTs
function calculateWelcomeBonus(userId: string, nfts: NFT[]): number {
  const nftsByContract = groupByContract(nfts);
  let totalBonus = 0;
  
  for (const [contractAddress, currentCount] of nftsByContract) {
    const grant = getContractWelcomeGrant(userId, contractAddress);
    const previousCount = grant?.lastCount || 0;
    const newNFTs = currentCount - previousCount;
    
    if (newNFTs > 0) {
      const config = getContractConfig(contractAddress);
      totalBonus += newNFTs * (config.welcome_bonus || 200);
    }
  }
  
  return totalBonus;
}
```

### Claim Requirements

```typescript
const MILLISECONDS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MIN_CLAIM_AMOUNT = 1; // Minimum 1 MKIN to claim

function canClaim(userRewards: UserRewards): boolean {
  const now = Date.now();
  const lastClaim = userRewards.lastClaimed?.getTime() || userRewards.createdAt.getTime();
  const timeSinceLastClaim = now - lastClaim;
  const weeksElapsed = Math.floor(timeSinceLastClaim / MILLISECONDS_PER_WEEK);
  
  const pendingAmount = userRewards.weeklyRate * weeksElapsed;
  
  return weeksElapsed >= 1 && pendingAmount >= MIN_CLAIM_AMOUNT;
}
```

---

## Important Notes

### Data Integrity
1. **Wallet Mappings are Immutable**: Once a wallet is linked to a UID, it cannot be changed
2. **Username Mappings are Immutable**: Usernames cannot be updated or deleted
3. **Transaction Records are Immutable**: All claim, transfer, and transaction records are append-only

### Reward Systems
⚠️ **There are TWO separate reward systems:**
1. **NFT Mining Rewards** (`userRewards`) - Weekly accumulation based on NFT holdings
2. **Staking Rewards** (`stakes`) - Daily accumulation based on staked tokens (separate system)

These systems are **independent** and use different collections and calculation methods.

### Key Relationships
```
User (users/{uid})
  ├─> UserRewards (userRewards/{uid})
  ├─> ClaimRecords (claimRecords/* where userId = uid)
  ├─> TransactionHistory (transactionHistory/* where userId = uid)
  ├─> TransferRecords (transferRecords/* where senderUserId or recipientUserId = uid)
  ├─> UserStats (userStats/{uid})
  └─> ContractWelcomeGrants (contractWelcomeGrants/{uid}_*)

WalletAddress <─> User (bidirectional via wallets collection)
Username <─> User (bidirectional via usernames collection)
```

---

## Security Model Summary

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| users | Public | Owner/Admin | Owner/Admin | Admin |
| userRewards | Owner/Admin | Owner/Admin | Owner/Admin | Admin |
| claimRecords | Owner/Admin | Owner | ❌ | ❌ |
| transactionHistory | Owner/Admin | Owner | ❌ | ❌ |
| transferRecords | Parties/Admin | Sender | ❌ | ❌ |
| contractBonusConfigs | Public | Admin | Admin | Admin |
| contractWelcomeGrants | Public | Owner | Owner | Admin |
| rateLimits | Owner/Admin | Owner/Admin | Owner/Admin | Owner/Admin |
| usernames | Public | Any Auth | ❌ | ❌ |
| wallets | Public | Owner | ❌ | ❌ |
| leaderboards | Public | Owner/Admin | Owner/Admin | ❌ |
| adminConfig | ❌ | ❌ | ❌ | ❌ |
| adminUids | ❌ | ❌ | ❌ | ❌ |

---

## Collection Sizes (Approximate)

Based on typical usage patterns:

- **users**: ~1,000-10,000 documents (one per user)
- **userRewards**: ~1,000-10,000 documents (one per active user)
- **claimRecords**: ~10,000-100,000+ documents (grows continuously)
- **transactionHistory**: ~10,000-100,000+ documents (grows continuously)
- **contractBonusConfigs**: ~1-50 documents (one per NFT collection)
- **contractWelcomeGrants**: ~5,000-50,000 documents (user × contract combinations)
- **leaderboards**: ~1,000-10,000 active entries
- **stakes**: ~1,000-50,000 documents (historical staking records)

---

## Migration & Backfill Considerations

When backfilling rewards for downtime:

1. **Target Collection**: `userRewards/{userId}`
2. **Key Field**: `totalRealmkin` (this is the wallet balance)
3. **Calculation**: `weeklyRate * 2` (for 2 weeks of downtime)
4. **Bonus Field**: Can use `bonusWeeklyRate` to add permanent bonus, or directly add to `totalRealmkin`

Example backfill:
```typescript
const twoWeeksBonus = userRewards.weeklyRate * 2;
await updateDoc(userRewardsRef, {
  totalRealmkin: userRewards.totalRealmkin + twoWeeksBonus,
  updatedAt: new Date()
});
```

---

**Last Updated**: 2025  
**Schema Version**: 2.0 (Tier-based rewards)
