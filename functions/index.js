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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStakingHistory = exports.processStake = exports.testOneTimeDistribution = exports.manualOneTimeTokenDistribution = exports.oneTimeTokenDistribution = exports.getClaimHistory = exports.enhancedClaimTokens = exports.claimTokens = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
    admin.initializeApp();
    console.log("🔥 Firebase Admin SDK initialized");
}
// Export existing functions (avoid duplicate re-exports)
var claimTokens_1 = require("./claimTokens");
Object.defineProperty(exports, "claimTokens", { enumerable: true, get: function () { return claimTokens_1.claimTokens; } });
var enhancedClaimTokens_1 = require("./enhancedClaimTokens");
Object.defineProperty(exports, "enhancedClaimTokens", { enumerable: true, get: function () { return enhancedClaimTokens_1.enhancedClaimTokens; } });
Object.defineProperty(exports, "getClaimHistory", { enumerable: true, get: function () { return enhancedClaimTokens_1.getClaimHistory; } });
__exportStar(require("./unstake"), exports);
__exportStar(require("./migrateStakes"), exports);
__exportStar(require("./cors"), exports);
// Export new repair function
__exportStar(require("./repairUserData"), exports);
// Export one-time token distribution functions
var oneTimeTokenDistribution_1 = require("./oneTimeTokenDistribution");
Object.defineProperty(exports, "oneTimeTokenDistribution", { enumerable: true, get: function () { return oneTimeTokenDistribution_1.oneTimeTokenDistribution; } });
Object.defineProperty(exports, "manualOneTimeTokenDistribution", { enumerable: true, get: function () { return oneTimeTokenDistribution_1.manualOneTimeTokenDistribution; } });
var testOneTimeDistribution_1 = require("./testOneTimeDistribution");
Object.defineProperty(exports, "testOneTimeDistribution", { enumerable: true, get: function () { return testOneTimeDistribution_1.testOneTimeDistribution; } });
// Export services
__exportStar(require("./services/claimingService"), exports);
var stakingService_1 = require("./services/stakingService");
Object.defineProperty(exports, "processStake", { enumerable: true, get: function () { return stakingService_1.processStake; } });
Object.defineProperty(exports, "getStakingHistory", { enumerable: true, get: function () { return stakingService_1.getStakingHistory; } });
//# sourceMappingURL=index.js.map