"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualOneTimeTokenDistribution = exports.oneTimeTokenDistribution = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const db = admin.firestore();
// Configuration
const DISTRIBUTION_AMOUNT = 10000; // 10,000 MKIN tokens
const DISTRIBUTION_ID = "one_time_mkin_distribution_2025_01_05";
const BATCH_SIZE = 500; // Firestore batch limit
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
// Calculate tomorrow's date at 5:00 UTC (6:00 AM Nigeria time)
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setUTCHours(5, 0, 0, 0); // 5:00 UTC
const SCHEDULE_DATE = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
/**
 * Main scheduled function for one-time token distribution
 * Runs at 5:00 UTC (6:00 AM Nigeria time) on the specified date
 */
exports.oneTimeTokenDistribution = functions.scheduler.onSchedule({
    schedule: `0 5 ${SCHEDULE_DATE.split('-')[2]} ${SCHEDULE_DATE.split('-')[1]} *`, // At 5:00 UTC on specific date
    timeZone: "UTC"
}, async (context) => {
    console.log("🚀 Starting one-time token distribution...");
    console.log(`📅 Scheduled time: ${context.scheduleTime}`);
    console.log(`🆔 Distribution ID: ${DISTRIBUTION_ID}`);
    const isDryRun = process.env.DRY_RUN_MODE === 'true';
    console.log(`🔧 Dry run mode: ${isDryRun ? 'ENABLED' : 'DISABLED'}`);
    try {
        // Check if this distribution has already been completed
        const alreadyCompleted = await checkDistributionCompleted();
        if (alreadyCompleted) {
            console.log("✅ Distribution already completed, skipping...");
            return;
        }
        // Execute distribution
        const result = await executeDistribution(isDryRun);
        // Log final results
        console.log("\n📊 DISTRIBUTION SUMMARY:");
        console.log(`   Total users processed: ${result.totalUsers}`);
        console.log(`   Users with MKIN NFTs: ${result.eligibleUsers}`);
        console.log(`   Successful distributions: ${result.successfulDistributions}`);
        console.log(`   Failed distributions: ${result.failedDistributions}`);
        console.log(`   Total MKIN distributed: ${result.totalTokensDistributed}`);
        if (!isDryRun && result.successfulDistributions > 0) {
            console.log("✅ One-time token distribution completed successfully!");
        }
        return; // Return void as expected by scheduler
    }
    catch (error) {
        console.error("❌ Fatal error in one-time token distribution:", error);
        throw error;
    }
});
/**
 * Manual trigger endpoint for testing the distribution
 */
