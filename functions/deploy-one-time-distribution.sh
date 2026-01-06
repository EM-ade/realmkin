#!/bin/bash

# One-Time Token Distribution Deployment Script
# This script handles the complete deployment process for the one-time token distribution

set -e  # Exit on any error

echo "🚀 One-Time Token Distribution Deployment Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function names
FUNCTIONS="oneTimeTokenDistribution,manualOneTimeTokenDistribution,testOneTimeDistribution"

echo ""
echo "${BLUE}Step 1: Environment Setup${NC}"
echo "-----------------------------------"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must be run from functions directory${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

echo ""
echo "${BLUE}Step 2: Configuration${NC}"
echo "-----------------------------------"

# Set dry run mode by default for safety
echo "${YELLOW}🔧 Setting dry run mode for safety...${NC}"
firebase functions:config:set DRY_RUN_MODE=true

# Check for Helius API key
echo "${YELLOW}🔑 Checking Helius API key...${NC}"
if [ -z "$HELIUS_API_KEY" ]; then
    echo -e "${RED}❌ Warning: HELIUS_API_KEY environment variable not set${NC}"
    echo "Please set it with: firebase functions:config:set HELIUS_API_KEY=your_key_here"
    echo "Continuing with dry run mode only..."
else
    echo -e "${GREEN}✅ Helius API key is configured${NC}"
fi

echo ""
echo "${BLUE}Step 3: Build Functions${NC}"
echo "-----------------------------------"

echo "${YELLOW}🔨 Building TypeScript functions...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

echo ""
echo "${BLUE}Step 4: Deploy Test Functions${NC}"
echo "-----------------------------------"

echo "${YELLOW}🚀 Deploying test functions...${NC}"
firebase deploy --only functions:testOneTimeDistribution,functions:manualOneTimeTokenDistribution

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Test deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Test functions deployed successfully${NC}"

echo ""
echo "${BLUE}Step 5: Run Comprehensive Tests${NC}"
echo "-----------------------------------"

# Get the function URL
FUNCTION_URL=$(firebase functions:info | grep testOneTimeDistribution | grep -o 'https://[^[:space:]]*cloudfunctions[^[:space:]]*testOneTimeDistribution' || echo "")

if [ -n "$FUNCTION_URL" ]; then
    echo "${YELLOW}🧪 Running comprehensive tests...${NC}"
    
    # Run the test
    TEST_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{}' \
        "$FUNCTION_URL" || echo '{"error": "Failed to call test function"}')
    
    # Check if test passed
    if echo "$TEST_RESPONSE" | grep -q '"success": true'; then
        echo -e "${GREEN}✅ Comprehensive tests passed${NC}"
    else
        echo -e "${RED}❌ Comprehensive tests failed${NC}"
        echo "Response: $TEST_RESPONSE"
        echo ""
        echo -e "${YELLOW}⚠️  Please review test results before proceeding${NC}"
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Deployment cancelled by user"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Could not determine test function URL${NC}"
    echo "Please run tests manually:"
    echo "curl -X POST https://your-region-your-project.cloudfunctions.net/testOneTimeDistribution -H 'Content-Type: application/json' -d '{}'"
    echo ""
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled by user"
        exit 1
    fi
fi

echo ""
echo "${BLUE}Step 6: Dry Run Test${NC}"
echo "-----------------------------------"

echo "${YELLOW}🧪 Testing dry run mode...${NC}"

# Get manual function URL
MANUAL_URL=$(firebase functions:info | grep manualOneTimeTokenDistribution | grep -o 'https://[^[:space:]]*cloudfunctions[^[:space:]]*manualOneTimeTokenDistribution' || echo "")

if [ -n "$MANUAL_URL" ]; then
    # Test dry run
    DRY_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"dryRun": true}' \
        "$MANUAL_URL" || echo '{"error": "Failed to call manual function"}')
    
    if echo "$DRY_RESPONSE" | grep -q '"success": true'; then
        echo -e "${GREEN}✅ Dry run test completed successfully${NC}"
        
        # Extract some stats from response
        TOTAL_USERS=$(echo "$DRY_RESPONSE" | grep -o '"totalUsers":[0-9]*' | cut -d':' -f2)
        ELIGIBLE_USERS=$(echo "$DRY_RESPONSE" | grep -o '"eligibleUsers":[0-9]*' | cut -d':' -f2)
        
        echo ""
        echo -e "${BLUE}📊 Dry Run Results:${NC}"
        echo "   Total users processed: $TOTAL_USERS"
        echo "   Eligible users: $ELIGIBLE_USERS"
        echo "   Estimated MKIN to distribute: $((ELIGIBLE_USERS * 10000))"
    else
        echo -e "${RED}❌ Dry run test failed${NC}"
        echo "Response: $DRY_RESPONSE"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Could not determine manual function URL${NC}"
    exit 1
fi

echo ""
echo "${BLUE}Step 7: Production Deployment${NC}"
echo "-----------------------------------"

echo -e "${RED}⚠️  PRODUCTION DEPLOYMENT${NC}"
echo "This will deploy the live distribution function that will credit real tokens to users!"
echo ""
read -p "Are you absolutely sure you want to proceed? Type 'DEPLOY' to continue: " -r
echo

if [[ $REPLY != "DEPLOY" ]]; then
    echo "Deployment cancelled - safety measure"
    exit 1
fi

echo "${YELLOW}🚀 Deploying production function...${NC}"
firebase deploy --only functions:oneTimeTokenDistribution

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Production deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Production function deployed successfully${NC}"

echo ""
echo "${BLUE}Step 8: Configure Production Mode${NC}"
echo "-----------------------------------"

echo "${YELLOW}⚙️  Setting production mode...${NC}"
firebase functions:config:set DRY_RUN_MODE=false

echo ""
echo "${BLUE}Step 9: Final Verification${NC}"
echo "-----------------------------------"

echo "${YELLOW}🔍 Verifying deployment...${NC}"
firebase functions:info

echo ""
echo "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Monitor execution at: https://console.firebase.google.com/project/your-project/functions/logs"
echo "2. Check results in Firestore collections:"
echo "   - oneTimeDistribution"
echo "   - transactionHistory"
echo "   - userRewards"
echo ""
echo -e "${YELLOW}⏰ Scheduled for execution: 5:00 UTC tomorrow (6:00 AM Nigeria time)${NC}"
echo ""
echo -e "${GREEN}✅ All done!${NC}"