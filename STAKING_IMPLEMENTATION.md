# Off-Chain Staking System Implementation

## Quick Start

### 1. Environment Setup

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_SOLANA_RPC_URL` - Solana RPC endpoint
- `NEXT_PUBLIC_TOKEN_MINT` - Your MKIN token mint address
- `NEXT_PUBLIC_STAKING_WALLET_ADDRESS` - Public key of the staking wallet
- `NEXT_PUBLIC_TOKEN_DECIMALS` - Token decimals (usually 6)

### 2. Firebase Setup

Ensure your Firebase project has Firestore enabled. The system will create collections automatically:

- `users` - User staking data
- `stakes` - Individual stake records
- `reward_rules` - APY configuration (optional)
- `config/staking_wallet` - Staking wallet metadata

### 3. Deploy Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

This deploys:
- `dailyRewardCalculation` - Runs daily at midnight UTC
- `manualDailyRewardCalculation` - Manual trigger endpoint
- `scheduledAutoClaimFrequent` - Auto-claim every 6 hours
- `scheduledAutoClaimDaily` - Daily auto-claim

## Architecture

### Frontend Flow

1. **User connects wallet** → StakingContext initializes
2. **User stakes tokens**:
   - Frontend creates transaction to send tokens to staking wallet
   - User signs transaction with wallet
   - Transaction signature is sent to `/api/stake`
   - Backend verifies transaction on-chain
   - Stake record created in Firestore
3. **User views rewards**:
   - Frontend fetches from `/api/user-stakes`
   - Pending rewards calculated client-side
4. **User claims rewards**:
   - Frontend calls `/api/claim-rewards`
   - Backend updates Firestore
5. **User unstakes**:
   - Frontend calls `/api/unstake` with action='initiate'
   - Backend checks lock period
   - Backend initiates withdrawal (requires backend control of staking wallet)

### Backend Flow

1. **Transaction Verification** (`transactionVerification.ts`):
   - Verifies Solana transaction signature
   - Confirms tokens sent to staking wallet
   - Extracts sender and amount

2. **Firebase Staking Service** (`firebaseStakingService.ts`):
   - Manages Firestore operations
   - Calculates rewards based on APY and lock period
   - Tracks stake status

3. **API Routes**:
   - `/api/stake` - Create new stake
   - `/api/unstake` - Initiate/complete unstaking
   - `/api/claim-rewards` - Claim rewards
   - `/api/user-stakes` - Fetch user data

4. **Daily Reward Calculation** (`dailyRewardCalculation.js`):
   - Runs at midnight UTC
   - Calculates pending rewards for all active stakes
   - Updates Firestore with new rewards

## Reward Calculation

Rewards are calculated using:

```
Daily Rate = APY / 365 / 100
Weight = 1.0 (flexible) to 2.0 (90-day lock)
Pending Rewards = Amount × Daily Rate × Days Staked × Weight
```

APY Rates:
- Flexible: 5%
- 30-day lock: 12%
- 90-day lock: 25%

## Security Considerations

1. **Transaction Verification**: All deposits verified on-chain before recording
2. **Lock Periods**: Unstaking blocked until lock period expires
3. **Wallet Control**: Staking wallet must be controlled by backend for withdrawals
4. **Rate Limiting**: Consider adding rate limits to API routes
5. **Input Validation**: All inputs validated on backend

## Testing

### Manual Testing Endpoints

1. **Trigger Daily Rewards** (development only):
   ```
   POST https://your-project.cloudfunctions.net/manualDailyRewardCalculation
   ```

2. **Fetch User Stakes**:
   ```
   GET /api/user-stakes?wallet=<wallet-address>
   ```

3. **Create Stake**:
   ```
   POST /api/stake
   {
     "wallet": "user-wallet",
     "amount": 1000,
     "lockPeriod": "30",
     "txSignature": "transaction-signature"
   }
   ```

## Firestore Security Rules

Recommended rules for production:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{wallet} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend writes
    }
    
    // Stakes are read-only for users
    match /stakes/{stakeId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend writes
    }
    
    // Config is read-only
    match /config/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## Troubleshooting

### Transaction Verification Fails
- Ensure `NEXT_PUBLIC_STAKING_WALLET_ADDRESS` is correct
- Check transaction signature is valid
- Verify tokens sent to correct wallet

### Rewards Not Updating
- Check Cloud Function logs: `firebase functions:log`
- Verify Firestore has active stakes
- Ensure timestamps are correct

### Wallet Connection Issues
- Verify Phantom/Solflare wallet is installed
- Check RPC URL is accessible
- Ensure wallet is on correct network

## Future Enhancements

1. **Smart Contract Migration**: Easy upgrade path to on-chain staking
2. **Multi-Token Support**: Support staking multiple tokens
3. **Governance**: DAO voting on APY rates
4. **Referral System**: Bonus rewards for referrals
5. **Leaderboards**: Top stakers display
