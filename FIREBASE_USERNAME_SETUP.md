# Firebase Configuration for Username Storage

This document provides instructions for updating your Firebase configuration to support the new user data structure with username storage.

## Required Firebase Services

1. **Firebase Authentication** (already configured)
2. **Cloud Firestore** (needs to be enabled)

## Step 1: Enable Cloud Firestore

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your Realmkin project
3. In the left sidebar, click on **"Firestore Database"**
4. Click **"Create database"**
5. Choose **"Start in test mode"** for now (we'll secure it later)
6. Select your preferred location (choose closest to your users)
7. Click **"Done"**

## Step 2: Update Firebase Configuration

Make sure your `src/lib/firebase.ts` file exports both `auth` and `db`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // your existing config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);  // Add this line if not present
```

## Step 3: Firestore Database Structure

The app will automatically create these collections:

### `users` Collection
```
users/{userId}
├── username: string
├── email: string
└── createdAt: timestamp
```

### `usernames` Collection (for uniqueness checking)
```
usernames/{username_lowercase}
└── uid: string (reference to user ID)
```

## Step 4: Security Rules (Production)

Replace the default Firestore rules with these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Username uniqueness checking - read only for authenticated users
    match /usernames/{username} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.uid;
    }
  }
}
```

## Step 5: Test the Setup

1. Try creating a new account with the signup form
2. Check your Firestore console to see if the collections are created
3. Verify that usernames are being checked for uniqueness
4. Test login with the new account

## Features Implemented

✅ **User Registration**: Creates user account with username, email, and timestamp
✅ **Username Uniqueness**: Checks if username is already taken in real-time
✅ **User Data Storage**: Stores additional user information in Firestore
✅ **Dynamic Welcome Messages**: Shows username when wallet disconnected, wallet address when connected
✅ **Form Validation**: Comprehensive validation for all signup fields
✅ **Error Handling**: Proper error messages for various failure scenarios

## Troubleshooting

### Common Issues:

1. **"Missing or insufficient permissions"**
   - Make sure Firestore rules allow authenticated users to read/write
   - Check that the user is properly authenticated

2. **"Username checking not working"**
   - Verify that the `usernames` collection has read permissions
   - Check browser console for any JavaScript errors

3. **"User data not loading"**
   - Ensure the `users` collection exists and has proper permissions
   - Check that the user document was created during signup

### Debug Steps:

1. Check Firebase Console for any error logs
2. Open browser developer tools and check the Console tab
3. Verify that both Authentication and Firestore are enabled in Firebase Console
4. Test with Firebase Emulator Suite for local development

## Environment Variables

Make sure your `.env.local` file includes all necessary Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Next Steps

After completing this setup:
1. Test the signup and login functionality thoroughly
2. Consider implementing email verification for new accounts
3. Add password reset functionality if needed
4. Monitor usage and adjust Firestore security rules as needed
