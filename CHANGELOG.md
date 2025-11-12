# Changelog

## [2025-11-12] - Staking System & Security Improvements

### Added
- **Firebase Admin SDK Integration for API Routes**
  - `/api/stake` - Create stake records using Admin SDK (bypasses Firestore security rules)
  - `/api/unstake` - Initiate and complete unstake requests with Admin SDK
  - Eliminates client-side Firestore permission errors (`permission-denied @ L17, L38, L151`)

- **Firestore Security Rules Enhancements**
  - Updated `staking_records/{docId}` rules to allow authenticated user creation
  - Added admin read access for staking records
  - Maintained write restrictions to backend/Admin SDK only

- **Solana Transaction Support**
  - Unstake route creates dual transfers: principal + rewards
  - Treasury wallet keypair validation against configured public key
  - Transaction confirmation before Firestore state update
  - Early balance check to prevent failed transactions

### Changed
- **Stake API (`/api/stake`)**
  - Migrated from client SDK (`firebaseStakingService`) to Admin SDK
  - Direct writes to `users/{uid}/stakes/{stakeId}` and `users/{wallet}` collections
  - Server-side timestamp generation via `Timestamp.now()`
  - Batch writes for atomic operations

- **Unstake API (`/api/unstake`)**
  - Refactored to use Admin SDK exclusively
  - Removed client-side Firestore reads (was causing permission-denied errors)
  - Inline reward calculation (`calcPendingRewards`) to avoid service layer dependencies
  - Updated user totals via Admin SDK after successful transaction

- **TypeScript Types**
  - Added `StakeData` interface in `/api/unstake/route.ts` for type safety
  - Replaced `any` types with proper interfaces in `/api/create-user/route.ts`
  - Typed request bodies with explicit interfaces

### Fixed
- **Build Errors**
  - Fixed 4 ESLint errors related to `any` types
  - Typed `request.json()` responses in API routes
  - Resolved undefined property access on stake objects

- **Security Issues**
  - Removed sensitive console logs exposing RPC endpoints and API keys
  - Removed treasury wallet address from error responses
  - Removed treasury balance logs from production output
  - Updated `.gitignore` to exclude Firebase logs and service account keys

- **Firestore Rules Denials**
  - Resolved `false for 'get' @ L17` (users collection read)
  - Resolved `false for 'list' @ L38` (stakes subcollection query)
  - Resolved `false for 'get' @ L151` (default deny rule)
  - Root cause: Client SDK reads on server without proper auth context

### Security & Best Practices
- Admin SDK now handles all sensitive operations (stake creation, unstaking, user updates)
- Client-side Firestore reads eliminated from staking flow
- Environment variables properly typed and validated
- Error messages sanitized to prevent information leakage
- Sensitive files added to `.gitignore`:
  - `firebase-debug.log`, `firestore-debug.log`, `pubsub-debug.log`
  - `*-service-account.json`, `firebase-key.json`
  - `emulator-data/`, `.firebase/`

### Testing
- Staking flow tested end-to-end with local Firebase emulator
- Unstake tested with Solana devnet transactions
- Verified dual transfer instructions (principal + rewards) on-chain
- Multi-user testing with separate wallet addresses

### Notes
- Cold start latency is primarily from Solana RPC confirmation (~1-3s), not from Next.js API routes
- Cloud Functions migration recommended for production (auto-scaling, pay-per-invocation)
- Emulator flags (`FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`) should be removed for production deployment
- Production requires real Firebase credentials and Solana mainnet RPC endpoint
