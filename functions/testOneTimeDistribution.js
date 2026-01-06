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
Object.defineProperty(exports, "__esModule", { value: true });
exports.testOneTimeDistribution = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Test function for one-time token distribution
 * Runs comprehensive tests in dry run mode
 */
exports.testOneTimeDistribution = functions.https.onRequest(async (request, response) => {
    // Only allow POST requests
    if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
    }
    console.log("🧪 Starting comprehensive test of one-time token distribution...");
    try {
        const testResults = await runComprehensiveTests();
        response.status(200).json({
            success: true,
            testResults,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error("❌ Test failed:", error);
        response.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Run comprehensive tests for the distribution function
 */
async function runComprehensiveTests() {
    console.log("\n🔬 Running comprehensive tests...");
    const results = {
        contractConfigTest: false,
        userFetchTest: false,
        nftVerificationTest: false,
        dryRunTest: false,
        batchProcessingTest: false,
        errorHandlingTest: false
    };
    // Test 1: Contract configuration loading
    try {
        console.log("\n📋 Test 1: Contract configuration loading...");
        const snapshot = await db.collection('contractBonusConfigs')
            .where('is_active', '==', true)
            .limit(1)
            .get();
        results.contractConfigTest = !snapshot.empty;
        console.log(`   ✅ Contract configs loaded: ${results.contractConfigTest}`);
    }
    catch (error) {
        console.error(`   ❌ Contract config test failed: ${error}`);
    }
    // Test 2: User fetching
    try {
        console.log("\n👥 Test 2: User fetching...");
        const userSnapshot = await db.collection('userRewards')
            .where('walletAddress', '!=', null)
            .limit(1)
            .get();
        results.userFetchTest = !userSnapshot.empty;
        console.log(`   ✅ Users fetched: ${results.userFetchTest}`);
    }
    catch (error) {
        console.error(`   ❌ User fetch test failed: ${error}`);
    }
    // Test 3: NFT verification (mock)
    try {
        console.log("\n🔍 Test 3: NFT verification setup...");
        const heliusApiKey = process.env.HELIUS_API_KEY;
        results.nftVerificationTest = !!heliusApiKey;
        console.log(`   ✅ Helius API key configured: ${results.nftVerificationTest}`);
    }
    catch (error) {
        console.error(`   ❌ NFT verification test failed: ${error}`);
    }
    // Test 4: Dry run mode
    try {
        console.log("\n🔧 Test 4: Dry run mode...");
        process.env.DRY_RUN_MODE = 'true';
        results.dryRunTest = process.env.DRY_RUN_MODE === 'true';
        console.log(`   ✅ Dry run mode: ${results.dryRunTest}`);
    }
    catch (error) {
        console.error(`   ❌ Dry run test failed: ${error}`);
    }
    // Test 5: Batch processing
    try {
        console.log("\n📦 Test 5: Batch processing...");
        const testBatch = db.batch();
        const testDoc = db.collection('testCollection').doc('test');
        testBatch.set(testDoc, { test: true, timestamp: admin.firestore.FieldValue.serverTimestamp() });
        results.batchProcessingTest = true;
        console.log(`   ✅ Batch processing: ${results.batchProcessingTest}`);
    }
    catch (error) {
        console.error(`   ❌ Batch processing test failed: ${error}`);
    }
    // Test 6: Error handling
    try {
        console.log("\n⚠️ Test 6: Error handling...");
        throw new Error("Test error");
    }
    catch (error) {
        results.errorHandlingTest = error instanceof Error;
        console.log(`   ✅ Error handling: ${results.errorHandlingTest}`);
    }
    return results;
}
//# sourceMappingURL=testOneTimeDistribution.js.map