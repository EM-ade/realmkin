# Migration Guide: Connecting to New Backend Service

This guide explains how to connect the Realmkin frontend to the new dedicated backend service for claiming and staking operations.

## Current Status

✅ **Claiming functionality** has been migrated to use the new backend service
❌ **Staking functionality** still uses the existing Firebase-based implementation

## Changes Made

### 1. Environment Configuration

Added the new backend service URL to the `.env` file:
```
NEXT_PUBLIC_BACKEND_SERVICE_URL=http://localhost:3001
```

### 2. New Backend Services

Created new service files that communicate with the dedicated backend service:

- `src/services/backendClaimService.ts` - Handles token claiming and history
- `src/services/backendStakingService.ts` - Handles NFT staking operations (not yet integrated)

### 3. Updated Wallet Page

The wallet page now uses the new backend service for claiming tokens:
- Updated import from `@/services/claimService` to `@/services/backendClaimService`
- The `handleWithdraw` function automatically uses the new backend service

## How It Works

The new backend service is accessed via REST API calls with Firebase authentication tokens:

1. Frontend gets Firebase auth token
2. Makes authenticated requests to backend service
3. Backend service validates token and processes requests
4. Results are returned to frontend

## Testing the Connection

1. Start the new backend service:
   ```bash
   cd realmkin-backend-service
   npm start
   ```

2. Verify the service is running:
   ```bash
   curl http://localhost:3001/health
   ```

3. Use the wallet page to test claiming functionality

## Next Steps for Full Migration

To complete the migration of staking functionality:

1. Update the StakingContext to use `backendStakingService.ts`
2. Replace Firebase-based staking calls with REST API calls to the backend service
3. Update error handling and response formats to match the new backend

## API Endpoints

### Claiming Service
- `POST /api/claiming/claim` - Process token claims
- `GET /api/claiming/history/:userId` - Get claim history

### Staking Service
- `POST /api/staking/stake` - Stake an NFT
- `POST /api/staking/unstake` - Unstake an NFT
- `GET /api/staking/history/:userId` - Get staking history

## Authentication

All endpoints require a Firebase authentication token in the Authorization header:
```
Authorization: Bearer <firebase_token>
```

## Error Handling

The new services return standardized error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Deployment

For production deployment:
1. Update `NEXT_PUBLIC_BACKEND_SERVICE_URL` to point to the production backend
2. Ensure the backend service is deployed and accessible
3. Configure proper CORS and security settings