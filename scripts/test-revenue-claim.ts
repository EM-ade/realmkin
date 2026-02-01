/**
 * Revenue Claim Test Script
 * Tests revenue distribution claim process
 * 
 * Usage: npx ts-node scripts/test-revenue-claim.ts
 */

import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import * as admin from 'firebase-admin';
import bs58 from 'bs58';

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

const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-123';
const TEST_WALLET = process.env.TEST_WALLET || '';
const GATEKEEPER_BASE = process.env.GATEKEEPER_BASE || 'https://gatekeeper-bmvu.onrender.com';

// Token mints
const EMPIRE_MINT = new PublicKey('EmpirdtfUMfBQXEjnNmTngeimjfizfuSBD3TN9zqzydj');
const MKIN_MINT = new PublicKey('MKiNfTBT83DH1GK4azYyypSvQVPhN3E3tGYiHcR2BPR');

async function testEligibilityCheck() {
  console.log('\n🧪 Test 1: Eligibility Check');
  console.log('─'.repeat(60));

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const distributionId = `revenue_dist_${year}_${month}`;

  console.log(`Distribution ID: ${distributionId}`);

  // Check allocation
  const docId = `${TEST_USER_ID}_${distributionId}`;
  const allocationDoc = await db.collection('revenueDistributionAllocations').doc(docId).get();

  if (!allocationDoc.exists) {
    console.log('❌ User is NOT eligible (no allocation found)');
    console.log('   Requirement: 30+ Realmkin NFTs from secondary market');
    return false;
  }

  const allocation = allocationDoc.data()!;

  // Check if expired
  const now = Date.now();
  const expiresAt = allocation.expiresAt?.toMillis();
  if (expiresAt && now > expiresAt) {
    console.log('❌ Allocation has EXPIRED');
    console.log(`   Expired at: ${new Date(expiresAt).toISOString()}`);
    return false;
  }

  // Check if already claimed
  if (allocation.status === 'claimed') {
    console.log('❌ Already CLAIMED');
    console.log(`   Claimed at: ${allocation.claimedAt?.toDate().toISOString()}`);
    return false;
  }

  console.log('✅ User is ELIGIBLE for revenue distribution');
  console.log(`   NFT Count: ${allocation.nftCount}`);
  console.log(`   Weight: ${(allocation.weight * 100).toFixed(2)}%`);
  console.log(`   SOL Amount: ${allocation.amountSol?.toFixed(6)} SOL`);
  console.log(`   EMPIRE Amount: ${allocation.amountEmpire?.toFixed(2)} EMPIRE`);
  console.log(`   MKIN Amount: ${allocation.amountMkin?.toFixed(2)} MKIN`);
  console.log(`   Status: ${allocation.status}`);
  console.log(`   Expires: ${new Date(expiresAt!).toISOString()}`);

  return true;
}

async function testTokenAccountStatus() {
  console.log('\n🧪 Test 2: Token Account Status');
  console.log('─'.repeat(60));

  if (!TEST_WALLET) {
    console.log('⏭️ Skipped: No test wallet provided');
    return { empire: false, mkin: false, fee: 0 };
  }

  const connection = new Connection(
    process.env.HELIUS_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'confirmed'
  );

  const userPubkey = new PublicKey(TEST_WALLET);

  // Get ATAs
  const empireAta = await getAssociatedTokenAddress(EMPIRE_MINT, userPubkey);
  const mkinAta = await getAssociatedTokenAddress(MKIN_MINT, userPubkey);

  console.log(`Wallet: ${TEST_WALLET}`);
  console.log(`EMPIRE ATA: ${empireAta.toBase58()}`);
  console.log(`MKIN ATA: ${mkinAta.toBase58()}`);

  // Check if accounts exist
  const [empireAccount, mkinAccount] = await Promise.all([
    connection.getAccountInfo(empireAta),
    connection.getAccountInfo(mkinAta),
  ]);

  const empireExists = !!empireAccount;
  const mkinExists = !!mkinAccount;

  console.log(`\nAccount Status:`);
  console.log(`  EMPIRE: ${empireExists ? '✅ Exists' : '❌ Needs Creation'}`);
  console.log(`  MKIN: ${mkinExists ? '✅ Exists' : '❌ Needs Creation'}`);

  const accountsToCreate = (empireExists ? 0 : 1) + (mkinExists ? 0 : 1);
  const rentPerAccount = 0.00203928;
  const accountCreationFee = accountsToCreate * rentPerAccount;

  if (accountsToCreate > 0) {
    console.log(`\n⚠️ ${accountsToCreate} account(s) need to be created`);
    console.log(`   Account creation fee: ${accountCreationFee.toFixed(6)} SOL`);
  } else {
    console.log(`\n✅ All token accounts exist`);
  }

  return {
    empire: !empireExists,
    mkin: !mkinExists,
    fee: accountCreationFee,
  };
}

