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
// Define secrets
const SOLANA_RPC_URL = (0, params_1.defineSecret)("SOLANA_RPC_URL");
const SOLANA_TOKEN_MINT = (0, params_1.defineSecret)("SOLANA_TOKEN_MINT");
const TOKEN_DECIMALS = (0, params_1.defineSecret)("TOKEN_DECIMALS");
const SOLANA_STAKING_PRIVATE_KEY = (0, params_1.defineSecret)("SOLANA_STAKING_PRIVATE_KEY");
const BACKEND_URL = (0, params_1.defineSecret)("BACKEND_URL");
// Initialize Admin SDK
admin.initializeApp();
const db = admin.firestore();
// Initialize with error handling
let connection;
let stakingKeypair = null;
let TOKEN_MINT;
let rpcUrl;
let tokenDecimals;
// These will be initialized when the function runs with secrets
function initializeSolanaConfig(rpcUrlValue, tokenMintValue, privateKeyValue) {
    try {
        rpcUrl = rpcUrlValue || "https://api.devnet.solana.com";
        TOKEN_MINT = new web3_js_1.PublicKey(tokenMintValue || "11111111111111111111111111111111");
        connection = new web3_js_1.Connection(rpcUrl, "confirmed");
        tokenDecimals = parseInt(process.env.TOKEN_DECIMALS || "9");
        if (privateKeyValue) {
            const STAKING_PRIVATE_KEY = JSON.parse(Buffer.from(privateKeyValue, "base64").toString());
            stakingKeypair = web3_js_1.Keypair.fromSecretKey(new Uint8Array(STAKING_PRIVATE_KEY));
        }
        else {
            console.warn("Warning: SOLANA_STAKING_PRIVATE_KEY not set. Unstake function will not work.");
        }
    }
    catch (e) {
        console.error("Error initializing Solana configuration:", e);
    }
}
/**
 * On stake doc updated -> if status changed to "unstaking" send tokens back
 */
exports.processUnstake = (0, firestore_1.onDocumentUpdated)({ document: "stakes/{stakeId}", secrets: [SOLANA_RPC_URL, SOLANA_TOKEN_MINT, TOKEN_DECIMALS, SOLANA_STAKING_PRIVATE_KEY, BACKEND_URL] }, async (event) => {
    const change = event.data;
    if (!change)
        return null;
    // Initialize Solana config with secrets
    initializeSolanaConfig(SOLANA_RPC_URL.value(), SOLANA_TOKEN_MINT.value(), SOLANA_STAKING_PRIVATE_KEY.value());
    const before = change.before.data();
    const after = change.after.data();
    if (!before || !after)
        return null;
    // Only act on transition active->unstaking
    if (before.status !== "unstaking" && after.status === "unstaking") {
        // Check if staking keypair is available
        if (!stakingKeypair) {
            console.error("Staking keypair not configured. Cannot process unstake.");
            return null;
        }
        const amount = after.amount;
        const userWallet = new web3_js_1.PublicKey(after.wallet);
        try {
            // Get ATA addresses
            const stakingATA = await (0, spl_token_1.getAssociatedTokenAddress)(TOKEN_MINT, stakingKeypair.publicKey);
            const userATA = await (0, spl_token_1.getAssociatedTokenAddress)(TOKEN_MINT, userWallet);
            // Create transfer instruction
            const instruction = (0, spl_token_1.createTransferInstruction)(stakingATA, userATA, stakingKeypair.publicKey, amount * Math.pow(10, tokenDecimals), [], spl_token_1.TOKEN_PROGRAM_ID);
            const transaction = new web3_js_1.Transaction();
            transaction.add(instruction);
            transaction.feePayer = stakingKeypair.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.sign(stakingKeypair);
            const signature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [stakingKeypair]);
            // Mark stake completed
            await change.after.ref.update({ status: "completed", updated_at: admin.firestore.Timestamp.now() });
            // Call completeUnstake helper to update TVL etc.
            const backendUrl = process.env.BACKEND_URL || "";
            await fetch(`${backendUrl}/unstake/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stakeId: event.params.stakeId, txSignature: signature }),
            });
        }
        catch (err) {
            console.error("Unstake processing failed", err);
        }
    }
    return null;
});
//# sourceMappingURL=unstake.js.map