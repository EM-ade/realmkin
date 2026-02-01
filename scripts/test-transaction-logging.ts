/**
 * Transaction Logging Test Script
 * Tests that all transaction types are properly logged
 * 
 * Usage: npx ts-node scripts/test-transaction-logging.ts
 */

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

const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-123';

const TRANSACTION_TYPES = [
  'withdrawal',
  'transfer',
  'claim',
  'stake',
  'unstake',
  'staking_claim',
  'revenue_share',
] as const;

const TRANSACTION_STATUSES = ['success', 'failed', 'pending'] as const;

async function testTransactionStructure() {
  console.log('\n🧪 Test 1: Transaction Structure Validation');
  console.log('─'.repeat(60));

  const transactionsRef = db.collection(`transactionHistory/${TEST_USER_ID}/transactions`);
  const snapshot = await transactionsRef.limit(1).get();

  if (snapshot.empty) {
    console.log('ℹ️ No transactions found for test user');
    return;
  }

  const firstTx = snapshot.docs[0].data();

  const requiredFields = [
    'type',
    'status',
    'amount',
    'token',
    'timestamp',
  ];

  const optionalFields = [
    'txSignature',
    'recipient',
    'errorCode',
    'errorMessage',
    'technicalError',
    'metadata',
  ];

  console.log('Required fields:');
  requiredFields.forEach(field => {
    const exists = field in firstTx;
    console.log(`  ${exists ? '✅' : '❌'} ${field}: ${exists ? 'Present' : 'MISSING'}`);
  });

  console.log('\nOptional fields:');
  optionalFields.forEach(field => {
    const exists = field in firstTx;
    if (exists) {
      console.log(`  ✓ ${field}: Present`);
    }
  });

  // Validate field types
  console.log('\nField type validation:');
  if (typeof firstTx.amount === 'number') {
    console.log('  ✅ amount: number');
  } else {
    console.log(`  ❌ amount: ${typeof firstTx.amount} (should be number)`);
  }

  if (TRANSACTION_TYPES.includes(firstTx.type)) {
    console.log(`  ✅ type: '${firstTx.type}' (valid)`);
  } else {
    console.log(`  ❌ type: '${firstTx.type}' (invalid)`);
  }

  if (TRANSACTION_STATUSES.includes(firstTx.status)) {
    console.log(`  ✅ status: '${firstTx.status}' (valid)`);
  } else {
    console.log(`  ❌ status: '${firstTx.status}' (invalid)`);
  }
}

async function testTransactionTypesCoverage() {
  console.log('\n🧪 Test 2: Transaction Types Coverage');
  console.log('─'.repeat(60));

  const transactionsRef = db.collection(`transactionHistory/${TEST_USER_ID}/transactions`);

  const typeCounts: Record<string, number> = {};

  for (const type of TRANSACTION_TYPES) {
    const snapshot = await transactionsRef.where('type', '==', type).limit(1).get();
    typeCounts[type] = snapshot.size;
  }

  console.log('Transaction types found:');
  TRANSACTION_TYPES.forEach(type => {
    const count = typeCounts[type];
    const icon = count > 0 ? '✅' : '⚠️';
    console.log(`  ${icon} ${type}: ${count > 0 ? 'Found' : 'Not found'}`);
  });

  const totalTypes = Object.values(typeCounts).filter(c => c > 0).length;
  console.log(`\nCoverage: ${totalTypes}/${TRANSACTION_TYPES.length} types`);
}

async function testErrorHandling() {
  console.log('\n🧪 Test 3: Error Handling');
  console.log('─'.repeat(60));

  const transactionsRef = db.collection(`transactionHistory/${TEST_USER_ID}/transactions`);
  const failedSnapshot = await transactionsRef
    .where('status', '==', 'failed')
    .limit(10)
    .get();

  if (failedSnapshot.empty) {
    console.log('ℹ️ No failed transactions found');
    return;
  }

  console.log(`Found ${failedSnapshot.size} failed transaction(s)\n`);

  let hasErrorMessages = 0;
  let hasErrorCodes = 0;
  let hasTechnicalErrors = 0;

  failedSnapshot.docs.forEach((doc, index) => {
    const tx = doc.data();
    console.log(`Failed Transaction ${index + 1}:`);
    console.log(`  Type: ${tx.type}`);
    console.log(`  Amount: ${tx.amount} ${tx.token}`);

    if (tx.errorMessage) {
      console.log(`  ✅ User Message: ${tx.errorMessage}`);
      hasErrorMessages++;
    } else {
      console.log(`  ❌ User Message: MISSING`);
    }

    if (tx.errorCode) {
      console.log(`  ✅ Error Code: ${tx.errorCode}`);
      hasErrorCodes++;
    }

    if (tx.technicalError) {
      console.log(`  ✅ Technical Error: ${tx.technicalError.slice(0, 50)}...`);
      hasTechnicalErrors++;
    }

    console.log('');
  });

  console.log('Error handling completeness:');
  console.log(`  User-friendly messages: ${hasErrorMessages}/${failedSnapshot.size}`);
  console.log(`  Error codes: ${hasErrorCodes}/${failedSnapshot.size}`);
  console.log(`  Technical errors: ${hasTechnicalErrors}/${failedSnapshot.size}`);
}

