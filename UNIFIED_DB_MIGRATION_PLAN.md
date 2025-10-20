# Unified Database Migration Plan

## Problem Statement

Currently, the Realmkin platform has **two separate databases**:
- **Firebase Firestore** - Used by the website
- **Gatekeeper DB** - Used by the Discord bot

This causes:
- ❌ Balance inconsistencies between website and Discord
- ❌ Manual sync required via `/api/ledger` calls
- ❌ Potential data loss if sync fails
- ❌ Complex error handling
- ❌ Difficult to debug issues

## Proposed Solution

**Make Firebase Firestore the single source of truth** for all balance data.

### Architecture Change

**Before:**
```
Website → Firebase (primary)
         ↓ (manual sync via /api/ledger)
Discord Bot → Gatekeeper DB (separate)
```

**After:**
```
Website → Firebase (unified)
         ↑
Discord Bot → Firebase (unified)
```

---

## Migration Steps

### Phase 1: Update Gatekeeper Bot to Use Firebase

#### 1.1 Add Firebase Admin SDK to Gatekeeper
```bash
# In gatekeeper project
npm install firebase-admin
```

#### 1.2 Configure Firebase Admin in Gatekeeper
```javascript
// gatekeeper/src/firebase.js
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'realmkin'
});

const db = admin.firestore();
module.exports = { admin, db };
```

#### 1.3 Update Gatekeeper Balance Queries
Replace Gatekeeper DB queries with Firebase queries:

```javascript
// OLD (Gatekeeper DB)
async function getBalance(userId) {
  const result = await gatekeeperDB.query(
    'SELECT balance FROM balances WHERE user_id = $1',
    [userId]
  );
  return result.rows[0]?.balance || 0;
}

// NEW (Firebase)
async function getBalance(userId) {
  const { db } = require('./firebase');
  const doc = await db.collection('userRewards').doc(userId).get();
  
  if (!doc.exists) return 0;
  
  const data = doc.data();
  return data.totalRealmkin || 0;
}
```

#### 1.4 Update Gatekeeper Transfer Logic
```javascript
// NEW (Firebase Transaction)
async function transfer(fromUserId, toWalletAddress, amount) {
  const { db, admin } = require('./firebase');
  
  // Find recipient by wallet address
  const walletDoc = await db.collection('wallets')
    .doc(toWalletAddress.toLowerCase())
    .get();
  
  if (!walletDoc.exists) {
    throw new Error('Recipient wallet not found');
  }
  
  const toUserId = walletDoc.data().uid;
  
  // Atomic transaction
  return db.runTransaction(async (transaction) => {
    const fromRef = db.collection('userRewards').doc(fromUserId);
    const toRef = db.collection('userRewards').doc(toUserId);
    
    const fromDoc = await transaction.get(fromRef);
    const toDoc = await transaction.get(toRef);
    
    if (!fromDoc.exists) throw new Error('Sender not found');
    
    const fromBalance = fromDoc.data().totalRealmkin || 0;
    if (fromBalance < amount) throw new Error('Insufficient balance');
    
    // Debit sender
    transaction.update(fromRef, {
      totalRealmkin: admin.firestore.FieldValue.increment(-amount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Credit recipient (create if doesn't exist)
    if (toDoc.exists) {
      transaction.update(toRef, {
        totalRealmkin: admin.firestore.FieldValue.increment(amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      transaction.set(toRef, {
        userId: toUserId,
        walletAddress: toWalletAddress,
        totalRealmkin: amount,
        totalNFTs: 0,
        weeklyRate: 0,
        totalEarned: 0,
        totalClaimed: 0,
        pendingRewards: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return { success: true, newBalance: fromBalance - amount };
  });
}
```

### Phase 2: Remove Gatekeeper Sync Calls from Website

#### 2.1 Remove `/api/ledger` Calls
**File: `src/app/wallet/page.tsx`**

```typescript
// REMOVE THIS (lines 283-297):
try {
  const auth = getAuth();
  const token = await auth.currentUser!.getIdToken();
  const refId = `withdraw:${user.uid}:${Date.now()}`;
  await fetch(`${gatekeeperBase}/api/ledger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ delta: -Math.trunc(amount), reason: 'withdrawal', refId }),
  });
} catch (e) {
  console.warn('Failed to mirror withdrawal to ledger:', e);
}

// Withdrawal is already handled by Firebase in rewardsService
```

#### 2.2 Update Transfer Function
**File: `src/app/wallet/page.tsx`**

```typescript
// REMOVE Gatekeeper transfer call (lines 363-379)
// REPLACE with direct Firebase transaction

