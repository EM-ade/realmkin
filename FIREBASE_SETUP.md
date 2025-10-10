# Firebase Setup Guide for Realmkin Leaderboard

## Overview

Your app uses **hybrid authentication**:
- **Firebase Auth** (email/password) for user accounts
- **Solana Wallet** connection for Web3 features
- **Firestore** for leaderboard data storage

## Prerequisites

1. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project** already exists (you have one)

3. **Authentication** with Firebase:
   ```bash
   firebase login
   ```

## Step 1: Initialize Firebase in Your Project

Navigate to your project directory and ensure Firebase is properly initialized:

```bash
cd c:\Users\ElderHorror\Documents\gig\realmkin\my-realmkin-app
firebase init
```

**Select these services:**
- ✅ Firestore: Configure security rules and indexes files
- ✅ Functions: Configure a Cloud Functions directory (if not already done)
- ❌ Hosting (skip if not needed)
- ❌ Storage (skip for now)

## Step 2: Deploy Firestore Security Rules

Your `firestore.rules` file is already configured with leaderboard rules. Deploy it:

```bash
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project-id/overview
```

## Step 3: Deploy Firestore Indexes

Your `firestore.indexes.json` file contains the required indexes for leaderboard queries:

```bash
firebase deploy --only firestore:indexes
```

**Expected output:**
```
✔ Deploy complete!
```

**Note:** Index creation can take several minutes. Monitor progress in the Firebase Console.

## Step 4: Verify Firestore Database Structure

After deployment, your Firestore database will have these collections:

```
📁 leaderboards/
  📁 current/
    📁 metadata/
      📄 info: { monthId, startDate, endDate, lastReset }
    📁 totalScore/
      📄 {userId}: { userId, username, totalScore, gamesPlayed, breakdown, lastUpdated }
    📁 streak/
      📄 {userId}: { userId, username, currentStreak, lastPlayed, longestStreak }

📁 monthlyArchive/
  📄 {monthId}: { topScores[], topStreaks[], archivedAt }

📁 userStats/
  📁 {userId}/
    📄 stats: { totalGamesPlayed, lifetimeScore, currentStreak, gameBreakdown }

📁 users/ (existing)
📁 usernames/ (existing)
📁 wallets/ (existing)
```

## Step 5: Test Database Access

1. **Open Firebase Console:**
   ```bash
   firebase open
   ```

2. **Navigate to Firestore Database**

3. **Create test data** (optional):
   ```javascript
   // In Firebase Console > Firestore > Start collection
   Collection ID: leaderboards/current/metadata
   Document ID: info
   Fields:
   {
     monthId: "2025-10",
     startDate: "2025-10-01",
     endDate: "2025-10-31",
     lastReset: [current timestamp]
   }
   ```

## Step 6: Environment Variables

Ensure your `.env.local` file has the correct Firebase config:

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Step 7: Test Leaderboard Integration

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to `/game`** to see the leaderboard with mock data

3. **Check browser console** for any Firebase connection errors

## Step 8: Deploy Functions (Optional - for future use)

If you want to add Cloud Functions later (for automated tasks):

```bash
firebase deploy --only functions
```

**Note:** You mentioned you can't use Cloud Functions on Spark plan, so this is optional.

## Firestore Security Rules Explained

### Leaderboard Rules
```javascript
// Anyone can read leaderboards (public)
match /leaderboards/current/{type}/{userId} {
  allow read: if true;
  
  // Only authenticated users can write their own scores
  allow create, update: if isAuthenticated() && 
                           request.auth.uid == userId;
}
```

### Key Security Features
- ✅ **Public read access** for leaderboards
- ✅ **User-only write access** for scores
- ✅ **Admin-only access** for archives
- ✅ **Rate limiting** prevention
- ✅ **Data validation** (positive scores, valid user IDs)

## Firestore Indexes Explained

### Required Indexes
1. **Total Score Leaderboard:**
   ```javascript
   Collection: totalScore
   Fields: totalScore (desc), lastUpdated (desc)
   ```

2. **Streak Leaderboard:**
   ```javascript
   Collection: streak  
   Fields: currentStreak (desc), lastPlayed (desc)
   ```

These indexes enable fast queries for:
- Top 100 players by score
- Top 100 players by streak
- Real-time leaderboard updates

## Authentication Integration

### Your Current System
```typescript
// Firebase Auth user
const { user, userData } = useAuth();

// Solana wallet
const { account, isConnected } = useWeb3();

// Leaderboard submission
await leaderboardService.submitScore(
  user?.uid || 'anonymous',
  userData?.username || 'Anonymous',
  points,
  gameType
);
```

### User ID Strategy
- **Logged in users:** Use `user.uid` from Firebase Auth
- **Wallet-only users:** Use wallet address as user ID
- **Anonymous users:** Generate temporary ID (optional)

## Troubleshooting

### Common Issues

1. **"Permission denied" errors:**
   ```bash
   # Redeploy rules
   firebase deploy --only firestore:rules
   ```

2. **"Index not found" errors:**
   ```bash
   # Check index status
   firebase firestore:indexes
   
   # Redeploy indexes
   firebase deploy --only firestore:indexes
   ```

3. **"Collection not found" errors:**
   - The leaderboard service auto-creates collections on first use
   - Ensure user is authenticated when submitting scores

4. **Environment variable issues:**
   ```bash
   # Restart development server after changing .env.local
   npm run dev
   ```

### Debug Commands

```bash
# Check Firebase project status
firebase projects:list

# View current project
firebase use

# Check Firestore rules
firebase firestore:rules

# View indexes
firebase firestore:indexes

# Test security rules locally
firebase emulators:start --only firestore
```

## Monthly Reset Process

### How It Works
1. **Client-side detection** on app load
2. **Automatic archiving** of top 10 winners
3. **Metadata update** with new month ID
4. **No Cloud Functions required**

### Manual Reset (Emergency)
```javascript
// In browser console (admin only)
await leaderboardService.checkAndPerformMonthlyReset();
```

## Performance Optimization

### Best Practices
- ✅ **Limit queries** to top 100 entries
- ✅ **Use real-time listeners** sparingly
- ✅ **Cache user ranks** locally
- ✅ **Batch score updates** when possible

### Monitoring
- Monitor read/write operations in Firebase Console
- Set up billing alerts for usage spikes
- Use Firestore usage dashboard

## Next Steps

1. **Deploy the rules and indexes** (steps 2-3)
2. **Test with real user accounts**
3. **Integrate scoring into games** (next task)
4. **Create admin dashboard** (future task)
5. **Monitor usage and performance**

## Support

If you encounter issues:
1. Check Firebase Console for error logs
2. Review browser console for client-side errors
3. Verify authentication state
4. Test with Firebase emulator locally

---

**Ready to deploy!** Run the commands in steps 2-3 to set up your Firestore database for the leaderboard system.
