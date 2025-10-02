# Firestore Security Rules Documentation

## Overview
These security rules protect your Firestore database while allowing normal application functionality. They follow the principle of least privilege - users can only access what they need.

## Collections & Access Patterns

### 1. **users** Collection
**Purpose**: Stores user profile data (username, email, wallet address, admin status)

**Rules**:
- ✅ **Read**: Public (anyone can view profiles for leaderboards)
- ✅ **Create**: Only authenticated users can create their own profile
- ✅ **Update**: Users can only update their own profile (cannot change username, email, or wallet)
- ✅ **Delete**: Admin only

**Validation**:
- Username must be 3-20 characters, alphanumeric + underscore
- Must include: username, email, walletAddress, createdAt
- Immutable fields: username, email, walletAddress, createdAt

---

### 2. **usernames** Collection
**Purpose**: Maps usernames to user IDs (prevents duplicates)

**Rules**:
- ✅ **Read**: Public (for username availability checks)
- ✅ **Create**: Authenticated users only, must match their UID
- ❌ **Update/Delete**: Not allowed (usernames are permanent)

**Validation**:
- Username must pass validation (3-20 chars, alphanumeric + underscore)
- UID must match authenticated user

---

### 3. **wallets** Collection
**Purpose**: Maps wallet addresses to user IDs

**Rules**:
- ✅ **Read**: Public (needed for `getUserByWallet` function)
- ✅ **Create**: Authenticated users only, must match their UID
- ❌ **Update/Delete**: Not allowed (wallet mappings are permanent)

**Validation**:
- Must include: uid, username, createdAt
- UID must match authenticated user

---

### 4. **userRewards** Collection
**Purpose**: Stores MKIN balances and rewards data

**Rules**:
- ✅ **Read**: Users can read their own, admins can read all
- ✅ **Create**: Users can create their own rewards record
- ✅ **Update**: Users can update their own (with balance validation)
- ✅ **Delete**: Admin only

**Validation**:
- `totalRealmkin` and `pendingRewards` must be >= 0
- Balance can only decrease by max 10,000 MKIN per transaction (prevents exploits)
- Prevents negative balances

---

### 5. **claimRecords** Collection
**Purpose**: Immutable history of reward claims

**Rules**:
- ✅ **Read**: Users can read their own claims, admins can read all
- ✅ **Create**: Users can create claims for themselves
- ❌ **Update/Delete**: Not allowed (history is immutable)

**Validation**:
- `userId` must match authenticated user
- `amount` must be > 0

---

### 6. **transactionHistory** Collection
**Purpose**: Immutable record of all transactions (claims, withdrawals, transfers)

**Rules**:
- ✅ **Read**: Users can read their own transactions, admins can read all
- ✅ **Create**: Users can create transactions for themselves
- ❌ **Update/Delete**: Not allowed (history is immutable)

**Validation**:
- `userId` must match authenticated user
- `type` must be one of: 'claim', 'withdraw', 'transfer'

---

### 7. **transferRecords** Collection
**Purpose**: Peer-to-peer MKIN transfers

**Rules**:
- ✅ **Read**: Users can read transfers they're involved in (sender or recipient)
- ✅ **Create**: Only the sender can create transfer records
- ❌ **Update/Delete**: Not allowed (history is immutable)

**Validation**:
- `senderUserId` must match authenticated user
- `amount` must be > 0

---

### 8. **rateLimits** Collection
**Purpose**: Prevents abuse by tracking user actions

**Rules**:
- ✅ **Read**: Users can read their own rate limit status
- ✅ **Create/Update**: Users can modify their own rate limits
- ❌ **Delete**: Not allowed (rate limits persist)

---

### 9. **contractBonusConfigs** Collection
**Purpose**: NFT contract reward multipliers (admin-managed)

**Rules**:
- ✅ **Read**: Public (needed for reward calculations)
- ✅ **Create/Update/Delete**: Admin only

---

### 10. **contractWelcomeGrants** Collection
**Purpose**: Tracks welcome bonuses per NFT contract

