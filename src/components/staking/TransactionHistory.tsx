"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Transaction {
  id: string;
  type: "STAKE" | "UNSTAKE" | "CLAIM";
  amount_mkin?: number;
  amount_sol?: number;
  signature?: string;
  fee_tx?: string;
  fee_amount_sol?: number;
  timestamp: any;
}

interface TransactionHistoryProps {
  isMobile?: boolean;
}

export default function TransactionHistory({ isMobile = false }: TransactionHistoryProps) {
  const { uid } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const fetchTransactions = async () => {
      try {
        const q = query(
          collection(db, "staking_transactions"),
          where("user_id", "==", uid),
          orderBy("timestamp", "desc"),
          limit(50)
        );

        const snapshot = await getDocs(q);
        const txs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];

        setTransactions(txs);
      } catch (error) {
        console.error("Failed to fetch transaction history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [uid]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      return "N/A";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "STAKE":
        return "text-green-400";
      case "UNSTAKE":
        return "text-yellow-400";
      case "CLAIM":
        return "text-[#DA9C2F]";
      default:
        return "text-gray-400";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "STAKE":
        return "⬆️";
      case "UNSTAKE":
        return "⬇️";
      case "CLAIM":
        return "💰";
      default:
        return "•";
    }
  };

  const shortenSignature = (sig: string) => {
    if (!sig) return "N/A";
    return `${sig.slice(0, 4)}...${sig.slice(-4)}`;
  };

  const openExplorer = (signature: string) => {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta" ? "" : "?cluster=devnet";
    window.open(`https://solscan.io/tx/${signature}${network}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#DA9C2F] border-t-transparent"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-lg">No transaction history yet</p>
        <p className="text-sm mt-2">Start staking to see your activity here</p>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? "max-h-[60vh] overflow-y-auto" : ""}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-[#DA9C2F]/20">
            <tr>
              <th className="px-4 py-3 text-[#DA9C2F] font-semibold">Type</th>
              <th className="px-4 py-3 text-[#DA9C2F] font-semibold">Amount</th>
              <th className="px-4 py-3 text-[#DA9C2F] font-semibold">Date</th>
              <th className="px-4 py-3 text-[#DA9C2F] font-semibold">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-gray-800 hover:bg-gray-900/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{getTypeIcon(tx.type)}</span>
                    <span className={`font-medium ${getTypeColor(tx.type)}`}>{tx.type}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {tx.type === "CLAIM" && tx.amount_sol && (
                    <span className="text-white font-medium">
                      {tx.amount_sol.toFixed(4)} SOL
                    </span>
                  )}
                  {(tx.type === "STAKE" || tx.type === "UNSTAKE") && tx.amount_mkin && (
                    <span className="text-white font-medium">
                      {tx.amount_mkin.toLocaleString()} MKIN
                    </span>
                  )}
                  {tx.fee_amount_sol && (
                    <div className="text-xs text-gray-400 mt-1">
                      Fee: {tx.fee_amount_sol.toFixed(4)} SOL
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-300">{formatDate(tx.timestamp)}</td>
                <td className="px-4 py-3">
                  {(tx.signature || tx.fee_tx) && (
                    <button
                      onClick={() => openExplorer(tx.signature || tx.fee_tx!)}
                      className="text-[#DA9C2F] hover:text-[#DA9C2F]/80 transition-colors text-sm flex items-center gap-1"
                    >
                      <span>{shortenSignature(tx.signature || tx.fee_tx!)}</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
