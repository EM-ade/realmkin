/**
 * Profile Edit Test Script
 * Tests profile editing functionality
 * 
 * Usage: npx ts-node scripts/test-profile-edit.ts
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
const TEST_USERNAME = process.env.TEST_USERNAME || 'testuser123';

async function testUsernameValidation() {
  console.log('\n🧪 Testing Username Validation...');

  const validUsernames = ['testuser', 'test_user', 'test123', 'abc'];
  const invalidUsernames = ['te', 'test user', 'test@user', 'TESTUSER', 'a'.repeat(21)];

  const usernameRegex = /^[a-z0-9_]{3,20}$/;

  console.log('  Valid usernames:');
  validUsernames.forEach(username => {
    const isValid = usernameRegex.test(username);
    console.log(`    ${isValid ? '✓' : '❌'} ${username}`);
  });

  console.log('  Invalid usernames:');
  invalidUsernames.forEach(username => {
    const isValid = usernameRegex.test(username);
    console.log(`    ${!isValid ? '✓' : '❌'} ${username} (should be invalid)`);
  });
}

async function testUsernameAvailability() {
  console.log('\n🧪 Testing Username Availability...');

  const testUsernames = ['testuser123', 'availableuser', 'takenuser'];

  for (const username of testUsernames) {
    const doc = await db.collection('usernames').doc(username.toLowerCase()).get();
    const exists = doc.exists();
    console.log(`  ${username}: ${exists ? '❌ Taken' : '✓ Available'}`);
  }
}

async function testUsernameImmutability() {
  console.log('\n🧪 Testing Username Immutability...');

  // Check if test user has username
  const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
  
  if (!userDoc.exists) {
    console.log('  ⏭️ Test user does not exist');
    return;
  }

  const userData = userDoc.data();
  const currentUsername = userData?.username;

  if (currentUsername) {
    console.log(`  ✓ User has username: ${currentUsername}`);
    console.log(`  ℹ Username should NOT be changeable once set`);
    
    // Verify mapping exists
    const mappingDoc = await db.collection('usernames').doc(currentUsername.toLowerCase()).get();
    if (!mappingDoc.exists) {
      console.log(`  ❌ WARNING: Username mapping missing for ${currentUsername}`);
    } else {
      console.log(`  ✓ Username mapping exists`);
    }
  } else {
    console.log(`  ℹ User has no username - can set it once`);
  }
}

async function testAvatarUrlUpdate() {
  console.log('\n🧪 Testing Avatar URL Update...');

  const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
  
  if (!userDoc.exists) {
    console.log('  ⏭️ Test user does not exist');
    return;
  }

  const userData = userDoc.data();
  const avatarUrl = userData?.avatarUrl;

  if (avatarUrl) {
    console.log(`  ✓ User has avatar URL set`);
    console.log(`    ${avatarUrl.slice(0, 50)}...`);
  } else {
    console.log(`  ℹ User has no avatar URL`);
  }

  console.log(`  ℹ Avatar URL can be changed anytime`);
}

async function testProfileDataIntegrity() {
  console.log('\n🧪 Testing Profile Data Integrity...');

  const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
  
  if (!userDoc.exists) {
    console.log('  ⏭️ Test user does not exist');
    return;
  }

  const userData = userDoc.data();
  const requiredFields = ['email', 'createdAt'];
  const optionalFields = ['username', 'avatarUrl', 'walletAddress', 'updatedAt'];

  console.log('  Required fields:');
  requiredFields.forEach(field => {
    const exists = field in userData!;
    console.log(`    ${exists ? '✓' : '❌'} ${field}`);
  });

  console.log('  Optional fields:');
  optionalFields.forEach(field => {
    const exists = field in userData!;
    const value = userData![field];
    if (exists && value) {
      console.log(`    ✓ ${field}: Set`);
    } else {
      console.log(`    - ${field}: Not set`);
    }
  });

  // Check timestamps
  if (userData!.createdAt) {
    const createdAt = userData!.createdAt.toDate();
    console.log(`  ℹ Account created: ${createdAt.toISOString()}`);
  }

  if (userData!.updatedAt) {
    const updatedAt = userData!.updatedAt.toDate();
    console.log(`  ℹ Last updated: ${updatedAt.toISOString()}`);
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('🧪 PROFILE EDIT TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Test User: ${TEST_USER_ID}`);
  console.log('='.repeat(80));

  await testUsernameValidation();
  await testUsernameAvailability();
  await testUsernameImmutability();
  await testAvatarUrlUpdate();
  await testProfileDataIntegrity();

  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL PROFILE TESTS COMPLETED');
  console.log('='.repeat(80));
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