exports.manualOneTimeTokenDistribution = functions.https.onRequest(async (request, response) => {
    // Only allow POST requests
    if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const isDryRun = request.body?.dryRun !== false;
    console.log("🧪 Manual one-time token distribution triggered");
    console.log(`🔧 Dry run mode: ${isDryRun ? 'ENABLED' : 'DISABLED'}`);
    try {
        const result = await executeDistribution(isDryRun);
        response.status(200).json({
            success: true,
            distributionId: DISTRIBUTION_ID,
            dryRun: isDryRun,
            ...result
        });
    }
    catch (error) {
        console.error("❌ Error in manual distribution:", error);
        response.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Core distribution logic
 */
async function executeDistribution(isDryRun) {
    const result = {
        totalUsers: 0,
        eligibleUsers: 0,
        successfulDistributions: 0,
        failedDistributions: 0,
        totalTokensDistributed: 0,
        errors: []
    };
    // Step 1: Load active contract configurations
    console.log("\n📋 Step 1: Loading active contract configurations...");
    const activeContracts = await loadActiveContractConfigs();
    console.log(`   Found ${activeContracts.length} active contracts`);
    if (activeContracts.length === 0) {
        throw new Error("No active contract configurations found");
    }
    // Step 2: Get all users with wallet addresses
    console.log("\n👥 Step 2: Fetching all users with wallet addresses...");
    const allUsers = await getAllUsersWithWallets();
    result.totalUsers = allUsers.length;
    console.log(`   Found ${allUsers.length} users with wallet addresses`);
    // Step 3: Process users in batches
    console.log("\n💰 Step 3: Processing users for token distribution...");
    for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
        const batch = allUsers.slice(i, i + BATCH_SIZE);
        console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allUsers.length / BATCH_SIZE)} (${batch.length} users)`);
        const batchResult = await processUserBatch(batch, activeContracts, isDryRun);
        // Aggregate results
        result.eligibleUsers += batchResult.eligibleUsers;
        result.successfulDistributions += batchResult.successfulDistributions;
        result.failedDistributions += batchResult.failedDistributions;
        result.totalTokensDistributed += batchResult.totalTokensDistributed;
        result.errors.push(...batchResult.errors);
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < allUsers.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return result;
}
/**
 * Load active contract configurations from Firestore
 */
async function loadActiveContractConfigs() {
    try {
        const snapshot = await db.collection('contractBonusConfigs')
            .where('is_active', '==', true)
            .get();
        const contracts = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const contractAddress = doc.id || data.contract_address;
            if (contractAddress) {
                contracts.push(contractAddress.toLowerCase());
            }
        });
        console.log("   Active contracts:", contracts);
        return contracts;
    }
    catch (error) {
        console.error("Error loading contract configs:", error);
        throw new Error(`Failed to load contract configurations: ${error}`);
    }
}
/**
 * Get all users with wallet addresses
 */
async function getAllUsersWithWallets() {
    try {
        const snapshot = await db.collection('userRewards')
            .where('walletAddress', '!=', null)
            .where('walletAddress', '!=', '')
            .get();
        const users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            users.push({
                userId: doc.id,
                walletAddress: data.walletAddress,
                totalNFTs: data.totalNFTs || 0,
                totalRealmkin: data.totalRealmkin || 0,
                updatedAt: data.updatedAt
            });
        });
        return users;
    }
    catch (error) {
        console.error("Error fetching users:", error);
        throw new Error(`Failed to fetch users: ${error}`);
    }
}
/**
 * Process a batch of users
 */
async function processUserBatch(users, activeContracts, isDryRun) {
    const result = {
        eligibleUsers: 0,
        successfulDistributions: 0,
        failedDistributions: 0,
        totalTokensDistributed: 0,
        errors: []
    };
    if (!isDryRun) {
        // Process in Firestore transaction for atomicity
        const batch = db.batch();
        for (const user of users) {
            try {
                const userResult = await processUser(user, activeContracts, isDryRun);
                if (userResult.isEligible) {
                    result.eligibleUsers++;
                    if (!isDryRun) {
                        // Update user balance
                        const userRef = db.collection('userRewards').doc(user.userId);
                        batch.update(userRef, {
                            totalRealmkin: admin.firestore.FieldValue.increment(DISTRIBUTION_AMOUNT),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        // Create transaction record
                        const transactionRef = db.collection('transactionHistory').doc();
                        const transactionData = {
                            userId: user.userId,
                            walletAddress: user.walletAddress,
                            type: 'distribution',
                            amount: DISTRIBUTION_AMOUNT,
                            description: `One-time MKIN distribution (${DISTRIBUTION_ID})`,
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        };
                        batch.set(transactionRef, transactionData);
                        // Create distribution record
                        const distributionRef = db.collection('oneTimeDistribution').doc();
                        const distributionData = {
                            userId: user.userId,
                            walletAddress: user.walletAddress,
                            amount: DISTRIBUTION_AMOUNT,
                            nftCount: userResult.nftCount,
                            distributionId: DISTRIBUTION_ID,
                            status: 'completed',
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            completedAt: admin.firestore.FieldValue.serverTimestamp()
                        };
                        batch.set(distributionRef, distributionData);
                        result.successfulDistributions++;
                        result.totalTokensDistributed += DISTRIBUTION_AMOUNT;
                    }
                    else {
                        console.log(`   ✅ ${user.userId}: Eligible for ${DISTRIBUTION_AMOUNT} MKIN (${userResult.nftCount} NFTs)`);
                        result.successfulDistributions++;
                        result.totalTokensDistributed += DISTRIBUTION_AMOUNT;
                    }
                }
                else {
                    console.log(`   ⏭️  ${user.userId}: Not eligible (${userResult.reason})`);
                }
            }
            catch (error) {
                const errorMsg = `Failed to process user ${user.userId}: ${error}`;
                console.error(`   ❌ ${errorMsg}`);
                result.errors.push(errorMsg);
                result.failedDistributions++;
            }
        }
        if (!isDryRun) {
            // Commit batch
            await batch.commit();
            console.log(`   ✅ Batch committed: ${result.successfulDistributions} distributions`);
        }
    }
    else {
        // Dry run mode - just log what would happen
        for (const user of users) {
            try {
                const userResult = await processUser(user, activeContracts, isDryRun);
                if (userResult.isEligible) {
                    result.eligibleUsers++;
                    console.log(`   ✅ ${user.userId}: Would receive ${DISTRIBUTION_AMOUNT} MKIN (${userResult.nftCount} NFTs)`);
                    result.successfulDistributions++;
                    result.totalTokensDistributed += DISTRIBUTION_AMOUNT;
                }
                else {
                    console.log(`   ⏭️  ${user.userId}: Not eligible (${userResult.reason})`);
                }
            }
            catch (error) {
                const errorMsg = `Failed to process user ${user.userId}: ${error}`;
                console.error(`   ❌ ${errorMsg}`);
                result.errors.push(errorMsg);
                result.failedDistributions++;
            }
        }
    }
    return result;
}
/**
 * Process individual user - verify NFT ownership
 */
async function processUser(user, activeContracts, isDryRun) {
    try {
        // Check if user already received this distribution
        if (!isDryRun) {
            const existingDistribution = await db.collection('oneTimeDistribution')
                .where('userId', '==', user.userId)
                .where('distributionId', '==', DISTRIBUTION_ID)
                .where('status', '==', 'completed')
                .get();
            if (!existingDistribution.empty) {
                return { isEligible: false, nftCount: 0, reason: 'Already received distribution' };
            }
        }
        // Verify NFT ownership using Helius API
        const nftCount = await verifyNFTOwnership(user.walletAddress, activeContracts);
        if (nftCount > 0) {
            return { isEligible: true, nftCount };
        }
        else {
            return { isEligible: false, nftCount: 0, reason: 'No MKIN NFTs found' };
        }
    }
    catch (error) {
        throw new Error(`User processing failed: ${error}`);
    }
}
/**
 * Verify NFT ownership using Helius API
 */
async function verifyNFTOwnership(walletAddress, activeContracts) {
    if (!walletAddress || !activeContracts.length) {
        return 0;
    }
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) {
        throw new Error('HELIUS_API_KEY environment variable not set');
    }
    try {
        const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
        let allNFTs = [];
        let page = 1;
        let hasMore = true;
        const limit = 1000;
        while (hasMore) {
            const response = await axios_1.default.post(rpcUrl, {
                jsonrpc: '2.0',
                id: 'nft-verification',
                method: 'getAssetsByOwner',
                params: {
                    ownerAddress: walletAddress,
                    page: page,
                    limit: limit,
                    displayOptions: {
                        showFungible: false,
                        showNativeBalance: false,
                        showInscription: false,
                    },
                },
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 30000, // 30 second timeout
            });
            if (response.data.error) {
                throw new Error(`Helius API error: ${response.data.error.message}`);
            }
            const items = response.data.result?.items || [];
            allNFTs = allNFTs.concat(items);
            // Check if there are more pages
            hasMore = items.length === limit;
            if (hasMore) {
                page++;
                // Small delay between pages to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        // Filter NFTs by active contracts
        const filteredNFTs = allNFTs.filter(nft => {
            const collectionAddress = nft.grouping?.find(group => group.group_key === 'collection')?.group_value?.toLowerCase();
            return collectionAddress && activeContracts.includes(collectionAddress);
        });
        return filteredNFTs.length;
    }
    catch (error) {
        console.error(`Error verifying NFT ownership for ${walletAddress}:`, error);
        throw new Error(`NFT verification failed: ${error}`);
    }
}
/**
 * Check if this distribution has already been completed
 */
async function checkDistributionCompleted() {
    try {
        const snapshot = await db.collection('oneTimeDistribution')
            .where('distributionId', '==', DISTRIBUTION_ID)
            .where('status', '==', 'completed')
            .limit(1)
            .get();
        return !snapshot.empty;
    }
    catch (error) {
        console.error("Error checking distribution completion:", error);
        return false;
    }
}
//# sourceMappingURL=oneTimeTokenDistribution.js.map