
# Firebase Permissions Setup Guide

## Issue: Missing Service Account Permissions

You're getting the error:
```
Error: Missing permissions required for functions deploy. You must have permission iam.serviceAccounts.ActAs on service account realmkin@appspot.gserviceaccount.com.
```

This means your Firebase project needs to grant you the necessary permissions to deploy functions.

## 🔧 Solution Options

### Option 1: Project Owner Fixes (Recommended)

**For the Project Owner:**

1. Go to the IAM permissions URL provided in the error message:
   ```
   https://console.cloud.google.com/iam-admin/iam?project=realmkin
   ```

2. Find the service account: `realmkin@appspot.gserviceaccount.com`

3. Click on the service account to open its permissions page

4. Click the "Permissions" tab

5. Click "Grant Access"

6. Search for and add the "Service Account User" role:
   - Role: `Service Account User` (`roles/iam.serviceAccountUser`)
   - This role allows creating and managing service accounts

7. Click "Save"

8. Wait a few minutes for permissions to propagate

9. Try deploying again:
   ```bash
   firebase deploy --only functions:testOneTimeDistribution,functions:manualOneTimeTokenDistribution
   ```

### Option 2: Alternative Roles (If Service Account User not available)

**Alternative roles that might work:**
- `Cloud Functions Developer` (`roles/cloudfunctions.developer`)
- `Cloud Functions Admin` (`roles/cloudfunctions.admin`)
- `Editor` (`roles/editor`)

### Option 3: Project Owner Role

If you have project owner permissions, you can:

1. **Add yourself as Service Account User:**
   - Go to IAM page
   - Add your email to the service account
   - Grant "Service Account User" role

2. **Use a different service account:**
   - Create a new service account with appropriate roles
   - Download the JSON key file
   - Use: `firebase login:ci` with the service account key

## 🔍 Verification Steps

After permissions are granted, verify:

1. **Check your permissions:**
   ```bash
   gcloud projects get-iam-policy realmkin --flatten
   ```

2. **Test deployment:**
   ```bash
   cd realmkin/functions
   firebase deploy --only functions:testOneTimeDistribution --dry-run
   ```

3. **Check function list:**
   ```bash
   firebase functions:list
   ```

## 🚨 Important Notes

### Security Considerations
- Only grant minimum necessary permissions
- The "Service Account User" role is specifically designed for this use case
- Avoid using "Owner" role unless absolutely necessary

### Temporary Workaround
If you need to deploy immediately and can't get permissions:

1. **Use Firebase Console:**
   - Go to Firebase Console: https://console.firebase.google.com
   - Navigate to Functions section
   - Use "Upload function" feature if available
   - Upload compiled JavaScript files from `lib/` directory

2. **Use different deployment method:**
   - Some organizations have different deployment procedures
   - Check if there are internal deployment tools available

## 📞 Getting Help

If you continue to have permission issues:

1. **Contact your Firebase Project Owner** directly
2. **Share this guide** with the person who has permissions
3. **Check organization policies** that might restrict role assignments

## 🔄 After Permissions Are Fixed

Once you have the correct permissions:

1. **Navigate to functions directory:**
   ```bash
   cd realmkin/functions
   ```

2. **Deploy test functions:**
   ```bash
   firebase deploy --only functions:testOneTimeDistribution,functions:manualOneTimeTokenDistribution
   ```

3. **Run comprehensive tests:**
   ```bash
   # Get your function URL from deployment output
   curl -X POST https://your-region-your-project.cloudfunctions.net/testOneTimeDistribution \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

4. **Deploy production function:**
   ```bash
   firebase functions:config:set DRY_RUN_MODE=false
   firebase deploy --only functions:oneTimeTokenDistribution
   ```

5. **Monitor execution:**
   ```bash
   firebase functions:log --only oneTimeTokenDistribution
   ```

---

**The one-time token distribution system is fully implemented and ready. The only remaining step is resolving the Firebase IAM permissions issue.**
