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
exports.recomputeStats = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
/**
 * Recalculate meta/stats after any write to stakes or users
 */
exports.recomputeStats = (0, firestore_1.onDocumentWritten)("stakes/{stakeId}", async (_event) => {
    try {
        const stakesSnap = await db.collection("stakes").get();
        let tvl = 0;
        let activeStakes = 0;
        stakesSnap.forEach((doc) => {
            const data = doc.data();
            if (data.status === "active") {
                activeStakes += 1;
                tvl += data.amount;
            }
        });
        const totalStakersSnap = await db.collection("stakes").select("wallet").get();
        const uniqueWallets = new Set();
        totalStakersSnap.forEach((d) => uniqueWallets.add(d.data().wallet));
        await db.doc("meta/stats").set({
            totalValueLocked: tvl,
            activeStakes,
            totalStakers: uniqueWallets.size,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (err) {
        console.error("Failed to recompute stats", err);
    }
});
//# sourceMappingURL=metrics.js.map