import * as admin from "firebase-admin";
admin.initializeApp();

// Export existing functions (avoid duplicate re-exports)
export { claimTokens } from "./claimTokens";
export { enhancedClaimTokens, getClaimHistory } from "./enhancedClaimTokens";
export * from "./unstake";
export * from "./migrateStakes";
export * from "./cors";

// Export new repair function
export * from "./repairUserData";

// Export services
export * from "./services/claimingService";
export { processStake, getStakingHistory } from "./services/stakingService";