# Token Claim Function - Implementation Plan

## Overview
Users can claim MKIN tokens they've earned (mined/staked/played) and transfer them to their actual Solana wallet. The site balance will then reflect their real on-chain wallet balance instead of the database balance.

---

## Architecture

### Current Flow
```
User earns MKIN → Stored in Firebase/DB → Display on site
```

### New Flow
```
User earns MKIN → Stored in DB → User claims → Transfer to Solana wallet → Wallet balance reflects real MKIN
```

---

## Components Needed

### 1. Backend (Gatekeeper)
**New Endpoint**: `POST /api/claim/tokens`
- **Auth**: Firebase ID token required
- **Body**: 
  ```json
  {
    "amount": 1000,
    "walletAddress": "user_solana_wallet",
    "claimType": "earned" // earned, staked, played
  }
  ```
- **Logic**:
  1. Verify user has sufficient balance in DB
  2. Verify wallet address is valid Solana address
  3. Create Solana transaction to transfer MKIN tokens
  4. Deduct from user's DB balance
  5. Record claim in `claims` table
  6. Return transaction hash

**New Database Table**: `claims`
```sql
CREATE TABLE claims (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount BIGINT,
  wallet_address VARCHAR(255),
  transaction_hash VARCHAR(255),
  status VARCHAR(50), -- pending, completed, failed
  claim_type VARCHAR(50), -- earned, staked, played
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

**New Endpoint**: `GET /api/claim/history`
- **Auth**: Firebase ID token required
- **Returns**: List of user's claims with status

---

### 2. Frontend Components

**`src/components/ClaimTokensModal.tsx`**
- Shows claimable balance
- Input for amount to claim
- Confirm button
- Shows transaction status

**`src/components/ClaimHistory.tsx`**
- Table of past claims
- Status badges (pending, completed, failed)
- Transaction hash links

**`src/hooks/useTokenClaim.ts`**
- Hook for claiming tokens
- Handles loading states
- Error handling
- Toast notifications

---

## Implementation Steps

### Phase 1: Backend Setup (Gatekeeper)

#### Step 1: Create Claims Table
```sql
-- In gatekeeper database
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  transaction_hash VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  claim_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_status ON claims(status);
```

#### Step 2: Create Claim Endpoint
**File**: `gatekeeper/routes/claims.js` (new)
```javascript
// POST /api/claim/tokens
// 1. Verify Firebase token
// 2. Get user's linked wallet
// 3. Check DB balance >= amount
// 4. Create Solana transaction
// 5. Deduct from DB balance
// 6. Record claim
// 7. Return tx hash
```

**Logic**:
- Use `@solana/web3.js` to create SPL token transfer
- Use Gatekeeper's Solana wallet as source
- Transfer MKIN tokens to user's wallet
- Update `user_balances` table (deduct amount)
- Insert into `claims` table

#### Step 3: Create History Endpoint
**File**: `gatekeeper/routes/claims.js`
```javascript
// GET /api/claim/history
// Return user's claims with pagination
```

---

### Phase 2: Frontend Implementation

#### Step 1: Create Claim Hook
**File**: `src/hooks/useTokenClaim.ts`
```typescript
export function useTokenClaim() {
  const [loading, setLoading] = useState(false);
  const [claimHistory, setClaimHistory] = useState([]);

  const claimTokens = async (amount: number, walletAddress: string) => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${gatekeeperBase}/api/claim/tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          walletAddress,
          claimType: 'earned'
        })
      });
      
      if (!response.ok) throw new Error('Claim failed');
      
      const data = await response.json();
      notifySuccess(`Claimed ${amount} MKIN! TX: ${data.txHash}`);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const fetchClaimHistory = async () => {
    // Fetch from /api/claim/history
  };

  return { claimTokens, claimHistory, loading, fetchClaimHistory };
}
```

#### Step 2: Create Claim Modal
**File**: `src/components/ClaimTokensModal.tsx`
- Show available balance
- Input field for claim amount
- Wallet address display
- Claim button
- Loading state
- Success/error messages

#### Step 3: Create Claim History Component
**File**: `src/components/ClaimHistory.tsx`
- Table of claims
- Status badges
- Timestamps
- Transaction links

#### Step 4: Integrate into Wallet Page
Add to `src/app/wallet/page.tsx`:
- "Claim Tokens" button
- Claim history section
- Real wallet balance display

---

## Data Flow

### Claiming Tokens
```
User clicks "Claim" button
    ↓
