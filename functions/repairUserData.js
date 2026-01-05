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
exports.repairUserData = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const web3_js_1 = require("@solana/web3.js");
const db = admin.firestore();
/**
 * Firebase Function to repair user data inconsistencies
 */
// Using broad types to maintain compatibility across firebase-functions versions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.repairUserData = functions.https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context?.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const uid = context.auth.uid;
    const { repairAll } = data || {};
    try {
        if (repairAll) {
            // Admin-only operation to repair all users
            const isAdmin = await checkIfUserIsAdmin(uid);
            if (!isAdmin) {
                throw new functions.https.HttpsError("permission-denied", "Only admins can repair all user data");
            }
            const repairedCount = await repairAllUsers();
            return {
                success: true,
                message: `Repaired ${repairedCount} user data inconsistencies`,
                repairedCount,
            };
        }
        else {
            // Repair current user's data
            const repaired = await repairSingleUser(uid);
            return {
                success: true,
                message: repaired ? "User data repaired successfully" : "No data inconsistencies found",
                repaired,
            };
        }
    }
    catch (error) {
        console.error("Error repairing user data:", error);
        throw new functions.https.HttpsError("internal", error instanceof Error ? error.message : "Failed to repair user data");
    }
});
async function checkIfUserIsAdmin(uid) {
    try {
        const snap = await db.collection("users").doc(uid).get();
        return snap.exists && (snap.data()?.admin === true);
    }
    catch {
        return false;
    }
}
function sanitizeUsername(input) {
    const lower = (input || "").toLowerCase();
    const filtered = lower.replace(/[^a-z0-9_\-]+/g, "");
    return filtered.replace(/[_-]{2,}/g, "_").slice(0, 24);
}
function deriveUsernameCandidate(userData, uid) {
    if (userData?.username)
        return sanitizeUsername(userData.username);
    if (userData?.displayName)
        return sanitizeUsername(userData.displayName);
    if (userData?.email)
        return sanitizeUsername(userData.email.split("@")[0]);
    if (userData?.walletAddress && userData.walletAddress.length >= 8) {
        const w = userData.walletAddress;
        return sanitizeUsername(`${w.slice(0, 4)}_${w.slice(-4)}`);
    }
    return sanitizeUsername(`user_${uid.slice(0, 6)}`);
}
async function ensureUniqueUsername(base) {
    const root = base.toLowerCase();
    for (let i = 0; i < 50; i++) {
        const candidate = i === 0 ? root : `${root}-${i}`;
        const ref = db.collection("usernames").doc(candidate);
        const snap = await ref.get();
        if (!snap.exists)
            return candidate;
    }
    return `${root}-${Date.now().toString().slice(-4)}`;
}
async function repairSingleUser(uid) {
    try {
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists)
            return false;
        const userData = userDoc.data();
        if (!userData)
            return false;
        let repaired = false;
        // Username mapping
        if (userData.username) {
            const usernameLower = userData.username.toLowerCase();
            const unameRef = db.collection("usernames").doc(usernameLower);
            const unameDoc = await unameRef.get();
            if (!unameDoc.exists || unameDoc.data()?.uid !== uid) {
                await unameRef.set({ uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
                repaired = true;
            }
        }
        else {
            // find by uid
            const q = db.collection("usernames").where("uid", "==", uid).limit(1);
            const snap = await q.get();
            if (!snap.empty) {
                const name = snap.docs[0].id;
                await userRef.update({ username: name, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                repaired = true;
            }
            else {
                const base = deriveUsernameCandidate(userData, uid);
                const unique = await ensureUniqueUsername(base);
                await db.collection("usernames").doc(unique.toLowerCase()).set({ uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
                await userRef.update({ username: unique, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                repaired = true;
            }
        }
        // Wallet mapping
        if (userData.walletAddress) {
            try {
                // validate
                new web3_js_1.PublicKey(userData.walletAddress);
                const walletLower = userData.walletAddress.toLowerCase();
                const walletRef = db.collection("wallets").doc(walletLower);
                const walletDoc = await walletRef.get();
                if (!walletDoc.exists || walletDoc.data()?.uid !== uid) {
                    await walletRef.set({
                        uid,
                        walletAddress: userData.walletAddress,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    repaired = true;
                }
            }
            catch {
                // invalid wallet, skip
            }
        }
        return repaired;
    }
    catch (error) {
        console.error("Error repairing user:", uid, error);
        return false;
    }
}
/**
 * Repair all users' data
 */
async function repairAllUsers() {
    let repairedCount = 0;
    try {
        console.log("🔧 Starting comprehensive data repair for all users...");
        // Get all users
        const usersSnapshot = await db.collection("users").get();
        for (const userDoc of usersSnapshot.docs) {
            const uid = userDoc.id;
            try {
                const repaired = await repairSingleUser(uid);
                if (repaired) {
                    repairedCount++;
                }
            }
            catch (userError) {
                console.error("Error repairing user:", uid, userError);
            }
        }
        console.log(`✅ Data repair completed. Repaired ${repairedCount} users.`);
        return repairedCount;
    }
    catch (error) {
        console.error("Error during comprehensive data repair:", error);
        throw error;
    }
}
//# sourceMappingURL=repairUserData.js.map