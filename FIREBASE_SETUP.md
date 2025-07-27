# Firebase Setup Instructions

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "realmkin-app")
4. Follow the setup wizard

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

## 3. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web" icon to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

## 4. Update Firebase Config

Replace the placeholder values in `src/lib/firebase.ts` with your actual Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

## 5. Create Test Users (Optional)

1. In Firebase Console, go to Authentication > Users
2. Click "Add user"
3. Enter email and password for testing
4. Click "Add user"

## 6. Test the Application

1. Run `npm run dev`
2. Navigate to `/login`
3. Try logging in with your test credentials
4. Upon successful login, you'll be redirected to the main page

## Security Rules (Optional)

For production, consider setting up Firestore security rules and other Firebase security features as needed.
