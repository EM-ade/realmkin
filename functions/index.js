const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Import the auto claim function
const { autoClaimRewards, autoClaimForUser } = require('./autoClaimRewards');

// Enhanced scheduled functions with multiple frequencies
// Run every 6 hours (more frequent claiming)
exports.scheduledAutoClaimFrequent = functions.pubsub.schedule('0 */6 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('🤖 Starting frequent auto claim rewards (every 6 hours)...');
      const result = await autoClaimRewards();
      console.log('✅ Frequent auto claim completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in frequent auto claim:', error);
      throw error;
    }
  });

// Daily comprehensive claim (original schedule)
exports.scheduledAutoClaimDaily = functions.pubsub.schedule('0 2 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('🤖 Starting daily comprehensive auto claim rewards...');
      const result = await autoClaimRewards();
      console.log('✅ Daily auto claim completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in daily auto claim:', error);
      throw error;
    }
  });

// HTTP endpoint for manual triggering (optional)
exports.manualAutoClaim = functions.https.onRequest(async (request, response) => {
  try {
    console.log('🤖 Starting manual auto claim rewards...');
    const result = await autoClaimRewards();
    console.log('✅ Manual auto claim completed:', result);
    response.status(200).json(result);
  } catch (error) {
    console.error('❌ Error in manual auto claim:', error);
    response.status(500).json({ error: error.message });
  }
});

// New endpoint for user-specific auto-claiming (can be called from frontend)
exports.autoClaimForUser = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const { walletAddress } = data;

  try {
    console.log(`🤖 Starting auto claim for user: ${userId}`);
    const result = await autoClaimForUser(userId, walletAddress);
    console.log(`✅ Auto claim for user ${userId} completed:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error in auto claim for user ${userId}:`, error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Export for testing
exports.autoClaimRewards = autoClaimRewards;
exports.autoClaimForUser = autoClaimForUser;
