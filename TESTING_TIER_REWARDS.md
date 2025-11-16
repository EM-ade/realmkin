# Testing Tier-Based Rewards System

## Quick Test Guide

This guide helps you verify that the tier-based rewards system is working correctly.

---

## 🧪 Test Mode (Development Only)

Test mode is **only available when `NODE_ENV=development`**.

### Enable Test Mode

1. **Wallet Page**: Click the "Test Mode" button in the top-right of the REWARD section
2. **My NFT Page**: Click the "🧪 Test" button in the NFT list header

### What Test Mode Does

- **Wallet Page**: Adds 1 test NFT from contract `GZv3nDEoD9poH1PN8A9oMUQCZo77ZeBq4peK9MYFq9Rb`
- **My NFT Page**: Adds 3 sample NFTs for visual testing

---

## 🔍 Debug Logging

The rewards service now includes extensive console logging:

### 1. Contract Config Loading

```
🔧 Loading contract configs from Firestore...
   Found 2 documents

📄 Document ID: GZv3nDEoD9poH1PN8A9oMUQCZo77ZeBq4peK9MYFq9Rb
   Raw data: { name: "...", tiers: [...], ... }
   Parsed config: { tiers: [...], is_active: true }

✅ Loaded 2 contract configs into cache
```

### 2. Rewards Calculation

```
🔍 Rewards Calculation Debug:
NFTs by contract: { "GZv3n...": 1, "eTQu...": 3 }

📦 Contract: GZv3n...
   NFT Count: 1
   Config: { has_tiers: true, tiers: [...], is_active: true }
   ✓ Using TIER-BASED calculation
   ✓ Matched tier: 1-1 NFTs = 20 MKIN/week

📦 Contract: eTQu...
   NFT Count: 3
   Config: { has_tiers: false, weekly_rate: 200, is_active: true }
   ✓ Using LEGACY calculation: 200 MKIN × 3 NFTs = 600 MKIN/week

💰 TOTAL Weekly Rewards: 620 MKIN/week
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Contract not active/configured, using DEFAULT"

**Symptom**: Console shows:
```
⚠️ Contract not active/configured, using DEFAULT: 200 MKIN/week
```

**Possible Causes**:
1. Contract not added to Firestore `contractBonusConfigs` collection
2. Contract `is_active: false`
3. Contract address mismatch (case-sensitive!)
4. Config cache is stale

**Solutions**:
- ✅ Add contract via Admin Panel
- ✅ Check `is_active` field is `true`
- ✅ Verify contract address matches exactly
- ✅ Click "🔄 Reload Configs" button (Wallet page, dev mode)
- ✅ Wait 60 seconds for cache to expire

### Issue 2: Still using 200 MKIN per NFT instead of tiers

**Symptom**: Console shows:
```
✓ Using LEGACY calculation: 200 MKIN × 3 NFTs = 600 MKIN/week
```

**Cause**: Contract has `weekly_rate` field but no `tiers` field

**Solutions**:
- ✅ Open **New Tier-Based Admin Panel** (`ContractManagementPanelNew.tsx`)
- ✅ Edit the contract
- ✅ Add tiers array
- ✅ Click "🔄 Reload Configs" to refresh cache

### Issue 3: Tiers not showing up in console

**Symptom**: Console shows:
```
Config: { has_tiers: false, weekly_rate: undefined, is_active: true }
```

**Cause**: Tiers not saved properly or cache issue

**Solutions**:
- ✅ Check Firestore console - verify `tiers` array exists
- ✅ Verify tier format:
  ```javascript
  tiers: [
    { minNFTs: 1, maxNFTs: 5, weeklyRate: 100 },
    { minNFTs: 6, maxNFTs: 10, weeklyRate: 200 }
  ]
  ```
- ✅ Click "🔄 Reload Configs" button
- ✅ Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

---

## ✅ Verification Checklist

### Step 1: Add Test Contract

1. Open Admin Panel (New Tier-Based version)
2. Add contract: `GZv3nDEoD9poH1PN8A9oMUQCZo77ZeBq4peK9MYFq9Rb`
3. Configure tiers:
   ```
   Tier 1: 1-1 NFTs = 20 MKIN/week
   Tier 2: 2-5 NFTs = 25 MKIN/week
   Tier 3: 6-9 NFTs = 40 MKIN/week
   Tier 4: 10-19 NFTs = 60 MKIN/week
   Tier 5: 20-999 NFTs = 100 MKIN/week
   ```
4. Set `is_active: true`
5. Save

### Step 2: Enable Test Mode

1. Open Wallet page (`/wallet`)
2. Connect wallet
3. Click "Test Mode" button (dev only)
4. Open browser console (F12)

### Step 3: Check Console Logs

Look for:
```
🔧 Loading contract configs from Firestore...
📄 Document ID: GZv3nDEoD9poH1PN8A9oMUQCZo77ZeBq4peK9MYFq9Rb
   Parsed config: { tiers: [Array(5)], is_active: true }
