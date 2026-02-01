# Account Page Testing Guide

This directory contains comprehensive test scripts for the Account page implementation.

## Test Scripts

### 1. **test-account-page.ts**
Main test suite covering all Account page features.

**Tests:**
- Username system and mapping
- Transaction history logging
- Revenue distribution eligibility
- Token account checking
- Mining rate calculation
- Leaderboard data

**Usage:**
```bash
# Set environment variables
export TEST_USER_ID="your-user-id"
export TEST_WALLET="your-wallet-address"

# Run tests
npx ts-node scripts/test-account-page.ts
```

### 2. **test-profile-edit.ts**
Tests profile editing functionality.

**Tests:**
- Username validation rules
- Username availability checking
- Username immutability
- Avatar URL updates
- Profile data integrity

**Usage:**
```bash
export TEST_USER_ID="your-user-id"
npx ts-node scripts/test-profile-edit.ts
```

### 3. **test-revenue-claim.ts**
Tests revenue distribution claim process.

**Tests:**
- Eligibility checking
- Token account status
- Fee calculation
- Claim history
- Treasury balance verification
- Claim process flow (dry run)

**Usage:**
```bash
export TEST_USER_ID="your-user-id"
export TEST_WALLET="your-wallet-address"
npx ts-node scripts/test-revenue-claim.ts
```

### 4. **test-transaction-logging.ts**
Tests transaction history logging system.

**Tests:**
- Transaction structure validation
- Transaction type coverage
- Error handling
- Timestamp accuracy
- Metadata storage
- Search functionality
- Transaction statistics

**Usage:**
```bash
export TEST_USER_ID="your-user-id"
npx ts-node scripts/test-transaction-logging.ts
```

## Environment Variables

Required environment variables for testing:

```bash
# Firebase Admin SDK
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_CLIENT_EMAIL="your-service-account-email"
export FIREBASE_PRIVATE_KEY="your-private-key"

# Test Configuration
export TEST_USER_ID="user-id-to-test"
export TEST_WALLET="wallet-address-to-test"

# Blockchain
export HELIUS_MAINNET_RPC_URL="your-helius-rpc-url"
export STAKING_WALLET_ADDRESS="treasury-wallet-address"

# Backend
export GATEKEEPER_BASE="https://gatekeeper-bmvu.onrender.com"
```

## Running All Tests

Create a test script:

```bash
#!/bin/bash
# run-all-tests.sh

echo "Running Account Page Test Suite..."
echo "=================================="

npx ts-node scripts/test-account-page.ts
npx ts-node scripts/test-profile-edit.ts
npx ts-node scripts/test-revenue-claim.ts
npx ts-node scripts/test-transaction-logging.ts

echo "=================================="
echo "All tests completed!"
```

Make it executable and run:
```bash
chmod +x run-all-tests.sh
./run-all-tests.sh
```

## Test Coverage

✅ Username system (validation, immutability, mapping)
✅ Transaction history (all 7 types)
✅ Revenue distribution (eligibility, multi-token)
✅ Token account creation
✅ Fee calculation (base + account creation)
✅ Profile editing (username, avatar)
✅ Error handling (user-friendly messages)
✅ Leaderboard (mining rate ranking)
✅ Search functionality
✅ Statistics and analytics

## Expected Output

Each test script provides detailed output showing:
- ✅ Passing tests
- ❌ Failing tests
- ⏭️ Skipped tests (when conditions not met)
- ℹ️ Informational messages
- Test duration and summary statistics

## Troubleshooting

**"Test user does not exist"**
- Create a test user in Firebase Auth
- Ensure TEST_USER_ID matches the user's UID

**"No transactions found"**
- Perform some transactions first
- Check if transaction logging is enabled

**"No test wallet provided"**
- Set TEST_WALLET environment variable
- Use a real Solana wallet address

**"Connection timeout"**
- Check RPC URL is correct
- Verify network connectivity
- Try a different RPC endpoint

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Account Page Tests
  env:
    FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
    FIREBASE_CLIENT_EMAIL: ${{ secrets.FIREBASE_CLIENT_EMAIL }}
    FIREBASE_PRIVATE_KEY: ${{ secrets.FIREBASE_PRIVATE_KEY }}
    TEST_USER_ID: ${{ secrets.TEST_USER_ID }}
    TEST_WALLET: ${{ secrets.TEST_WALLET }}
  run: |
    npm install
    npx ts-node scripts/test-account-page.ts
```