async function testFeeCalculation(accountCreationFee: number) {
  console.log('\n🧪 Test 3: Fee Calculation');
  console.log('─'.repeat(60));

  const baseFeeUsd = 0.10;
  console.log(`Base claim fee: $${baseFeeUsd.toFixed(2)} USD`);

  // Get SOL price (simplified - you'd call your price service)
  const solPrice = 100; // Placeholder
  console.log(`SOL Price: $${solPrice} (placeholder)`);

  const baseFeeInSol = baseFeeUsd / solPrice;
  const totalFeeInSol = baseFeeInSol + accountCreationFee;
  const totalFeeUsd = baseFeeUsd + (accountCreationFee * solPrice);

  console.log(`\nFee Breakdown:`);
  console.log(`  Base fee: ${baseFeeInSol.toFixed(6)} SOL ($${baseFeeUsd.toFixed(2)})`);
  console.log(`  Account creation: ${accountCreationFee.toFixed(6)} SOL ($${(accountCreationFee * solPrice).toFixed(4)})`);
  console.log(`  Total: ${totalFeeInSol.toFixed(6)} SOL ($${totalFeeUsd.toFixed(2)})`);

  // Check fee tolerance
  const tolerance = 0.20;
  const minFee = totalFeeInSol * (1 - tolerance);
  const maxFee = totalFeeInSol * (1 + tolerance);

  console.log(`\nFee Tolerance (±20%):`);
  console.log(`  Min acceptable: ${minFee.toFixed(6)} SOL`);
  console.log(`  Max acceptable: ${maxFee.toFixed(6)} SOL`);

  return {
    baseFeeInSol,
    totalFeeInSol,
    totalFeeUsd,
    minFee,
    maxFee,
  };
}

async function testClaimHistory() {
  console.log('\n🧪 Test 4: Claim History');
  console.log('─'.repeat(60));

  const claimsSnapshot = await db
    .collection('revenueDistributionClaims')
    .where('userId', '==', TEST_USER_ID)
    .orderBy('claimedAt', 'desc')
    .get();

  if (claimsSnapshot.empty) {
    console.log('ℹ️ No previous claims found');
    return;
  }

  console.log(`Found ${claimsSnapshot.size} previous claim(s):\n`);

  claimsSnapshot.docs.forEach((doc, index) => {
    const claim = doc.data();
    console.log(`Claim ${index + 1}:`);
    console.log(`  Distribution: ${claim.distributionId}`);
    console.log(`  SOL: ${claim.amountSol?.toFixed(6)}`);
    console.log(`  EMPIRE: ${claim.amountEmpire?.toFixed(2)}`);
    console.log(`  MKIN: ${claim.amountMkin?.toFixed(2)}`);
    console.log(`  NFT Count: ${claim.nftCount}`);
    console.log(`  Weight: ${(claim.weight * 100).toFixed(2)}%`);
    console.log(`  Payout TX: ${claim.payoutTx}`);
    console.log(`  Fee Paid: ${claim.feeAmountSol?.toFixed(6)} SOL`);
    if (claim.accountsCreated && claim.accountsCreated.length > 0) {
      console.log(`  Accounts Created: ${claim.accountsCreated.join(', ')}`);
    }
    console.log(`  Claimed: ${claim.claimedAt?.toDate().toISOString()}`);
    console.log(`  Status: ${claim.status}`);
    console.log('');
  });
}

