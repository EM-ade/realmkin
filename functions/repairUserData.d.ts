import * as functions from "firebase-functions";
/**
 * Firebase Function to repair user data inconsistencies
 */
export declare const repairUserData: functions.https.CallableFunction<any, Promise<{
    success: boolean;
    message: string;
    repairedCount: number;
    repaired?: undefined;
} | {
    success: boolean;
    message: string;
    repaired: boolean;
    repairedCount?: undefined;
}>, unknown>;
//# sourceMappingURL=repairUserData.d.ts.map