```

Then:
```
📦 Contract: GZv3nDEo...
   NFT Count: 1
   ✓ Using TIER-BASED calculation
   ✓ Matched tier: 1-1 NFTs = 20 MKIN/week
```

### Step 4: Verify UI

Check the **Mining Rate / Week** section:
- Should show total weekly rate
- Should reflect tier-based calculation
- Should update when test mode is toggled

---

## 🔄 Manual Config Reload

If configs are cached and you made changes:

1. **Wallet Page (Dev Mode)**:
   - Click "🔄 Reload Configs" button
   - Triggers `rewardsService.reloadContractConfigs()`
   - Clears cache and refetches from Firestore

2. **Browser Console**:
   ```javascript
   // Manual reload
   await rewardsService.reloadContractConfigs();
   ```

---

## 📊 Expected Behavior

### Tier-Based Contract (1 NFT)
```
Config: tiers: [{ minNFTs: 1, maxNFTs: 1, weeklyRate: 20 }]
User NFTs: 1
Expected: 20 MKIN/week (NOT 200!)
```

### Legacy Contract (3 NFTs)
```
Config: weekly_rate: 200
User NFTs: 3
Expected: 600 MKIN/week (200 × 3)
```

### Mixed (1 tier + 3 legacy)
```
Contract A (tier): 1 NFT = 20 MKIN/week
Contract B (legacy): 3 NFTs × 200 = 600 MKIN/week
Total: 620 MKIN/week
```

---

## 🎯 Testing Scenarios

### Scenario 1: Single Tier Contract
1. Add contract with tiers
2. Enable test mode (adds 1 NFT)
3. **Expected**: Matches tier 1 (1-1 NFTs)
4. **Console**: `Matched tier: 1-1 NFTs = 20 MKIN/week`

### Scenario 2: Growing NFT Count
1. Start with 1 NFT → Tier 1 (20 MKIN)
2. Add 4 more (total 5) → Tier 2 (25 MKIN)
3. Add 5 more (total 10) → Tier 4 (60 MKIN)
4. Rewards should jump between tiers, not multiply

### Scenario 3: Multiple Contracts
1. Hold NFTs from 2+ contracts
2. Each contract calculates independently
3. Total = sum of all contract rewards

---

## 🚨 Red Flags

### ❌ BAD: Per-NFT multiplication on tier-based contract
```
📦 Contract: GZv3n...
   NFT Count: 3
   ✓ Using TIER-BASED calculation
   ✓ Matched tier: 2-5 NFTs = 25 MKIN/week
   💰 TOTAL: 75 MKIN/week  <-- WRONG! Should be 25!
```

### ✅ GOOD: Tier rate applied once
```
📦 Contract: GZv3n...
   NFT Count: 3
   ✓ Using TIER-BASED calculation
   ✓ Matched tier: 2-5 NFTs = 25 MKIN/week
   💰 TOTAL: 25 MKIN/week  <-- CORRECT!
```

---

## 🛠️ Developer Tools

### Force Clear Cache
```javascript
// In browser console
localStorage.clear(); // Clear NFT cache
location.reload(); // Hard refresh
```

### Check Firestore Data
1. Open Firebase Console
2. Go to Firestore Database
3. Open `contractBonusConfigs` collection
4. Check document structure:
   ```
   {
     name: "Contract Name",
     blockchain: "solana",
     tiers: [
       { minNFTs: 1, maxNFTs: 5, weeklyRate: 100 }
     ],
     is_active: true,
     welcome_bonus: 200
   }
   ```

### Test Rewards Calculation
```javascript
// In browser console
const nfts = [
  { contractAddress: "GZv3nDEoD9poH1PN8A9oMUQCZo77ZeBq4peK9MYFq9Rb" }
];
const weeklyRate = await rewardsService.calculateWeeklyRate(nfts);
console.log("Weekly Rate:", weeklyRate);
```

---

## 📝 Summary

✅ **Test mode is dev-only**: Controlled by `NODE_ENV`  
✅ **Extensive logging**: Check console for calculation details  
✅ **Reload button**: Force refresh configs without restarting  
✅ **Tier priority**: Tiers take precedence over `weekly_rate`  
✅ **Per-contract calculation**: Each contract calculates independently  

If you see "using DEFAULT" in the console, the contract isn't properly configured!