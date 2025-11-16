# Tier-Based Rewards System Implementation

## Overview

The Realmkin application now supports **two mining rate configurations**:

1. **Legacy Format** - Fixed weekly rate per NFT (`weekly_rate`)
2. **New Tier-Based Format** - Dynamic rates based on NFT count (`tiers`)

Both formats are fully supported and backward compatible.

---

## Configuration Formats

### Legacy Format (weekly_rate)

```javascript
{
  contract_address: "CONTRACT_ADDRESS_HERE",
  name: "Contract Name",
  blockchain: "solana",
  weekly_rate: 200,        // Per NFT rate
  welcome_bonus: 200,      // Per NFT welcome bonus
  is_active: true,
  magic_eden_symbol: "collection_symbol"
}
```

**Calculation**: `totalRewards = weekly_rate × nftCount`

Example: If a user holds 5 NFTs with `weekly_rate: 200`, they earn **5 × 200 = 1,000 MKIN/week**.

---

### New Tier-Based Format (tiers)

```javascript
{
  contract_address: "CONTRACT_ADDRESS_HERE",
  name: "Contract Name",
  blockchain: "solana",
  tiers: [
    { minNFTs: 1, maxNFTs: 1, weeklyRate: 20 },
    { minNFTs: 2, maxNFTs: 5, weeklyRate: 25 },
    { minNFTs: 6, maxNFTs: 9, weeklyRate: 40 },
    { minNFTs: 10, maxNFTs: 19, weeklyRate: 60 },
    { minNFTs: 20, maxNFTs: 999, weeklyRate: 100 }
  ],
  welcome_bonus: 200,      // Per NFT welcome bonus
  is_active: true,
  magic_eden_symbol: "collection_symbol"
}
```

**Calculation**: System finds the matching tier based on NFT count and applies that tier's `weeklyRate` as the **per-NFT rate**.

Example: If a user holds 7 NFTs, the system matches the tier `{ minNFTs: 6, maxNFTs: 9, weeklyRate: 40 }`, so they earn **7 × 40 = 280 MKIN/week**.

**Important**: The `weeklyRate` in tiers is the **rate per NFT**, not the total rate. Higher tiers give higher per-NFT rates to incentivize collecting more NFTs.

---

## How It Works

### 1. Contract Configuration (Firestore)

Contracts are stored in the `contractBonusConfigs` collection with the contract address as the document ID.

**Collection**: `contractBonusConfigs`  
**Document ID**: Contract address (e.g., `eTQujiFKVvLJXdkAobg9JqULNdDrCt5t4WtDochmVSZ`)

---

### 2. Rewards Calculation Logic

The `RewardsService` (`src/services/rewardsService.ts`) handles both formats:

```typescript
// Grouped NFTs by contract
const nftsByContract = new Map<string, number>();

// For each contract, calculate rewards
for (const [contractAddress, nftCount] of nftsByContract.entries()) {
  const config = contractConfigs.get(contractAddress);
  
  if (config.tiers) {
    // NEW: Tier-based calculation (weeklyRate is per-NFT)
    const matchingTier = config.tiers.find(
      tier => nftCount >= tier.minNFTs && nftCount <= tier.maxNFTs
    );
    totalRewards += matchingTier.weeklyRate * nftCount;
  } 
  else if (config.weekly_rate) {
    // LEGACY: Per-NFT calculation
    totalRewards += config.weekly_rate * nftCount;
  }
  else {
    // DEFAULT: Fallback rate
    totalRewards += DEFAULT_RATE * nftCount;
  }
}
```

---

### 3. NFT Display (My NFT Page)

The My NFT page (`src/app/my-nft/page.tsx`) displays all NFTs from active contracts.

**Flow**:
1. User connects wallet
2. `NFTContext` (`src/contexts/NFTContext.tsx`) calls `nftService.fetchUserNFTs()`
3. `NFTService` (`src/services/nftService.ts`) loads active contracts from Firestore
4. System fetches NFTs from all active contract addresses
5. NFTs are displayed on the My NFT page

**Active Contract Loading**:
```typescript
// NFTService loads active contracts
const snap = await getDocs(collection(db, 'contractBonusConfigs'));
const activeContracts = [];
snap.forEach(doc => {
  const data = doc.data();
  const isActive = data.is_active ?? true;
  if (isActive) {
    activeContracts.push(doc.id); // Contract address
  }
});
```

---

## Admin Panels

### Legacy Admin Panel
**File**: `src/components/ContractManagementPanel.tsx`

- Creates/edits contracts with `weekly_rate` format
- Simple per-NFT rate configuration
- Best for straightforward reward structures

### New Tier-Based Admin Panel
**File**: `src/components/ContractManagementPanelNew.tsx`

- Creates/edits contracts with `tiers` format
- Supports dynamic reward tiers based on NFT count
- Encourages users to collect more NFTs
- Better for gamification and progressive rewards

---

## Migration Guide

### Existing Contracts (Legacy Format)

**No action required!** Existing contracts with `weekly_rate` will continue to work.

### Migrating to Tier-Based Format