**Rules**:
- ✅ **Read**: Users can read their own grants
- ✅ **Create/Update**: Users can modify their own grants
- ❌ **Delete**: Not allowed

**Validation**:
- `userId` must match authenticated user

---

## Helper Functions

### `isAuthenticated()`
Checks if user is signed in with Firebase Auth

### `isOwner(userId)`
Checks if authenticated user matches the specified userId

### `isAdmin()`
Checks if user has `admin: true` in their user document
**Note**: This requires a Firestore read, so use sparingly

### `isValidUsername(username)`
Validates username format:
- 3-20 characters
- Alphanumeric + underscore only
- Pattern: `^[a-zA-Z0-9_]+$`

---

## Security Features

### ✅ **Prevents Common Exploits**
1. **Balance Manipulation**: Users cannot directly set their MKIN balance to arbitrary values
2. **Negative Balances**: Validation ensures balances never go below 0
3. **Large Withdrawals**: Max 10k MKIN decrease per transaction
4. **Username Squatting**: Usernames are validated and permanent
5. **Wallet Hijacking**: Wallet mappings are immutable
6. **History Tampering**: All history collections are immutable (no updates/deletes)

### ✅ **Privacy Protection**
1. **Rewards Privacy**: Users can only see their own MKIN balance
2. **Transaction Privacy**: Users can only see their own transactions
3. **Transfer Privacy**: Users only see transfers they're involved in

### ✅ **Admin Controls**
- Admins can delete users
- Admins can manage contract bonus configs
- Admins can view all rewards and transactions (for support)

---

## Deployment

### Deploy to Firebase:
```bash
firebase deploy --only firestore:rules
```

### Test Rules Locally:
```bash
firebase emulators:start --only firestore
```

---

## Testing Checklist

Before deploying, test these scenarios:

### ✅ **User Creation**
- [ ] User can create their own profile
- [ ] User cannot create profile for another user
- [ ] Username validation works
- [ ] Duplicate usernames are rejected

### ✅ **Rewards**
- [ ] User can read their own rewards
- [ ] User cannot read another user's rewards
- [ ] User cannot set negative balance
- [ ] User cannot increase balance by more than 10k at once

### ✅ **Claims**
- [ ] User can create claim records
- [ ] User cannot modify existing claims
- [ ] User cannot delete claims

### ✅ **Transfers**
- [ ] User can create transfers as sender
- [ ] User cannot create transfers as another sender
- [ ] Both sender and recipient can read transfer
- [ ] Third parties cannot read transfer

### ✅ **Admin**
- [ ] Admin can delete users
- [ ] Admin can manage contract configs
- [ ] Non-admin cannot perform admin actions

---

## Migration Notes

### Before Deploying:
1. **Backup your database** (export from Firebase Console)
2. **Test in emulator** with your actual app
3. **Deploy during low-traffic period**
4. **Monitor Firebase Console** for rule violations

### After Deploying:
1. Check Firebase Console > Firestore > Rules tab for errors
2. Monitor application logs for permission denied errors
3. Test all user flows (signup, claim, transfer, etc.)

---

## Troubleshooting

### "Permission Denied" Errors

**Check**:
1. Is user authenticated? (`request.auth != null`)
2. Is user trying to access their own data?
3. Are required fields present in the document?
4. Is the data format valid?

### Common Issues:

**Issue**: User cannot create profile
**Fix**: Ensure all required fields are present: username, email, walletAddress, createdAt

**Issue**: User cannot update rewards
**Fix**: Check that balance changes don't exceed 10k MKIN limit

**Issue**: Admin functions not working
**Fix**: Verify user document has `admin: true` field

---

## Future Enhancements

Consider adding:
1. **Rate limiting** on writes (max X writes per minute)
2. **Field-level validation** for more complex data types
3. **Batch operation rules** for bulk updates
4. **Time-based restrictions** (e.g., no claims before X date)
5. **IP-based restrictions** (requires Cloud Functions)

---

## Support

If you encounter issues:
1. Check Firebase Console logs
2. Review the rules in `firestore.rules`
3. Test with Firebase Emulator
4. Verify user authentication status
