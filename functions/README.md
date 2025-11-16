# Firebase Functions - Realmkin Backend Services

This directory contains Firebase Functions for the Realmkin application, now organized into dedicated service modules.

## Setup Instructions

1. **Install Firebase CLI** (if not already installed):
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Initialize Firebase Functions** (if not already initialized):
```bash
cd functions
npm install
```

4. **Deploy Functions**:
```bash
firebase deploy --only functions
```

## Service Structure

Functions are now organized into dedicated service modules in the `src/services` directory:

### Claiming Service
Handles all token claiming operations including withdrawals of MKIN tokens to user wallets.

### Staking Service
Handles all NFT staking operations for earning rewards.

## Available Functions

- **claimTokens** (`processClaim`): Process token claims (withdrawals) to user wallets
- **getClaimHistory**: Retrieve claim history for a user
- **processStake**: Stake NFTs to earn rewards
- **processUnstake**: Unstake NFTs
- **getStakingHistory**: Retrieve staking history for a user
- **recomputeStats**: Recompute statistics
- **migrateStakes**: Migration function for stakes
- **scheduledAutoClaim**: Runs automatically every day at 2:00 AM UTC (legacy)

## Configuration

The functions use environment variables from your Firebase project. Make sure your Firebase project has the proper Firestore database structure with:
- `users` collection
- `claims` collection
- `stakes` collection
- `nfts` collection

## Testing

You can test the functions locally using the Firebase emulator:
```bash
firebase emulators:start --only functions
```

## Migration

The new service structure replaces the previous monolithic function files with dedicated service modules for better organization and maintainability.