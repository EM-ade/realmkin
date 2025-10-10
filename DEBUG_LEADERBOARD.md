# Leaderboard Debugging Guide

## Quick Test in Browser Console

Open DevTools (F12) and paste this:

```javascript
// 1. Check authentication
console.log('Auth User:', JSON.parse(localStorage.getItem('firebase:authUser:' + Object.keys(localStorage).find(k => k.startsWith('firebase:authUser'))?.split(':')[2]) || 'null'));

// 2. Test score submission manually
import { leaderboardService } from './src/services/leaderboardService';

// Submit test score
await leaderboardService.submitScore(
  'test-user-123',
  'TestPlayer',
  500,
  '2048'
);

// Update test streak
await leaderboardService.updateStreak(
  'test-user-123',
  'TestPlayer'
);

// Get leaderboard
const scores = await leaderboardService.getLeaderboard('totalScore', 10);
console.log('Top Scores:', scores);

const streaks = await leaderboardService.getLeaderboard('streak', 10);
console.log('Top Streaks:', streaks);
```

## Check Firestore Data

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/realmkin/firestore/data

2. **Look for these collections:**
   - `leaderboards/current/totalScore`
   - `leaderboards/current/streak`
   - `leaderboards/current/metadata`

3. **Check your user document:**
   - Collection: `leaderboards/current/totalScore`
   - Document ID: Your Firebase UID
   - Should have: `totalScore`, `gamesPlayed`, `username`

## Common Errors & Fixes

### Error: "Permission denied"
**Cause:** Firestore rules not deployed
**Fix:**
```bash
firebase deploy --only firestore:rules
```

### Error: "User not authenticated"
**Cause:** Not logged in or `userData` is null
**Fix:**
1. Log in with wallet or email
2. Check if username exists in profile

### Error: "Collection not found"
**Cause:** First time use, collections auto-create
**Fix:** Play a game while logged in, collections will be created

### Error: "Failed to submit score"
**Cause:** Network issue or Firestore connection
**Fix:**
1. Check internet connection
2. Verify Firebase config in `.env.local`
3. Check browser console for specific error

## Manual Test Steps

### Step 1: Verify Firebase Connection
```javascript
import { db } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Test connection
const testCollection = collection(db, 'users');
const snapshot = await getDocs(testCollection);
console.log('Firebase connected:', snapshot.size, 'users');
```

### Step 2: Check User Data
```javascript
import { useAuth } from './src/contexts/AuthContext';

// In a component
const { user, userData } = useAuth();
console.log('User ID:', user?.uid);
console.log('Username:', userData?.username);
console.log('Email:', userData?.email);
```

### Step 3: Test Score Submission
Play a game and watch console for:
```
✅ "Score submitted: 2048 → 205 points"
✅ "Wordle score submitted: 3 attempts → 220 points"
```

### Step 4: Verify in Firestore
After playing, check:
- `leaderboards/current/totalScore/{your-uid}`
- Should see your score entry

## Streak Not Showing?

### Check Streak Data
```javascript
import { doc, getDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

const streakRef = doc(db, 'leaderboards/current/streak', 'YOUR_USER_ID');
const streakDoc = await getDoc(streakRef);
console.log('Streak data:', streakDoc.data());
```

### Verify Streak Calculation
Streak updates when:
- ✅ User plays a game (any game)
- ✅ It's a different day (UTC timezone)
- ✅ User is authenticated

Streak resets when:
- ❌ User misses a day (doesn't play for 2+ days)

## Network Tab Check

1. Open DevTools → Network tab
2. Filter: `firestore.googleapis.com`
3. Play a game
4. Look for POST requests to:
   - `/v1/projects/realmkin/databases/(default)/documents/leaderboards/current/totalScore`
   - `/v1/projects/realmkin/databases/(default)/documents/leaderboards/current/streak`

### Successful Request
- Status: `200 OK`
- Response: Document data

### Failed Request
- Status: `403 Forbidden` → Rules issue
- Status: `401 Unauthorized` → Auth issue
- Status: `404 Not Found` → Path issue

## Force Refresh Leaderboard

If leaderboard isn't updating:

```javascript
// In browser console
window.location.reload();

// Or clear cache
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

## Still Not Working?

### Check These:

1. **Rules deployed?**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Indexes created?**
   ```bash
   firebase deploy --only firestore:indexes
   ```

3. **User logged in?**
   - Check if wallet is connected
   - Verify email/password login

4. **Username exists?**
   - Check `users/{uid}` document
   - Verify `username` field is set

5. **Firestore initialized?**
   - Go to Firebase Console
   - Check if Firestore database exists
   - Should be in "production mode" or "test mode"

## Contact Points

If still failing, provide:
1. Browser console screenshot (full errors)
2. Network tab screenshot (Firestore requests)
3. Firebase Console screenshot (collections)
4. Your user ID (from console.log)

---

**Quick Fix Command:**
```bash
# Redeploy everything
firebase deploy --only firestore:rules,firestore:indexes

# Restart dev server
npm run dev
```
