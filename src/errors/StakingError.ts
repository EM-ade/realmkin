export type StakingErrorCode =
  | "WALLET_NOT_CONNECTED"
  | "TX_FAILED"
  | "NO_REWARDS"
  | "STAKE_LOCKED"
  | "UNKNOWN";

export const errorMessages: Record<StakingErrorCode, string> = {
  WALLET_NOT_CONNECTED: "Connect your wallet first.",
  TX_FAILED: "Transaction failed. Please retry.",
  NO_REWARDS: "No rewards available to claim yet.",
  STAKE_LOCKED: "Stake is still locked.",
  UNKNOWN: "Something went wrong.",
};

export class StakingError extends Error {
  code: StakingErrorCode;

  constructor(code: StakingErrorCode, message?: string) {
    super(message ?? errorMessages[code]);
    this.code = code;
    this.name = "StakingError";
  }
}
