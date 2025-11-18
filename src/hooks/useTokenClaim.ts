import { useState, useCallback } from "react";
import { claimTokens as claimTokensBackend } from "@/services/backendClaimService";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { notifySuccess, notifyError, notifyLoading } from "@/utils/toastNotifications";
import toast from "react-hot-toast";

export interface ClaimRecord {
  id: string;
  amount: number;
  walletAddress: string;
  transactionHash: string;
  status: "pending" | "completed" | "failed";
  claimType: string;
  createdAt: Date;
  completedAt?: Date;
}

export function useTokenClaim() {
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimHistory, setClaimHistory] = useState<ClaimRecord[]>([]);
  const [claimHistoryLoading, setClaimHistoryLoading] = useState(false);

  const claimTokens = useCallback(
    async (
      amount: number,
      walletAddress: string
    ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
      if (amount <= 0) {
        notifyError("Amount must be greater than 0");
        return { success: false, error: "Invalid amount" };
      }

      if (!walletAddress) {
        notifyError("Wallet address is required");
        return { success: false, error: "No wallet address" };
      }

      setClaimLoading(true);
      const toastId = notifyLoading(`Claiming ${amount} MKIN...`);

      try {
        const result = await claimTokensBackend(Math.floor(amount), walletAddress);

        toast.dismiss(toastId);
        if (result.success && result.txHash) {
          notifySuccess(
            `Claimed ${amount} MKIN! TX: ${result.txHash.slice(0, 8)}...`
          );
        } else {
          throw new Error(result.error || "Claim failed");
        }

        // Refresh claim history
        await fetchClaimHistory();

        return {
          success: true,
          txHash: result.txHash,
        };
      } catch (error) {
        toast.dismiss(toastId);
        const errorMsg =
          error instanceof Error ? error.message : "Claim failed";
        notifyError(errorMsg);
        console.error("Claim error:", error);
        return { success: false, error: errorMsg };
      } finally {
        setClaimLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const fetchClaimHistory = useCallback(async (limit = 10) => {
    setClaimHistoryLoading(true);
    try {
      const getClaimHistoryFunction = httpsCallable(
        functions,
        "getClaimHistory"
      );
      const result = await getClaimHistoryFunction({ limit });

      const data = result.data as {
        claims: Array<{
          id: string;
          amount: number;
          walletAddress: string;
          transactionHash: string;
          status: string;
          claimType: string;
          createdAt: Record<string, unknown>;
          completedAt?: Record<string, unknown>;
        }>;
      };

      const formattedHistory: ClaimRecord[] = data.claims.map((claim) => ({
        ...claim,
        status: claim.status as "pending" | "completed" | "failed",
        createdAt: typeof claim.createdAt === 'object' && claim.createdAt !== null && 'toDate' in claim.createdAt 
          ? (claim.createdAt as { toDate: () => Date }).toDate() 
          : new Date(),
        completedAt: typeof claim.completedAt === 'object' && claim.completedAt !== null && 'toDate' in claim.completedAt
          ? (claim.completedAt as { toDate: () => Date }).toDate()
          : undefined,
      }));

      setClaimHistory(formattedHistory);
      return formattedHistory;
    } catch (error) {
      console.error("Fetch history error:", error);
      return [];
    } finally {
      setClaimHistoryLoading(false);
    }
  }, []);

  return {
    claimTokens,
    claimHistory,
    claimLoading,
    claimHistoryLoading,
    fetchClaimHistory,
  };
}
