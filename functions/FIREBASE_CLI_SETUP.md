# Firebase CLI Setup Guide

## Issue: Firebase CLI Not Found

The error `'firebase' is not recognized as an internal or external command, operable program or batch file.` means the Firebase CLI is not installed or not in your system PATH.

## 🔧 Solution Options

### Option 1: Install Firebase CLI Globally (Recommended)

```bash
# Using npm (recommended)
npm install -g firebase-tools

# Or using yarn
yarn global add firebase-tools

# Verify installation
firebase --version
```

### Option 2: Install Firebase CLI Locally

```bash
# Install in your project
npm install firebase-tools

# Use with npx
npx firebase --version

# Run commands with npx
npx firebase projects:list
```

### Option 3: Use Firebase CLI via VS Code

1. Install Firebase extension in VS Code
2. Open terminal in VS Code
3. Use integrated Firebase commands

## 🚀 Quick Setup Commands

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Select your project
firebase use your-project-id

# 4. Navigate to functions directory
cd realmkin/functions

# 5. Test Firebase CLI
firebase projects:list

# 6. Deploy functions
firebase deploy --only functions
```

## 🔍 Verification Steps

After installation, verify everything works:

```bash
# Check Firebase CLI version
firebase --version

# List projects
firebase projects:list

# Check current project
firebase use

# Test deployment
firebase deploy --only functions:testOneTimeDistribution --dry-run
```

## 📋 Alternative: Use Firebase Console

If CLI installation fails, you can:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Functions section
4. Click "Upload function" (if available)
5. Upload the compiled JavaScript files from `realmkin/functions/lib/`

## ⚠️ Common Installation Issues

### Issue: Permission Denied
```bash
# On Windows, run as administrator
# On macOS/Linux, use sudo
sudo npm install -g firebase-tools
```

### Issue: PATH Issues
```bash
# Find where npm installs global packages
npm config get prefix

# Add to PATH (temporary for current session)
export PATH="$(npm config get prefix)/bin:$PATH"

# Add to .bashrc or .zshrc permanently
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Issue: Node.js Version
```bash
# Firebase CLI requires Node.js 14 or higher
node --version

# Upgrade Node.js if needed
# Use nvm (Node Version Manager)
nvm install 18
nvm use 18
```

## 🎯 Next Steps After Installation

Once Firebase CLI is installed:

1. **Navigate to functions directory:**
   ```bash
   cd realmkin/functions
   ```

2. **Set environment variables:**
   ```bash
   firebase functions:config:set HELIUS_API_KEY=your_api_key_here
   firebase functions:config:set DRY_RUN_MODE=true
   ```

3. **Deploy test functions:**
   ```bash
   firebase deploy --only functions:testOneTimeDistribution,functions:manualOneTimeTokenDistribution
   ```

4. **Run tests:**
   ```bash
   # Get your function URL from deployment output
   curl -X POST https://your-region-your-project.cloudfunctions.net/testOneTimeDistribution \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

5. **Deploy production function:**
   ```bash
   firebase functions:config:set DRY_RUN_MODE=false
   firebase deploy --only functions:oneTimeTokenDistribution
   ```

## 🔧 Troubleshooting

If you still have issues:

1. **Restart terminal** after installation
2. **Clear npm cache**: `npm cache clean --force`
3. **Use npx**: `npx firebase` instead of global `firebase`
4. **Check Node.js**: Ensure Node.js 14+ is installed
5. **Verify PATH**: Run `echo $PATH` to check Firebase CLI location

---

**After installing Firebase CLI, return to the main deployment guide and continue with the steps.**