import * as functions from "firebase-functions";
/**
 * Main scheduled function for one-time token distribution
 * Runs at 5:00 UTC (6:00 AM Nigeria time) on the specified date
 */
export declare const oneTimeTokenDistribution: functions.scheduler.ScheduleFunction;
/**
 * Manual trigger endpoint for testing the distribution
 */
export declare const manualOneTimeTokenDistribution: functions.https.HttpsFunction;
//# sourceMappingURL=oneTimeTokenDistribution.d.ts.map