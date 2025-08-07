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
  appId: "your-app-id",
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

## 7. Production Security Setup

⚠️ **CRITICAL**: These security measures are REQUIRED for production deployment!

### A. Firestore Security Rules

Replace the default rules with these secure production rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null &&
        request.auth.uid == userId &&
        validateUserData(request.resource.data);
    }

    // Username uniqueness - read only, create once
    match /usernames/{username} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.uid &&
        validateUsername(username);
      allow update, delete: if false; // Prevent changes
    }

    // Validation functions
    function validateUserData(data) {
      return data.keys().hasAll(['username', 'email', 'createdAt']) &&
        data.username is string && data.username.size() >= 3 &&
        data.email is string && data.email.matches('.*@.*') &&
        data.createdAt is timestamp;
    }

    function validateUsername(username) {
      return username.matches('^[a-zA-Z0-9_]{3,30}$');
    }
  }
}
```

### B. Authentication Security

1. **Enable Email Enumeration Protection**:

   - Firebase Console → Authentication → Settings
   - Toggle "Email enumeration protection" ON

2. **Configure Authorized Domains**:

   - Remove `localhost` for production
   - Add only your production domains: `yourdomain.com`

3. **Set Strong Password Requirements**:
   - Minimum 8 characters recommended
   - Consider enabling complexity requirements

### C. Environment Security

1. **Use separate Firebase projects**:

   - Development project for testing
   - Production project for live app

2. **Secure your environment variables**:

   - Never commit `.env.local` to git
   - Use different API keys for dev/prod
   - Rotate keys regularly

3. **Production environment setup**:

```bash
# Production .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-prod-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-prod-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_prod_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_prod_app_id
```

### D. Additional Security Measures

1. **Enable App Check** (Highly Recommended):

   - Go to Firebase Console → App Check
   - Enable for your web app
   - Protects against abuse and bot traffic

2. **Set up Monitoring**:

   - Enable Firebase Security Rules monitoring
   - Set up alerts for failed authentication attempts
   - Monitor unusual access patterns

3. **Rate Limiting**:
   - Implement signup/login rate limiting
   - Use Firebase Functions for server-side limits

### E. Security Checklist

Before going to production, ensure:

- [ ] Firestore security rules implemented and tested
- [ ] Email enumeration protection enabled
- [ ] Authorized domains configured (localhost removed)
- [ ] Separate production Firebase project created
- [ ] Environment variables secured
- [ ] App Check enabled
- [ ] Monitoring and alerts configured
- [ ] Rate limiting implemented
- [ ] Regular security audits planned

### F. Testing Security Rules

Test your rules before deployment:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Test rules locally
firebase emulators:start --only firestore

# Run security tests
npm run test:security
```

### G. Emergency Response

If security issues arise:

1. Immediately disable affected accounts
2. Rotate all API keys
3. Review and update security rules
4. Notify users if data was compromised
5. Document the incident for future prevention

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null &&
        request.auth.uid == userId &&
        validateUserData(request.resource.data);
    }

    // Username uniqueness checking
    match /usernames/{username} {
      allow read: if request.auth != null;

      // Only allow creating username documents, not updating
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.uid &&
        username == username.lower() &&
        validateUsername(username);

      // Prevent deletion/updates of username documents
      allow update, delete: if false;
    }

    // Helper functions for validation
    function validateUserData(data) {
      return data != null &&
        data.keys().hasAll(['username', 'email', 'createdAt']) &&
        data.keys().hasOnly(['username', 'email', 'createdAt']) &&
        data.username is string &&
        data.username.size() >= 3 &&
        data.username.size() <= 30 &&
        data.username.matches('^[a-zA-Z0-9_]+$') &&
        data.email is string &&
        data.email.matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$') &&
        data.createdAt is timestamp;
    }

    function validateUsername(username) {
      return username is string &&
        username.size() >= 3 &&
        username.size() <= 30 &&
        username.matches('^[a-zA-Z0-9_]+$');
    }
  }
}
```

### B. Firebase Authentication Security

1. **Enable Email Enumeration Protection**:

   - Go to Firebase Console → Authentication → Settings
   - Enable "Email enumeration protection"
   - This prevents attackers from discovering registered emails

2. **Configure Authorized Domains**:

   - Go to Authentication → Settings → Authorized domains
   - **Remove localhost** for production
   - Add only your production domain(s): `yourdomain.com`, `www.yourdomain.com`

3. **Set Password Policy** (if using Identity Platform):
   - Minimum 8 characters
   - Require uppercase, lowercase, numbers
   - Block common passwords

### C. Environment Variables Security

1. **Never commit `.env.local`** to version control
2. **Use different Firebase projects** for development and production
3. **Rotate API keys** regularly
4. **Set up environment-specific configs**:

```bash
# Production .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=prod_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-prod-project
# ... other prod values
```

### D. Additional Security Measures

1. **Enable App Check** (Recommended):

   - Go to Firebase Console → App Check
   - Enable for your web app
   - Protects against abuse and unauthorized access

2. **Set up Monitoring**:

   - Enable Firebase Security Rules monitoring
   - Set up alerts for suspicious activity
   - Monitor authentication patterns

3. **Rate Limiting**:

   - Implement client-side rate limiting for signup/login
   - Use Firebase Functions for server-side rate limiting if needed

4. **Data Validation**:
   - Always validate data on both client and server
   - Sanitize user inputs
   - Use TypeScript for type safety

### E. Security Checklist for Production

- [ ] Firestore security rules implemented and tested
- [ ] Email enumeration protection enabled
- [ ] Authorized domains configured (localhost removed)
- [ ] Environment variables secured
- [ ] App Check enabled (recommended)
- [ ] Monitoring and alerts set up
- [ ] Rate limiting implemented
- [ ] Data validation in place
- [ ] Regular security audits scheduled

### F. Testing Security Rules

Test your security rules before deployment:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Test security rules locally
firebase emulators:start --only firestore

# Run security rules tests
firebase firestore:rules:test
```

### G. Emergency Response Plan

1. **If security breach detected**:

   - Immediately disable affected user accounts
   - Rotate all API keys
   - Review and update security rules
   - Notify affected users if required

2. **Regular maintenance**:
   - Review security rules monthly
   - Update dependencies regularly
   - Monitor Firebase security bulletins
   - Conduct security audits quarterly