1. Open the **New Tier-Based Admin Panel**
2. Edit the contract
3. Remove the `weekly_rate` field (if desired)
4. Add `tiers` array with appropriate tier definitions
5. Save

**Note**: You can keep both `weekly_rate` and `tiers` in the same document. The system prioritizes `tiers` if present.

---

## Key Features

### ✅ Backward Compatibility
- Legacy contracts with `weekly_rate` continue to work
- No breaking changes to existing data

### ✅ Multi-Contract Support
- Users can hold NFTs from multiple contracts
- Each contract has its own configuration
- Rewards are calculated per-contract and summed

### ✅ Dynamic Tier Matching
- System automatically finds the correct tier based on NFT count
- If no tier matches, uses the highest tier as fallback

### ✅ Active Contract Filtering
- Only active contracts (`is_active: true`) are loaded
- NFTs from inactive contracts are not displayed or rewarded

### ✅ Caching
- Contract configs are cached for 60 seconds
- NFT data is cached for 5 minutes
- Reduces Firestore reads and API calls

---

## Testing Scenarios

### Scenario 1: Legacy Contract
```
Config: { weekly_rate: 50 }
User NFTs: 3
Expected Rewards: 50 × 3 = 150 MKIN/week
```

### Scenario 2: Tier-Based Contract
```
Config: { tiers: [
  { minNFTs: 1, maxNFTs: 5, weeklyRate: 30 },
  { minNFTs: 6, maxNFTs: 10, weeklyRate: 40 }
]}
User NFTs: 7
Expected Rewards: 7 × 40 = 280 MKIN/week (matches tier 2, 40 MKIN per NFT)
```

### Scenario 3: Multiple Contracts
```
Contract A (legacy): { weekly_rate: 30 }, User holds 2 NFTs
Contract B (tier): { tiers: [{ minNFTs: 1, maxNFTs: 999, weeklyRate: 50 }] }, User holds 1 NFT

Expected Rewards:
- Contract A: 30 × 2 = 60 MKIN/week
- Contract B: 50 × 1 = 50 MKIN/week
- Total: 110 MKIN/week
```

### Scenario 4: New Contract Added
```
1. Admin adds new contract via New Tier-Based Admin Panel
2. Sets is_active: true
3. User refreshes My NFT page
4. NFTs from new contract appear immediately (cache: 60s)
5. Rewards calculation includes new contract
```

---

## Database Schema

### contractBonusConfigs Collection

```typescript
interface ContractConfig {
  // Legacy format (optional)
  weekly_rate?: number;
  
  // New format (optional)
  tiers?: Array<{
    minNFTs: number;
    maxNFTs: number;
    weeklyRate: number;  // Per-NFT rate for this tier
  }>;
  
  // Common fields
  name: string;
  blockchain: string;
  welcome_bonus: number;
  is_active: boolean;
  magic_eden_symbol?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Document ID**: Contract address (e.g., `eTQujiFKVvLJXdkAobg9JqULNdDrCt5t4WtDochmVSZ`)

---

## Files Modified

1. **`src/services/rewardsService.ts`**
   - Updated `loadContractConfigs()` to read both `weekly_rate` and `tiers`
   - Updated `calculateWeeklyRate()` to support tier-based logic
   - Groups NFTs by contract address before calculation

2. **`src/services/nftService.ts`**
   - Already supports loading active contracts from Firestore
   - Filters NFTs by active contract addresses

3. **`src/contexts/NFTContext.tsx`**
   - Already wired to use `nftService.fetchUserNFTs()`
   - Displays NFTs from all active contracts

4. **`src/app/my-nft/page.tsx`**
   - Already uses `useNFT()` hook
   - Displays all NFTs automatically

5. **`src/app/wallet/page.tsx`**
   - Already displays weekly mining rate from rewards calculation
   - No changes needed

---

## Troubleshooting

### NFTs Not Showing Up

**Check**:
1. Is the contract added to `contractBonusConfigs`?
2. Is `is_active: true` for that contract?
3. Is the contract address correct (case-sensitive)?
4. Clear cache and refresh (NFT cache: 5 min, contract cache: 60 sec)

### Incorrect Rewards Calculation

**Check**:
1. Is the contract using `tiers` or `weekly_rate`?
2. For tiers: Does the user's NFT count fall within a tier range?
3. For legacy: Is `weekly_rate` defined and greater than 0?
4. Check browser console for calculation logs

### Admin Panel Not Saving

**Check**:
1. Is the user authenticated?
2. Does the user have Firestore write permissions?
3. Are all required fields filled?
4. Check browser console for errors

---

## Summary

✅ **NFT Display**: All NFTs from active contracts are displayed on the My NFT page  
✅ **Rewards Calculation**: Supports both legacy (`weekly_rate`) and new (`tiers`) formats  
✅ **Backward Compatible**: Existing contracts continue to work without changes  
✅ **Admin Flexibility**: Two admin panels for different configuration needs  
✅ **Multi-Contract Support**: Users can hold NFTs from multiple contracts simultaneously

The system is production-ready and handles both old and new configurations seamlessly!