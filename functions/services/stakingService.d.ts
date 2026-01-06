import * as functions from "firebase-functions";
interface StakeResponse {
    success: boolean;
    stakeId?: string;
    error?: string;
}
/**
 * Process staking of an NFT
 */
export declare const processStake: functions.https.CallableFunction<any, Promise<StakeResponse>, unknown>;
/**
 * Process unstaking of an NFT
 */
export declare const processUnstake: functions.https.CallableFunction<any, Promise<StakeResponse>, unknown>;
/**
 * Get staking history for a user
 */
export declare const getStakingHistory: functions.https.CallableFunction<any, Promise<{
    stakes: {
        stakedAt: any;
        unstakedAt: any;
        lastRewardUpdate: any;
        id: string;
    }[];
}>, unknown>;
export {};
//# sourceMappingURL=stakingService.d.ts.map