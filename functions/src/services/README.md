# Dedicated Backend Services

This directory contains dedicated backend services for the Realmkin application, organized by functionality.

## Services

### Claiming Service (`claimingService.ts`)

Handles all token claiming operations including:
- Processing claims (withdrawals) of MKIN tokens to user wallets
- Transferring tokens on the Solana blockchain
- Maintaining claim history
- Error handling and balance validation

**Functions:**
- `processClaim` - Main function for processing token claims
- `getClaimHistory` - Retrieve claim history for a user

### Staking Service (`stakingService.ts`)

Handles all NFT staking operations including:
- Staking NFTs to earn rewards
- Unstaking NFTs
- Maintaining staking history
- Validation and error handling

**Functions:**
- `processStake` - Main function for staking NFTs
- `processUnstake` - Main function for unstaking NFTs
- `getStakingHistory` - Retrieve staking history for a user

## Migration

This new structure replaces the previous monolithic function files with dedicated service modules for better organization and maintainability.

## Usage

All services are exported through the main `index.ts` file and can be accessed as Firebase Callable Functions.