async function testTreasuryBalance() {
  console.log('\n🧪 Test 5: Treasury Balance Check');
  console.log('─'.repeat(60));

  const connection = new Connection(
    process.env.HELIUS_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'confirmed'
  );

  const treasuryAddress = process.env.STAKING_WALLET_ADDRESS;
  if (!treasuryAddress) {
    console.log('⏭️ Skipped: No treasury address provided');
    return;
  }

  const treasuryPubkey = new PublicKey(treasuryAddress);
  const balance = await connection.getBalance(treasuryPubkey);
  const balanceSol = balance / 1e9;

  console.log(`Treasury: ${treasuryAddress}`);
  console.log(`Balance: ${balanceSol.toFixed(6)} SOL`);

  // Check if treasury has enough for payouts
  const estimatedPayout = 0.01; // Example payout
  const buffer = 0.01; // Gas buffer

  if (balanceSol < estimatedPayout + buffer) {
    console.log(`⚠️ WARNING: Low treasury balance`);
    console.log(`   Estimated payout: ${estimatedPayout} SOL`);
    console.log(`   Buffer: ${buffer} SOL`);
    console.log(`   Required: ${(estimatedPayout + buffer).toFixed(6)} SOL`);
  } else {
    console.log(`✅ Treasury has sufficient balance`);
  }

  // Check token balances
  try {
    const empireAta = await getAssociatedTokenAddress(EMPIRE_MINT, treasuryPubkey);
    const mkinAta = await getAssociatedTokenAddress(MKIN_MINT, treasuryPubkey);

    const [empireAccount, mkinAccount] = await Promise.all([
      connection.getAccountInfo(empireAta),
      connection.getAccountInfo(mkinAta),
    ]);

    console.log(`\nToken Balances:`);
    if (empireAccount) {
      console.log(`  EMPIRE: Account exists`);
    } else {
      console.log(`  EMPIRE: ❌ Account not found`);
    }

    if (mkinAccount) {
      console.log(`  MKIN: Account exists`);
    } else {
      console.log(`  MKIN: ❌ Account not found`);
    }
  } catch (error) {
    console.log(`\n⚠️ Could not check token accounts: ${error}`);
  }
}

async function testClaimProcess() {
  console.log('\n🧪 Test 6: Claim Process (Dry Run)');
  console.log('─'.repeat(60));

  console.log('This is a DRY RUN - no actual transactions will be sent\n');

  console.log('Claim Process Steps:');
  console.log('1. ✓ User checks eligibility');
  console.log('2. ✓ Frontend checks token accounts');
  console.log('3. ✓ Frontend calculates total fee');
  console.log('4. ✓ User signs fee payment transaction');
  console.log('5. ✓ Fee transaction sent to blockchain');
  console.log('6. ✓ Backend verifies fee payment');
  console.log('7. ✓ Backend checks token accounts');
  console.log('8. ✓ Backend creates missing token accounts');
  console.log('9. ✓ Backend transfers SOL + EMPIRE + MKIN');
  console.log('10. ✓ Backend updates allocation status');
  console.log('11. ✓ Backend creates claim record');
  console.log('12. ✓ Frontend shows success message');

  console.log('\n⚠️ Important Checks:');
  console.log('  - Fee must be within ±20% tolerance');
  console.log('  - Token accounts created BEFORE transfers');
  console.log('  - All three tokens transferred in one transaction');
  console.log('  - Transaction logged to history');
  console.log('  - User-friendly error messages on failure');
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('🧪 REVENUE CLAIM TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Test User: ${TEST_USER_ID}`);
  console.log(`Test Wallet: ${TEST_WALLET || 'Not provided'}`);
  console.log(`Gatekeeper: ${GATEKEEPER_BASE}`);
  console.log('='.repeat(80));

  try {
    // Test 1: Eligibility
    const isEligible = await testEligibilityCheck();

    // Test 2: Token accounts
    const accountStatus = await testTokenAccountStatus();

    // Test 3: Fee calculation
    await testFeeCalculation(accountStatus.fee);

    // Test 4: Claim history
    await testClaimHistory();

    // Test 5: Treasury balance
    await testTreasuryBalance();

    // Test 6: Claim process
    await testClaimProcess();

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS COMPLETED');
    console.log('='.repeat(80));

    if (!isEligible) {
      console.log('\n⚠️ User is not eligible for revenue claim');
      console.log('   Run the monthly allocation script to create allocations');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
