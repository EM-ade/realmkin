# Staking System Integration Guide

## Overview

Your off-chain staking system is now fully implemented with:
- ✅ Frontend staking UI (already exists at `/staking`)
- ✅ Backend API routes for all staking operations
- ✅ Firebase Firestore database integration
- ✅ On-chain transaction verification
- ✅ Daily reward calculation via Cloud Functions
- ✅ Real-time reward tracking

## Files Created

### Backend Services
- `src/services/transactionVerification.ts` - Verifies Solana transactions on-chain
- `src/services/firebaseStakingService.ts` - Firestore operations and reward calculations
- `functions/dailyRewardCalculation.js` - Scheduled reward calculation function

### API Routes
- `src/app/api/stake/route.ts` - Create new stakes
- `src/app/api/unstake/route.ts` - Initiate/complete unstaking
- `src/app/api/claim-rewards/route.ts` - Claim rewards
- `src/app/api/user-stakes/route.ts` - Fetch user staking data

### Frontend Utilities
- `src/utils/stakingTransactions.ts` - Transaction creation and API calls
- `src/utils/stakingHelpers.ts` - Formatting and calculation helpers
- `src/hooks/useStakingData.ts` - React hook for staking data
- `src/components/StakingStats.tsx` - Display component for stats

### Configuration
- `src/config/firebase.ts` - Firebase initialization
- `.env.local.example` - Environment variables template
- `STAKING_IMPLEMENTATION.md` - Quick reference guide

## Setup Instructions

### 1. Environment Variables

Copy the template and fill in your values:

```bash
cp .env.local.example .env.local
```

Required values:
```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_TOKEN_MINT=<your-MKIN-mint-address>
NEXT_PUBLIC_STAKING_WALLET_ADDRESS=<your-staking-wallet-public-key>
NEXT_PUBLIC_TOKEN_DECIMALS=6

# Firebase config (from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 2. Firebase Setup

1. Create a Firestore database in your Firebase project
2. Set security rules (see below)
3. Deploy Cloud Functions:

```bash
cd functions
npm install
firebase deploy --only functions
```

### 3. Firestore Security Rules

Add these rules to your Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - read-only for authenticated users
    match /users/{wallet} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    // Stakes collection - read-only for authenticated users
    match /stakes/{stakeId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    // Config - public read
    match /config/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

### 4. Test the System

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to `/staking`**

3. **Connect your wallet** (Phantom, Solflare, etc.)

4. **Test staking:**
   - Enter an amount
   - Select a lock period
   - Click "Stake $MKIN"
   - Sign the transaction
   - Verify it appears in your stakes

5. **Check rewards:**
   - Rewards calculate in real-time
   - Daily Cloud Function updates them
   - Manual trigger: `POST /api/manual-daily-reward-calculation`

## How It Works

### Staking Flow

```
User → Connects Wallet
    ↓
User → Enters Amount & Lock Period
    ↓
Frontend → Creates Transaction (send tokens to staking wallet)
    ↓
User → Signs Transaction with Wallet
    ↓
Frontend → Sends tx signature to POST /api/stake
    ↓
Backend → Verifies transaction on-chain
    ↓
Backend → Creates stake record in Firestore
    ↓
Frontend → Refreshes data and shows confirmation
```

### Reward Calculation

```
Daily Cloud Function (midnight UTC)
    ↓
Queries all active stakes
    ↓
For each stake:
  - Calculate: Amount × APY/365 × Days × Weight
  - Update Firestore with new rewards
  - Update user total rewards
    ↓
Complete
```

### Unstaking Flow

```
User → Clicks Unstake
    ↓
Frontend → Checks if lock period expired
    ↓
Frontend → Calls POST /api/unstake (action='initiate')
    ↓
Backend → Marks stake as "unstaking"
    ↓
Backend → (Admin) Sends withdrawal transaction
    ↓
Backend → Calls POST /api/unstake (action='complete') with tx signature
    ↓
Backend → Marks stake as "completed"
    ↓
User receives tokens in wallet
```

## Using the Staking Page

The existing `/staking` page already has all the UI. It uses:

- `useStaking()` context - Provides staking functions
- `useWeb3()` context - Provides wallet connection
- `StakingStats` component - Shows user statistics

To add the stats component to the page:

```tsx
import { StakingStats } from "@/components/StakingStats";

// In your page component:
<StakingStats />
```

## API Endpoints

### POST /api/stake
Create a new stake

```json
{
  "wallet": "user-wallet-address",
  "amount": 1000,
  "lockPeriod": "30",
  "txSignature": "transaction-signature"
}
```

### GET /api/stake?wallet=<address>
Get user's stakes

### POST /api/unstake
Initiate or complete unstaking

```json
{
  "wallet": "user-wallet-address",
  "stakeId": "stake-id",
  "action": "initiate" | "complete",
  "txSignature": "transaction-signature" // only for complete
}
```

### POST /api/claim-rewards
Claim rewards for a stake

```json
{
  "wallet": "user-wallet-address",
  "stakeId": "stake-id"
}
```

### GET /api/claim-rewards?wallet=<address>
Get pending rewards

### GET /api/user-stakes?wallet=<address>
Get complete user staking data

## Reward Rates

- **Flexible**: 5% APY, 1.0x weight
- **30-day lock**: 12% APY, 1.5x weight
- **90-day lock**: 25% APY, 2.0x weight

Weight multiplier increases rewards based on lock period commitment.

## Monitoring

### Check Cloud Function Logs

```bash
firebase functions:log
```

### Manual Trigger Daily Rewards

```bash
curl -X POST https://your-project.cloudfunctions.net/manualDailyRewardCalculation
```

### Monitor Firestore

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check `users`, `stakes`, and `config` collections

## Troubleshooting

### Transaction Verification Fails
- Verify `NEXT_PUBLIC_STAKING_WALLET_ADDRESS` is correct
- Check the transaction was confirmed on-chain
- Ensure tokens were sent to the staking wallet

### Rewards Not Updating
- Check Cloud Function logs
- Verify stakes exist and are active
- Manually trigger: `POST /api/manual-daily-reward-calculation`

### Wallet Connection Issues
- Ensure Phantom/Solflare is installed
- Check RPC URL is accessible
- Verify wallet is on correct network

## Next Steps

1. **Test thoroughly** on devnet first
2. **Set up monitoring** for Cloud Functions
3. **Configure rate limits** on API routes
4. **Add email notifications** for reward claims
5. **Create admin dashboard** for monitoring
6. **Plan smart contract migration** for future

## Security Checklist

- [ ] Environment variables set correctly
- [ ] Firebase security rules deployed
- [ ] Staking wallet address verified
- [ ] Token mint address verified
- [ ] RPC endpoint is reliable
- [ ] Cloud Functions have error handling
- [ ] API routes validate all inputs
- [ ] Transaction verification working
- [ ] Firestore backups enabled
- [ ] Rate limiting configured

## Support

For issues or questions:
1. Check the logs: `firebase functions:log`
2. Review Firestore data in Firebase Console
3. Test API endpoints directly with curl
4. Check browser console for frontend errors