async function testTransactionTimestamps() {
  console.log('\n🧪 Test 4: Transaction Timestamps');
  console.log('─'.repeat(60));

  const transactionsRef = db.collection(`transactionHistory/${TEST_USER_ID}/transactions`);
  const snapshot = await transactionsRef
    .orderBy('timestamp', 'desc')
    .limit(5)
    .get();

  if (snapshot.empty) {
    console.log('ℹ️ No transactions found');
    return;
  }

  console.log(`Recent transactions (${snapshot.size}):\n`);

  snapshot.docs.forEach((doc, index) => {
    const tx = doc.data();
    const timestamp = tx.timestamp?.toDate();
    const now = new Date();
    const ageMs = now.getTime() - timestamp.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    console.log(`${index + 1}. ${tx.type} (${tx.status})`);
    console.log(`   ${timestamp.toISOString()}`);
    console.log(`   ${ageHours.toFixed(1)} hours ago`);
  });
}

async function testMetadataStorage() {
  console.log('\n🧪 Test 5: Metadata Storage');
  console.log('─'.repeat(60));

  const transactionsRef = db.collection(`transactionHistory/${TEST_USER_ID}/transactions`);

  // Check different transaction types for metadata
  const typesToCheck = ['stake', 'unstake', 'staking_claim', 'revenue_share'];

  for (const type of typesToCheck) {
    const snapshot = await transactionsRef
      .where('type', '==', type)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log(`${type}: No transactions found`);
      continue;
    }

    const tx = snapshot.docs[0].data();
    console.log(`\n${type}:`);

    if (tx.metadata) {
      console.log(`  ✅ Metadata exists`);
      Object.keys(tx.metadata).forEach(key => {
        console.log(`    - ${key}: ${JSON.stringify(tx.metadata[key]).slice(0, 50)}`);
      });
    } else {
      console.log(`  ⚠️ No metadata`);
    }
  }
}

async function testSearchFunctionality() {
  console.log('\n🧪 Test 6: Search Functionality');
  console.log('─'.repeat(60));

  const transactionsRef = db.collection(`transactionHistory/${TEST_USER_ID}/transactions`);

  // Get a transaction with signature
  const snapshot = await transactionsRef
    .where('status', '==', 'success')
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log('ℹ️ No successful transactions found');
    return;
  }

  const tx = snapshot.docs[0].data();

  if (tx.txSignature) {
    console.log(`Testing search by signature: ${tx.txSignature}`);

    const searchResult = await transactionsRef
      .where('txSignature', '==', tx.txSignature)
      .get();

    if (!searchResult.empty) {
      console.log(`  ✅ Found transaction by signature`);
    } else {
      console.log(`  ❌ Search failed`);
    }
  } else {
    console.log('⚠️ No transaction signature to test search');
  }

  // Test recipient search for transfers
  const transferSnapshot = await transactionsRef
    .where('type', '==', 'transfer')
    .limit(1)
    .get();

  if (!transferSnapshot.empty) {
    const transferTx = transferSnapshot.docs[0].data();
    if (transferTx.recipient) {
      console.log(`\nTesting search by recipient: ${transferTx.recipient.slice(0, 20)}...`);

      const recipientSearch = await transactionsRef
        .where('recipient', '==', transferTx.recipient)
        .get();

      console.log(`  ✅ Found ${recipientSearch.size} transaction(s) to this recipient`);
    }
  }
}

async function testStatistics() {
  console.log('\n🧪 Test 7: Transaction Statistics');
  console.log('─'.repeat(60));

  const transactionsRef = db.collection(`transactionHistory/${TEST_USER_ID}/transactions`);
  const snapshot = await transactionsRef.get();

  if (snapshot.empty) {
    console.log('ℹ️ No transactions found');
    return;
  }

  let totalTransactions = snapshot.size;
  let successCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  let totalWithdrawn = 0;
  let totalTransferred = 0;
  let totalClaimed = 0;
  let totalStaked = 0;

  snapshot.docs.forEach(doc => {
    const tx = doc.data();

    // Status counts
    if (tx.status === 'success') successCount++;
    else if (tx.status === 'failed') failedCount++;
    else if (tx.status === 'pending') pendingCount++;

    // Amount totals (only for successful transactions)
    if (tx.status === 'success') {
      if (tx.type === 'withdrawal') totalWithdrawn += tx.amount;
      else if (tx.type === 'transfer') totalTransferred += tx.amount;
      else if (tx.type === 'claim' || tx.type === 'staking_claim' || tx.type === 'revenue_share') {
        totalClaimed += tx.amount;
      }
      else if (tx.type === 'stake') totalStaked += tx.amount;
    }
  });

  console.log(`Total Transactions: ${totalTransactions}`);
  console.log(`\nBy Status:`);
  console.log(`  ✅ Success: ${successCount} (${((successCount / totalTransactions) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Failed: ${failedCount} (${((failedCount / totalTransactions) * 100).toFixed(1)}%)`);
  console.log(`  ⏳ Pending: ${pendingCount} (${((pendingCount / totalTransactions) * 100).toFixed(1)}%)`);

  console.log(`\nBy Amount (successful only):`);
  console.log(`  Withdrawn: ${totalWithdrawn.toLocaleString()} MKIN`);
  console.log(`  Transferred: ${totalTransferred.toLocaleString()} MKIN`);
  console.log(`  Claimed: ${totalClaimed.toLocaleString()} MKIN`);
  console.log(`  Staked: ${totalStaked.toLocaleString()} MKIN`);
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('🧪 TRANSACTION LOGGING TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Test User: ${TEST_USER_ID}`);
  console.log('='.repeat(80));

  try {
    await testTransactionStructure();
    await testTransactionTypesCoverage();
    await testErrorHandling();
    await testTransactionTimestamps();
    await testMetadataStorage();
    await testSearchFunctionality();
    await testStatistics();

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TRANSACTION LOGGING TESTS COMPLETED');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