Modal opens with available balance
    ↓
User enters amount and confirms
    ↓
Frontend sends POST /api/claim/tokens
    ↓
Backend verifies balance
    ↓
Backend creates Solana transaction
    ↓
MKIN tokens transferred to user's wallet
    ↓
DB balance updated (deducted)
    ↓
Claim recorded in claims table
    ↓
Frontend shows success with TX hash
    ↓
User can view claim in history
```

---

## Security Considerations

1. **Balance Verification**: Always verify DB balance before creating transaction
2. **Rate Limiting**: Limit claims per user per day
3. **Minimum Claim**: Set minimum claim amount (e.g., 100 MKIN)
4. **Transaction Verification**: Verify transaction on-chain before updating DB
5. **Audit Trail**: Log all claims for auditing

---

## Solana Integration

### Required Setup
1. Create MKIN token on Solana (if not already done)
2. Create token account for Gatekeeper wallet
3. Fund Gatekeeper wallet with MKIN tokens
4. Store token mint address in env vars

### Code Example
```javascript
// In Gatekeeper
const { Connection, PublicKey, Transaction, TransferChecked } = require('@solana/web3.js');

const connection = new Connection(process.env.SOLANA_RPC_URL);
const tokenMint = new PublicKey(process.env.MKIN_TOKEN_MINT);
const gatekeeper = Keypair.fromSecretKey(Buffer.from(process.env.GATEKEEPER_KEYPAIR));

async function transferMKIN(toWallet, amount) {
  const toTokenAccount = await getAssociatedTokenAddress(tokenMint, new PublicKey(toWallet));
  
  const transaction = new Transaction().add(
    createTransferCheckedInstruction(
      gatekeeper.publicKey,
      tokenMint,
      toTokenAccount,
      gatekeeper.publicKey,
      amount * 10**6, // Assuming 6 decimals
      6
    )
  );
  
  const txHash = await sendAndConfirmTransaction(connection, transaction, [gatekeeper]);
  return txHash;
}
```

---

## Testing Checklist

### Backend
- [ ] Claims table created
- [ ] POST /api/claim/tokens works
- [ ] Balance verification works
- [ ] Solana transaction created successfully
- [ ] DB balance updated correctly
- [ ] Claim recorded in table
- [ ] GET /api/claim/history returns correct data
- [ ] Error handling for insufficient balance
- [ ] Error handling for invalid wallet

### Frontend
- [ ] Claim modal displays correctly
- [ ] Amount input validation
- [ ] Claim button triggers API call
- [ ] Loading state shows during claim
- [ ] Success message with TX hash
- [ ] Error messages display
- [ ] Claim history loads
- [ ] Real wallet balance updates after claim

---

## Deployment Checklist

### Pre-Deployment
- [ ] MKIN token created on Solana
- [ ] Gatekeeper wallet funded with MKIN
- [ ] Token mint address in env vars
- [ ] Claims table migrated
- [ ] Endpoints tested in staging

### Environment Variables
```
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MKIN_TOKEN_MINT=<token_mint_address>
GATEKEEPER_KEYPAIR=<base64_encoded_keypair>
MIN_CLAIM_AMOUNT=100
MAX_CLAIMS_PER_DAY=5
```

### Post-Deployment
- [ ] Monitor claim transactions
- [ ] Check for failed claims
- [ ] Verify balances update correctly
- [ ] Monitor Solana network fees

---

## Future Enhancements

1. **Batch Claims**: Allow claiming multiple types at once
2. **Scheduled Claims**: Auto-claim at certain thresholds
3. **Claim Rewards**: Earn bonus MKIN for claiming
4. **Staking Rewards**: Earn interest on claimed tokens
5. **Claim History Export**: Download claim history as CSV
6. **Multi-Wallet Support**: Claim to different wallets

---

## Estimated Timeline

- **Backend Setup**: 2-3 days
- **Solana Integration**: 2-3 days
- **Frontend Components**: 2-3 days
- **Testing**: 2-3 days
- **Deployment**: 1 day

**Total**: ~2 weeks

---

## Questions to Answer Before Starting

1. What's the MKIN token mint address?
2. How much MKIN does Gatekeeper wallet have?
3. What's the minimum claim amount?
4. Should there be daily/weekly claim limits?
5. What are the Solana network fees?
6. Should we use devnet or mainnet?

---

**Status**: Plan Ready for Implementation
**Last Updated**: 2025-11-15
