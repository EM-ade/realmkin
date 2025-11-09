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
exports.processUnstake = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
// Initialize Admin SDK
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
// ENV CONFIG (set via Firebase params)
const rpcUrl = (0, params_1.defineString)("solana.rpc_url", { default: "https://api.devnet.solana.com" });
const tokenMint = (0, params_1.defineString)("solana.token_mint");
const stakingPrivateKey = (0, params_1.defineString)("solana.staking_private_key");
const backendUrl = (0, params_1.defineString)("backend.url");
// Parse values
const RPC_URL = rpcUrl.value();
const TOKEN_MINT = new web3_js_1.PublicKey(tokenMint.value());
const STAKING_PRIVATE_KEY = JSON.parse(Buffer.from(stakingPrivateKey.value(), "base64").toString());
const connection = new web3_js_1.Connection(RPC_URL, "confirmed");
const stakingKeypair = web3_js_1.Keypair.fromSecretKey(new Uint8Array(STAKING_PRIVATE_KEY));
/**
 * On stake doc updated -> if status changed to "unstaking" send tokens back
 */
exports.processUnstake = (0, firestore_1.onDocumentUpdated)("users/{userId}/stakes/{stakeId}", async (event) => {
    if (!event.data) {
        console.log("No data in event");
        return;
    }
    const before = event.data.before.data();
    const after = event.data.after.data();
    const afterRef = event.data.after.ref;
    if (!before || !after) {
        console.log("Missing before or after data");
        return;
    }
    // Only act on transition active->unstaking
    if (before.status !== "unstaking" && after.status === "unstaking") {
        const amount = after.amount;
        const userWallet = new web3_js_1.PublicKey(after.wallet);
        try {
            // Get ATA addresses
            const stakingATA = await (0, spl_token_1.getAssociatedTokenAddress)(TOKEN_MINT, stakingKeypair.publicKey);
            const userATA = await (0, spl_token_1.getAssociatedTokenAddress)(TOKEN_MINT, userWallet);
            // Create transfer transaction
            const transaction = new web3_js_1.Transaction();
            const instruction = (0, spl_token_1.createTransferInstruction)(stakingATA, userATA, stakingKeypair.publicKey, amount * Math.pow(10, parseInt(process.env.TOKEN_DECIMALS || "6")), [], spl_token_1.TOKEN_PROGRAM_ID);
            transaction.add(instruction);
            transaction.feePayer = stakingKeypair.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            // Sign and send transaction
            transaction.sign(stakingKeypair);
            const signature = await connection.sendTransaction(transaction, [stakingKeypair]);
            await connection.confirmTransaction(signature, "confirmed");
            // Mark stake completed
            await afterRef.update({ status: "completed", updated_at: admin.firestore.Timestamp.now() });
            // Call completeUnstake helper to update TVL etc.
            await fetch(`${backendUrl.value()}/unstake/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stakeId: event.params.stakeId,
                    txSignature: signature
                }),
            });
            console.log(`Successfully processed unstake for ${event.params.stakeId}, tx: ${signature}`);
        }
        catch (err) {
            console.error("Unstake processing failed", err);
        }
    }
    return;
});
//# sourceMappingURL=unstake.js.map