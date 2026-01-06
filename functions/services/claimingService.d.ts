import * as functions from "firebase-functions";
interface ClaimResponse {
    success: boolean;
    txHash?: string;
    error?: string;
}
/**
 * Enhanced claim tokens function with better error handling and balance validation
 */
export declare const processClaim: functions.https.CallableFunction<any, Promise<ClaimResponse>, unknown>;
/**
 * Get claim history for a user
 */
export declare const getClaimHistory: functions.https.CallableFunction<any, Promise<{
    claims: {
        createdAt: any;
        completedAt: any;
        id: string;
    }[];
}>, unknown>;
export {};
//# sourceMappingURL=claimingService.d.ts.map