# One-Time Token Distribution Guide

## Overview

This guide covers the deployment and testing of the one-time token distribution Firebase Cloud Function that will credit 10,000 MKIN tokens to all users holding at least one MKIN NFT.

## Function Components

### 1. Main Functions

- **`oneTimeTokenDistribution`**: Scheduled function that runs at 5:00 UTC (6:00 AM Nigeria time) on the specified date
- **`manualOneTimeTokenDistribution`**: HTTP endpoint for manual testing and execution
- **`testOneTimeDistribution`**: Comprehensive testing function to validate all components

### 2. Key Features

- ✅ **NFT Ownership Verification**: Uses Helius API to verify MKIN NFT ownership
- ✅ **Dry Run Mode**: Configurable preview mode without database changes
- ✅ **Transaction Integrity**: Firestore batch operations for atomic updates
- ✅ **Duplicate Prevention**: Tracks completed distributions to prevent duplicates
- ✅ **Audit Trail**: Complete logging in `transactionHistory` and `oneTimeDistribution` collections
- ✅ **Error Handling**: Comprehensive error handling with rollback mechanisms
- ✅ **Batch Processing**: Efficient processing of large user sets

## Environment Variables

Set these environment variables in Firebase Functions:

```bash
# Required for NFT verification
HELIUS_API_KEY=your_helius_api_key_here

# Dry run mode (set to 'false' for production)
DRY_RUN_MODE=true

# Optional: Override distribution amount (default: 10000)
# DISTRIBUTION_AMOUNT=10000
```

## Deployment Steps

### 1. Build Functions

```bash
cd realmkin/functions
npm run build
```

### 2. Test in Dry Run Mode

```bash
# Set dry run mode
firebase functions:config:set DRY_RUN_MODE=true

# Deploy test functions
firebase deploy --only functions:testOneTimeDistribution,functions:manualOneTimeTokenDistribution

# Run comprehensive tests
curl -X POST https://your-region-your-project.cloudfunctions.net/testOneTimeDistribution \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3. Test Manual Distribution (Dry Run)

```bash
curl -X POST https://your-region-your-project.cloudfunctions.net/manualOneTimeTokenDistribution \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

### 4. Review Dry Run Results

Check the Firebase Functions logs for detailed output:

```bash
firebase functions:log
```

Look for:
- 📋 Contract configurations loaded
- 👥 Users fetched
- 🔍 NFT verification results
- ✅ Eligible users identified
- 📊 Final summary

### 5. Execute Production Distribution

⚠️ **IMPORTANT**: Only proceed after successful dry run testing

```bash
# Set production mode
firebase functions:config:set DRY_RUN_MODE=false

# Deploy all functions
firebase deploy --only functions:oneTimeTokenDistribution,functions:manualOneTimeTokenDistribution

# Or execute manually if needed
curl -X POST https://your-region-your-project.cloudfunctions.net/manualOneTimeTokenDistribution \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

## Monitoring and Verification

### 1. Real-time Monitoring

```bash
# Monitor function execution
firebase functions:log --only oneTimeTokenDistribution

# Check specific execution
firebase functions:log --start "2025-01-05T05:00:00Z" --end "2025-01-05T06:00:00Z"
```

### 2. Database Verification

Check the following collections in Firestore:

#### `oneTimeDistribution` Collection
```javascript
// Query completed distributions
db.collection('oneTimeDistribution')
  .where('distributionId', '==', 'one_time_mkin_distribution_2025_01_05')
  .where('status', '==', 'completed')
  .get()
```

#### `transactionHistory` Collection
```javascript
// Query distribution transactions
db.collection('transactionHistory')
  .where('type', '==', 'distribution')
  .where('description', '==', 'One-time MKIN distribution (one_time_mkin_distribution_2025_01_05)')
  .get()
```

#### `userRewards` Collection
```javascript
// Verify balance updates
db.collection('userRewards')
  .where('totalRealmkin', '>', 10000) // Users who received distribution
  .get()
```

### 3. Success Metrics

Expected results:
- **Total Users**: All users with wallet addresses
- **Eligible Users**: Users with at least one MKIN NFT
- **Successful Distributions**: Should equal eligible users
- **Total MKIN Distributed**: Eligible users × 10,000

## Troubleshooting

### Common Issues

#### 1. Helius API Rate Limiting
**Symptoms**: `429 Too Many Requests` errors
**Solution**: 
- Check API key quotas
- Function includes automatic retry with exponential backoff
- Consider processing in smaller batches

#### 2. Memory/Timeout Issues
**Symptoms**: Function timeouts during large user processing
**Solution**:
- Function processes users in batches of 500
- Includes delays between batches
- Monitor execution time in logs

#### 3. Firestore Batch Limits
**Symptoms**: `Too many writes in batch` errors
**Solution**:
- Batch size limited to 500 operations
- Function automatically splits large user sets
- Each user update uses 3 operations (balance + transaction + distribution record)

#### 4. Duplicate Prevention Issues
**Symptoms**: Users receiving distribution multiple times
**Solution**:
- Check `oneTimeDistribution` collection for existing records
- Verify `distributionId` matches exactly
- Ensure proper indexing on `distributionId` and `userId` fields

### Log Analysis

#### Success Indicators
```
🚀 Starting one-time token distribution...
📋 Step 1: Loading active contract configurations...
   Found X active contracts
👥 Step 2: Fetching all users with wallet addresses...
   Found Y users with wallet addresses
💰 Step 3: Processing users for token distribution...
✅ One-time token distribution completed successfully!
```

#### Error Indicators
```
❌ Error in one-time token distribution: [error details]
❌ Failed to process user [userId]: [error details]
```

## Security Considerations

### 1. Environment Variables
- Store `HELIUS_API_KEY` securely in Firebase Functions config
- Never commit API keys to version control
- Use read-only API keys where possible

### 2. Access Control
- Functions are secured by Firebase authentication
- Manual trigger requires HTTP request (consider adding auth)
- No sensitive data in function responses

### 3. Data Integrity
- All database operations use Firestore transactions
- Atomic updates prevent partial distributions
- Comprehensive audit trail for all operations

## Post-Execution Tasks

### 1. Verify Completion
```bash
# Check final status
firebase functions:log --only oneTimeTokenDistribution

# Verify distribution count
firebase firestore:count oneTimeDistribution --where 'distributionId==one_time_mkin_distribution_2025_01_05'
```

### 2. Disable Scheduled Function
After successful execution, consider disabling the scheduled function to prevent accidental re-runs:

```javascript
// In oneTimeTokenDistribution.ts, add at the beginning:
export const oneTimeTokenDistribution = functions.scheduler.onSchedule({
  schedule: "0 5 5 1 *", // January 5th only (or comment out entirely)
  timeZone: "UTC"
}, async (context) => {
  // Add early return to prevent execution
  return;
});
```

### 3. Backup Results
Export distribution records for archival:

```bash
# Use Firebase Console or Firestore export
# Export oneTimeDistribution collection
# Export transactionHistory for distribution records
```

## Emergency Procedures

### If Function Fails Mid-Execution

1. **Check Logs**: Identify failure point
2. **Verify Partial State**: Check `oneTimeDistribution` collection for partial completions
3. **Manual Recovery**: Use `manualOneTimeTokenDistribution` for remaining users
4. **Rollback if Needed**: Manual balance corrections via admin interface

### Contact Information

For issues with this distribution:
- Check Firebase Functions logs first
- Review this troubleshooting guide
- Contact development team with specific error messages and timestamps

---

**⚠️ IMPORTANT**: Always test thoroughly in dry run mode before executing production distribution. The function modifies user balances and should only be executed after complete verification.