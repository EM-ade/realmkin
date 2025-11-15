/**
 * One-time migration script to move stakes from the root collection
 * to a sub-collection under each user.
 *
 * NOTE: Deploy and run this function until the root `stakes` collection is empty,
 * then disable or delete it.
 */
export declare const migrateStakes: import("firebase-functions/v2/scheduler").ScheduleFunction;
//# sourceMappingURL=migrateStakes.d.ts.map