const handleTransfer = useCallback(async () => {
  if (!account || !transferRecipient || !transferAmount) return;

  const amount = parseFloat(transferAmount);
  if (isNaN(amount) || amount <= 0) {
    setTransferError("Please enter a valid amount");
    return;
  }

  if (amount > (userRewards?.totalRealmkin || 0)) {
    setTransferError("Insufficient balance");
    return;
  }

  setTransferLoading(true);
  setTransferError(null);

  try {
    // Use rewardsService to handle transfer
    await rewardsService.transferRealmkin(
      user!.uid,
      transferRecipient,
      amount
    );

    // Refresh balance
    const updatedRewards = await rewardsService.getUserRewards(user!.uid);
    setUserRewards(updatedRewards);

    // Show confirmation
    setLastTransferAmount(amount);
    setLastTransferRecipient(transferRecipient);
    setShowTransferConfirmation(true);

    // Save to transaction history
    await rewardsService.saveTransactionHistory({
      userId: user!.uid,
      walletAddress: account,
      type: "transfer",
      amount: amount,
      description: `Sent ${rewardsService.formatMKIN(amount)} to ${formatAddress(transferRecipient)}`,
      recipientAddress: transferRecipient,
    });

    // Clear inputs
    setTransferRecipient("");
    setTransferAmount("");
  } catch (error) {
    console.error("Error processing transfer:", error);
    setTransferError(
      error instanceof Error ? error.message : "Transfer failed"
    );
  } finally {
    setTransferLoading(false);
  }
}, [account, transferRecipient, transferAmount, userRewards, user]);
```

#### 2.3 Add Transfer Method to rewardsService
**File: `src/services/rewardsService.ts`**

```typescript
async transferRealmkin(
  fromUserId: string,
  toWalletAddress: string,
  amount: number
): Promise<void> {
  // Find recipient by wallet address
  const walletDoc = await getDoc(
    doc(db, "wallets", toWalletAddress.toLowerCase())
  );

  if (!walletDoc.exists()) {
    throw new Error("Recipient wallet not found");
  }

  const toUserId = walletDoc.data().uid;

  if (fromUserId === toUserId) {
    throw new Error("Cannot transfer to yourself");
  }

  // Use Firestore transaction for atomicity
  await runTransaction(db, async (transaction) => {
    const fromRef = doc(db, "userRewards", fromUserId);
    const toRef = doc(db, "userRewards", toUserId);

    const fromDoc = await transaction.get(fromRef);
    const toDoc = await transaction.get(toRef);

    if (!fromDoc.exists()) {
      throw new Error("Sender rewards not found");
    }

    const fromData = fromDoc.data() as UserRewards;
    const fromBalance = fromData.totalRealmkin || 0;

    if (fromBalance < amount) {
      throw new Error("Insufficient balance");
    }

    // Debit sender
    transaction.update(fromRef, {
      totalRealmkin: fromBalance - amount,
      updatedAt: new Date(),
    });

    // Credit recipient
    if (toDoc.exists()) {
      const toData = toDoc.data() as UserRewards;
      transaction.update(toRef, {
        totalRealmkin: (toData.totalRealmkin || 0) + amount,
        updatedAt: new Date(),
      });
    } else {
      // Create new rewards document for recipient
      transaction.set(toRef, {
        userId: toUserId,
        walletAddress: toWalletAddress,
        totalRealmkin: amount,
        totalNFTs: 0,
        weeklyRate: 0,
        totalEarned: 0,
        totalClaimed: 0,
        pendingRewards: 0,
        lastCalculated: new Date(),
        lastClaimed: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserRewards);
    }
  });
}
```

### Phase 3: Update Balance Display Logic

#### 3.1 Remove Unified Balance Fetching
**File: `src/app/wallet/page.tsx` (lines 505-534)**

```typescript
// REMOVE THIS - No longer need to fetch from Gatekeeper
useEffect(() => {
  async function fetchUnifiedBalance() {
    // ... DELETE THIS ENTIRE EFFECT
  }
  fetchUnifiedBalance();
}, [user?.uid, gatekeeperBase]);
```

#### 3.2 Simplify Balance Display
```typescript
// OLD (lines 69-82):
const walletDisplayValue = useMemo(() => {
  const fb = userRewards ? userRewards.totalRealmkin : null;
  const uni = typeof unifiedBalance === "number" ? unifiedBalance : null;
  if (fb !== null && uni !== null) {
    return Math.max(fb, uni);
  }
  if (uni !== null) {
    return uni;
  }
  if (fb !== null) {
    return fb;
  }
  return 0;
}, [userRewards, unifiedBalance]);

// NEW (simplified):
const walletDisplayValue = useMemo(() => {
  return userRewards?.totalRealmkin || 0;
}, [userRewards]);
```

### Phase 4: Data Migration

#### 4.1 Migrate Existing Gatekeeper Balances to Firebase

Create a migration script:

```javascript
// scripts/migrate-gatekeeper-to-firebase.js
const admin = require('firebase-admin');
const { Pool } = require('pg');

// Initialize Firebase
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Initialize Gatekeeper DB
const pool = new Pool({
  connectionString: process.env.GATEKEEPER_DATABASE_URL
});

async function migrate() {
  console.log('🚀 Starting migration from Gatekeeper to Firebase...');
  
  // Get all balances from Gatekeeper
  const result = await pool.query('SELECT user_id, balance FROM ledger');
  
  let migrated = 0;
  let errors = 0;
  
  for (const row of result.rows) {
    try {
      const { user_id, balance } = row;
      
      // Get current Firebase balance
      const docRef = db.collection('userRewards').doc(user_id);
      const doc = await docRef.get();
      
      if (doc.exists) {
        const currentBalance = doc.data().totalRealmkin || 0;
        const gatekeeperBalance = balance || 0;
        
        // Use the higher balance (safety measure)
        const finalBalance = Math.max(currentBalance, gatekeeperBalance);
        
        if (finalBalance !== currentBalance) {
          await docRef.update({
            totalRealmkin: finalBalance,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Updated ${user_id}: ${currentBalance} → ${finalBalance}`);
          migrated++;
        }
      } else {
        console.log(`⚠️  User ${user_id} not found in Firebase`);
      }
    } catch (error) {
      console.error(`❌ Error migrating ${row.user_id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n✅ Migration complete!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Errors: ${errors}`);
  
  await pool.end();
}

migrate().catch(console.error);
```

---

## Benefits of Unified Database

### ✅ Single Source of Truth
- No more sync issues
- Consistent balances everywhere
- Simpler architecture

### ✅ Atomic Transactions
- Transfers are atomic (all-or-nothing)
- No partial failures
- Better data integrity

### ✅ Real-time Updates
- Firebase real-time listeners
- Instant balance updates
- Better UX

### ✅ Simplified Code
- Remove all `/api/ledger` calls
- Remove `unifiedBalance` state
- Fewer API calls

### ✅ Better Error Handling
- Single point of failure
- Easier to debug
- Clearer error messages

### ✅ Cost Reduction
- One database instead of two
- Fewer API calls
- Simpler infrastructure

---

## Implementation Timeline

### Week 1: Preparation
- [ ] Set up Firebase Admin in Gatekeeper
- [ ] Write migration script
- [ ] Test Firebase queries in Gatekeeper

### Week 2: Migration
- [ ] Run data migration script
- [ ] Verify all balances match
- [ ] Update Gatekeeper bot code

### Week 3: Website Updates
- [ ] Remove `/api/ledger` calls
- [ ] Add `transferRealmkin` to rewardsService
- [ ] Update balance display logic
- [ ] Remove `unifiedBalance` state

### Week 4: Testing & Deployment
- [ ] Test transfers (website → Discord)
- [ ] Test transfers (Discord → website)
- [ ] Test balance consistency
- [ ] Deploy to production

---

## Rollback Plan

If issues arise:
1. Keep Gatekeeper DB running (read-only)
2. Re-enable `/api/ledger` sync calls
3. Compare Firebase vs Gatekeeper balances
4. Fix discrepancies
5. Retry migration

---

## Environment Variables

Update `.env`:

```bash
# Remove (no longer needed):
# NEXT_PUBLIC_GATEKEEPER_BASE=https://gatekeeper-cf2n.onrender.com

# Keep (for Discord OAuth only):
NEXT_PUBLIC_DISCORD_CLIENT_ID=1406117604543823872
DISCORD_CLIENT_SECRET=TVRqq8n5uhCJUCApVx927FeRyDn5ybSk
NEXT_PUBLIC_DISCORD_REDIRECT_URI=https://www.therealmkin.xyz/api/discord/callback
```

Add to Gatekeeper `.env`:
```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_PROJECT_ID=realmkin
```

---

## Testing Checklist

- [ ] User can see balance on website
- [ ] User can see same balance on Discord
- [ ] Transfer from website updates Discord balance
- [ ] Transfer from Discord updates website balance
- [ ] Withdrawals work correctly
- [ ] Claims work correctly
- [ ] Transaction history is accurate
- [ ] No sync errors in logs

---

## Conclusion

Making Firebase the unified database will:
- **Eliminate** balance inconsistencies
- **Simplify** the codebase
- **Improve** reliability
- **Reduce** maintenance burden

This is the right architectural decision for long-term stability.
