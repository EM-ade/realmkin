/**
 * Account Page Test Script
 * Tests all Account page functionality
 * 
 * Usage: npx ts-node scripts/test-account-page.ts
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// Test configuration
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-123';
const TEST_WALLET = process.env.TEST_WALLET || '';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message?: string;
  duration?: number;
}

const results: TestResult[] = [];

/**
 * Test 1: Username System
 */
async function testUsernameSystem(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    console.log('\n🧪 Testing Username System...');

    // Test 1.1: Check if username exists
    const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
    if (!userDoc.exists) {
      return {
        name: 'Username System',
        status: 'SKIP',
        message: 'Test user does not exist',
      };
    }

    const userData = userDoc.data();
    const username = userData?.username;

    if (username) {
      console.log(`  ✓ User has username: ${username}`);

      // Test 1.2: Verify username mapping exists
      const usernameDoc = await db.collection('usernames').doc(username.toLowerCase()).get();
      if (!usernameDoc.exists) {
        return {
          name: 'Username System',
          status: 'FAIL',
          message: `Username mapping not found for ${username}`,
          duration: Date.now() - startTime,
        };
      }

      const mappedUid = usernameDoc.data()?.uid;
      if (mappedUid !== TEST_USER_ID) {
        return {
          name: 'Username System',
          status: 'FAIL',
          message: `Username mapping mismatch: expected ${TEST_USER_ID}, got ${mappedUid}`,
          duration: Date.now() - startTime,
        };
      }

      console.log(`  ✓ Username mapping verified`);
    } else {
      console.log(`  ℹ User has no username set`);
    }

    return {
      name: 'Username System',
      status: 'PASS',
      message: username ? `Username: ${username}` : 'No username set',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: 'Username System',
      status: 'FAIL',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 2: Transaction History
 */
async function testTransactionHistory(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    console.log('\n🧪 Testing Transaction History...');

    // Get transaction history
    const transactionsRef = db.collection(`transactionHistory/${TEST_USER_ID}/transactions`);
    const snapshot = await transactionsRef.orderBy('timestamp', 'desc').limit(10).get();

    console.log(`  ✓ Found ${snapshot.size} transactions`);

    // Check transaction structure
    if (snapshot.size > 0) {
      const firstTx = snapshot.docs[0].data();
      const requiredFields = ['type', 'status', 'amount', 'token', 'timestamp'];
      const missingFields = requiredFields.filter(field => !(field in firstTx));

      if (missingFields.length > 0) {
        return {
          name: 'Transaction History',
          status: 'FAIL',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          duration: Date.now() - startTime,
        };
      }

      // Count by status
      let success = 0, failed = 0, pending = 0;
      snapshot.docs.forEach(doc => {
        const status = doc.data().status;
        if (status === 'success') success++;
        else if (status === 'failed') failed++;
        else if (status === 'pending') pending++;
      });

      console.log(`  ✓ Success: ${success}, Failed: ${failed}, Pending: ${pending}`);

      // Check error messages on failed transactions
      const failedTxs = snapshot.docs.filter(doc => doc.data().status === 'failed');
      if (failedTxs.length > 0) {
        const hasErrorMessages = failedTxs.every(doc => doc.data().errorMessage);
        if (!hasErrorMessages) {
          return {
            name: 'Transaction History',
            status: 'FAIL',
            message: 'Some failed transactions missing error messages',
            duration: Date.now() - startTime,
          };
        }
        console.log(`  ✓ All failed transactions have error messages`);
      }
    }

    return {
      name: 'Transaction History',
      status: 'PASS',
      message: `${snapshot.size} transactions logged`,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: 'Transaction History',
      status: 'FAIL',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 3: Revenue Distribution Eligibility
 */
async function testRevenueEligibility(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    console.log('\n🧪 Testing Revenue Distribution Eligibility...');

    // Get current distribution ID
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const distributionId = `revenue_dist_${year}_${month}`;

    console.log(`  Distribution ID: ${distributionId}`);

    // Check allocation
    const docId = `${TEST_USER_ID}_${distributionId}`;
    const allocationDoc = await db.collection('revenueDistributionAllocations').doc(docId).get();

    if (!allocationDoc.exists) {
      return {
        name: 'Revenue Distribution',
        status: 'PASS',
        message: 'Not eligible (no allocation)',
        duration: Date.now() - startTime,
      };
    }

    const allocation = allocationDoc.data();
    console.log(`  ✓ Allocation found`);
    console.log(`    - NFT Count: ${allocation?.nftCount}`);
    console.log(`    - Weight: ${(allocation?.weight * 100).toFixed(2)}%`);
    console.log(`    - SOL: ${allocation?.amountSol?.toFixed(6)}`);
    console.log(`    - EMPIRE: ${allocation?.amountEmpire?.toFixed(2)}`);
    console.log(`    - MKIN: ${allocation?.amountMkin?.toFixed(2)}`);
    console.log(`    - Status: ${allocation?.status}`);

    // Verify required fields
    const requiredFields = ['amountSol', 'amountEmpire', 'amountMkin', 'nftCount', 'weight'];
    const missingFields = requiredFields.filter(field => !(field in allocation!));

    if (missingFields.length > 0) {
      return {
        name: 'Revenue Distribution',
        status: 'FAIL',
        message: `Missing fields: ${missingFields.join(', ')}`,
        duration: Date.now() - startTime,
      };
    }

    return {
      name: 'Revenue Distribution',
      status: 'PASS',
      message: `Eligible for ${allocation?.amountSol?.toFixed(6)} SOL + tokens`,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: 'Revenue Distribution',
      status: 'FAIL',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 4: Token Account Checking
 */
async function testTokenAccountChecking(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    console.log('\n🧪 Testing Token Account Checking...');

    if (!TEST_WALLET) {
      return {
        name: 'Token Account Checking',
        status: 'SKIP',
        message: 'No test wallet provided',
      };
    }

    const connection = new Connection(
      process.env.HELIUS_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    const { getAssociatedTokenAddress } = await import('@solana/spl-token');

    const userPubkey = new PublicKey(TEST_WALLET);
    const empireMint = new PublicKey('EmpirdtfUMfBQXEjnNmTngeimjfizfuSBD3TN9zqzydj');
    const mkinMint = new PublicKey('MKiNfTBT83DH1GK4azYyypSvQVPhN3E3tGYiHcR2BPR');

    const empireAta = await getAssociatedTokenAddress(empireMint, userPubkey);
    const mkinAta = await getAssociatedTokenAddress(mkinMint, userPubkey);

    console.log(`  Checking wallet: ${TEST_WALLET.slice(0, 8)}...`);
    console.log(`  EMPIRE ATA: ${empireAta.toBase58()}`);
    console.log(`  MKIN ATA: ${mkinAta.toBase58()}`);

    const [empireAccount, mkinAccount] = await Promise.all([
      connection.getAccountInfo(empireAta),
      connection.getAccountInfo(mkinAta),
    ]);

    const empireExists = !!empireAccount;
    const mkinExists = !!mkinAccount;

    console.log(`  EMPIRE Account: ${empireExists ? '✓ Exists' : '❌ Missing'}`);
    console.log(`  MKIN Account: ${mkinExists ? '✓ Exists' : '❌ Missing'}`);

    const accountsNeeded = (empireExists ? 0 : 1) + (mkinExists ? 0 : 1);
    const accountCreationFee = accountsNeeded * 0.00203928;

    if (accountsNeeded > 0) {
      console.log(`  ℹ Would need to create ${accountsNeeded} account(s)`);
      console.log(`  ℹ Additional fee: ${accountCreationFee.toFixed(6)} SOL`);
    }

    return {
      name: 'Token Account Checking',
      status: 'PASS',
      message: `EMPIRE: ${empireExists ? 'Yes' : 'No'}, MKIN: ${mkinExists ? 'Yes' : 'No'}`,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: 'Token Account Checking',
      status: 'FAIL',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 5: Mining Rate Calculation
 */
async function testMiningRate(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    console.log('\n🧪 Testing Mining Rate Calculation...');

    const userRewardsDoc = await db.collection('userRewards').doc(TEST_USER_ID).get();

    if (!userRewardsDoc.exists) {
      return {
        name: 'Mining Rate',
        status: 'SKIP',
        message: 'User rewards not found',
      };
    }

    const data = userRewardsDoc.data();
    const weeklyRate = data?.weeklyRate || 0;
    const totalRealmkin = data?.totalRealmkin || 0;
    const totalNFTs = data?.totalNFTs || 0;

    console.log(`  ✓ Weekly Rate: ${weeklyRate} MKIN/week`);
    console.log(`  ✓ Total Mined: ${totalRealmkin} MKIN`);
    console.log(`  ✓ NFT Count: ${totalNFTs}`);

    // Calculate level
    const level = Math.min(50, Math.floor(weeklyRate / 10) + 1);
    console.log(`  ✓ Calculated Level: ${level}`);

    return {
      name: 'Mining Rate',
      status: 'PASS',
      message: `${weeklyRate} MKIN/week (Level ${level})`,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: 'Mining Rate',
      status: 'FAIL',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 6: Leaderboard Data
 */
async function testLeaderboard(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    console.log('\n🧪 Testing Leaderboard...');

    // Get top 3 miners by weekly rate
    const snapshot = await db
      .collection('userRewards')
      .orderBy('weeklyRate', 'desc')
      .limit(3)
      .get();

    console.log(`  ✓ Found ${snapshot.size} top miners`);

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  ${index + 1}. ${doc.id} - ${data.weeklyRate} MKIN/week`);
    });

    if (snapshot.size === 0) {
      return {
        name: 'Leaderboard',
        status: 'FAIL',
        message: 'No users with mining rate found',
        duration: Date.now() - startTime,
      };
    }

    return {
      name: 'Leaderboard',
      status: 'PASS',
      message: `${snapshot.size} miners ranked by rate`,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: 'Leaderboard',
      status: 'FAIL',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('='.repeat(80));
  console.log('🧪 ACCOUNT PAGE TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Test User: ${TEST_USER_ID}`);
  console.log(`Test Wallet: ${TEST_WALLET || 'Not provided'}`);
  console.log('='.repeat(80));

  const tests = [
    testUsernameSystem,
    testTransactionHistory,
    testRevenueEligibility,
    testTokenAccountChecking,
    testMiningRate,
    testLeaderboard,
  ];

  for (const test of tests) {
    const result = await test();
    results.push(result);
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  results.forEach((result) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.name}${duration}`);
    if (result.message) {
      console.log(`   ${result.message}`);
    }
  });

  console.log('='.repeat(80));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log('='.repeat(80));

  // Exit with error code if any tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
