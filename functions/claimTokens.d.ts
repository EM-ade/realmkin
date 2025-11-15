import * as functions from "firebase-functions";
interface ClaimResponse {
    success: boolean;
    txHash?: string;
    error?: string;
}
export declare const claimTokens: functions.https.CallableFunction<any, Promise<ClaimResponse>, unknown>;
export declare const getClaimHistory: functions.https.CallableFunction<any, Promise<{
    claims: {
        createdAt: any;
        completedAt: any;
        id: string;
    }[];
}>, unknown>;
export {};
//# sourceMappingURL=claimTokens.d.ts.map