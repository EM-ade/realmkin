/**
 * On stake doc updated -> if status changed to "unstaking" send tokens back
 */
export declare const processUnstake: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    stakeId: string;
}>>;
//# sourceMappingURL=unstake.d.ts.map