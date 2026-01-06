# Troubleshooting Firebase Functions Deployment

## Issue: Functions Not Showing in Firebase Dashboard

If you've run the deployment script but don't see the functions in the Firebase dashboard, follow these steps:

## 🔍 Step 1: Verify Firebase CLI Authentication

```bash
# Check if you're logged in to the correct project
firebase projects:list

# Check current project
firebase use

# If wrong project, switch to correct one
firebase use your-project-id
```

## 🔍 Step 2: Check Function Build Status

```bash
cd realmkin/functions

# Check if TypeScript compilation succeeded
npm run build

# Look for any compilation errors
ls -la lib/  # Should show compiled JS files
```

## 🔍 Step 3: Manual Deployment Test

Try deploying just one function first:

```bash
# Deploy only the test function
firebase deploy --only functions:testOneTimeDistribution

# Check for errors
firebase functions:log
```

## 🔍 Step 4: Check Firebase Project Configuration

```bash
# Check firebase.json configuration
cat firebase.json

# Verify functions section points to correct directory
grep -A 10 '"functions"' firebase.json
```

## 🔍 Step 5: Verify Functions Directory Structure

Your functions directory should look like:
```
realmkin/functions/
├── src/
│   ├── index.ts
│   ├── oneTimeTokenDistribution.ts
│   ├── testOneTimeDistribution.ts
│   └── ...other files
├── lib/                    # Compiled JavaScript files
├── package.json
├── tsconfig.json
└── .firebaserc
```

## 🔍 Step 6: Check for Common Deployment Issues

### Issue 1: Missing Dependencies
```bash
# Install dependencies
npm install

# Check for missing packages
npm ls
```

### Issue 2: Firebase Project Permissions
```bash
# Check if you have necessary permissions
firebase projects:list

# Verify you can deploy to this project
firebase deploy --only functions
```

### Issue 3: Functions Runtime Issues
```bash
# Check Node.js version (should be 20)
node --version

# Check if functions use compatible APIs
grep -r "admin\." src/
```

### Issue 4: Region Configuration
```bash
# Check default region
firebase functions:config:get REGION

# Set region if needed
firebase functions:config:set REGION=us-central1
```

## 🔧 Step 7: Alternative Deployment Methods

### Method 1: Direct Firebase Console Deployment
1. Open Firebase Console: https://console.firebase.google.com
2. Go to Functions section
3. Click "Upload function" (if available)
4. Upload the compiled JavaScript files from `lib/` directory

### Method 2: Manual Firebase CLI Commands
```bash
# Try deploying with verbose output
firebase deploy --only functions --debug

# Deploy with specific region
firebase deploy --only functions --region us-central1

# Force redeploy all functions
firebase deploy --only functions --force
```

### Method 3: Check Function Status
```bash
# List all functions
firebase functions:list

# Get detailed info about specific function
firebase functions:describe oneTimeTokenDistribution

# Check function logs
firebase functions:log --only oneTimeTokenDistribution
```

## 🔍 Step 8: Verify Environment Variables

```bash
# Check current environment variables
firebase functions:config:get

# Set required variables if missing
firebase functions:config:set HELIUS_API_KEY=your_api_key_here
firebase functions:config:set DRY_RUN_MODE=true
```

## 🚨 Common Error Messages and Solutions

### Error: "No functions directory found"
**Solution**: Make sure you're in the `realmkin/functions` directory

### Error: "Permission denied"
**Solution**: Check Firebase project permissions and authentication

### Error: "Function failed to load"
**Solution**: Check for TypeScript compilation errors

### Error: "Deployment timeout"
**Solution**: Check network connection and try again

## 📞 Getting Help

If you're still stuck, try these commands:

```bash
# Get Firebase CLI help
firebase deploy --help

# Check Firebase status
firebase status

# Get detailed error information
firebase deploy --only functions --debug
```

## 🎯 Quick Test to Verify Everything Works

```bash
# 1. Test the test function
curl -X POST https://your-region-your-project.cloudfunctions.net/testOneTimeDistribution \
  -H "Content-Type: application/json" \
  -d '{}'

# 2. Check if function appears in list
firebase functions:list

# 3. Check logs
firebase functions:log --only testOneTimeDistribution
```

---

## 📋 Next Steps

1. **Run the verification commands above** to identify the specific issue
2. **Check the Firebase Console** directly at https://console.firebase.google.com
3. **Try manual deployment** if automated deployment fails
4. **Review the error messages** carefully - they usually indicate the exact problem

If you continue to have issues, please share:
- The exact error message you're seeing
- The output of `firebase projects:list`
- The output of `firebase use`
- Any error messages from the deployment attempt

This will help identify the root cause and get your functions deployed successfully.