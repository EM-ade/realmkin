/**
 * Recalculate meta/stats after any write to stakes or users
 */
export declare const recomputeStats: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").DocumentSnapshot> | undefined, {
    stakeId: string;
}>>;
//# sourceMappingURL=metrics.d.ts.map