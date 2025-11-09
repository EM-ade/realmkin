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
exports.migrateStakes = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    try {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized with service account');
    }
    catch (error) {
        console.error('Error initializing Firebase Admin:', error);
        admin.initializeApp(); // Fallback to default credentials
    }
}
const db = admin.firestore();
/**
 * Runs every 2 min, moves max-500 stake docs per run
 */
exports.migrateStakes = (0, scheduler_1.onSchedule)({
    schedule: "every 2 minutes",
    timeZone: "UTC",
    retryCount: 3
}, async (event) => {
    // Check if migration is already complete
    const progressRef = db.collection("meta").doc("migration_stakes");
    const progressSnap = await progressRef.get();
    const progress = progressSnap.exists ? progressSnap.data() : {
        totalMigrated: 0,
        lastRun: admin.firestore.Timestamp.now(),
        isComplete: false
    };
    if (progress.isComplete) {
        console.log("Migration already complete, skipping");
        return;
    }
    const batch = db.batch();
    let migratedCount = 0;
    // Pull up to 500 old stake docs
    const snap = await db.collection("stakes")
        .limit(500)
        .get();
    if (snap.empty) {
        // No more docs to migrate, mark as complete
        await progressRef.set({
            totalMigrated: progress.totalMigrated,
            lastRun: admin.firestore.Timestamp.now(),
            isComplete: true
        });
        console.log(`Migration complete. Total migrated: ${progress.totalMigrated}`);
        return;
    }
    // Process each stake document
    for (const doc of snap.docs) {
        const data = doc.data();
        const wallet = data.wallet;
        if (!wallet) {
            console.error(`Stake ${doc.id} has no wallet field, skipping`);
            continue;
        }
        // Create in new location
        const newRef = db.collection("users").doc(wallet).collection("stakes").doc(doc.id);
        batch.set(newRef, data);
        // Delete from old location after migration
        batch.delete(doc.ref);
        migratedCount++;
    }
    // Commit the batch
    await batch.commit();
    // Update progress
    await progressRef.set({
        totalMigrated: progress.totalMigrated + migratedCount,
        lastRun: admin.firestore.Timestamp.now(),
        isComplete: false
    });
    console.log(`Migrated ${migratedCount} stakes. Total: ${progress.totalMigrated + migratedCount}`);
    return;
});
//# sourceMappingURL=migrateStakes.js.map