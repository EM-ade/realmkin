# Firebase Functions - Auto Claim Rewards

This directory contains Firebase Functions for automatic reward claiming.

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

## Available Functions

- **scheduledAutoClaim**: Runs automatically every day at 2:00 AM UTC
- **manualAutoClaim**: HTTP endpoint for manual triggering (optional)
- **autoClaimRewards**: Core function for testing

## Configuration

The function uses environment variables from your Firebase project. Make sure your Firebase project has the proper Firestore database structure with:
- `userRewards` collection
- `claimRecords` collection

## Testing

You can test the function locally using the Firebase emulator:
```bash
firebase emulators:start --only functions
```

Or trigger the manual endpoint manually:
```bash
curl -X POST https://your-project-region-your-project-id.cloudfunctions.net/manualAutoClaim
```

## Scheduling

The function is scheduled to run daily at 2:00 AM UTC. You can modify the schedule in `functions/index.js` by changing the cron expression:

```javascript
exports.scheduledAutoClaim = functions.pubsub.schedule('0 2 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    // Your function code
  });
