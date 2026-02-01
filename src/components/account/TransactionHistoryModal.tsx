"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTransactionHistory,
  searchTransactions,
  getTransactionStats,
  type TransactionRecord,
  type TransactionType,
  type TransactionStatus,
} from "@/services/transactionHistoryService";
import { QueryDocumentSnapshot } from "firebase/firestore";

// Material Icons styling
const materialIconStyle = {
  fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
};

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  withdrawal: "Withdrawal",
  transfer: "Transfer",
  claim: "Claim MKIN",
  stake: "Stake",
  unstake: "Unstake",
  staking_claim: "Claim MKIN",
  revenue_share: "Revenue Share",
};

const TRANSACTION_TYPE_ICONS: Record<TransactionType, { icon: string; bgColor: string; textColor: string }> = {
  withdrawal: { icon: "account_balance_wallet", bgColor: "bg-[#fbbf24]/10", textColor: "text-[#fbbf24]" },
  transfer: { icon: "send", bgColor: "bg-purple-500/10", textColor: "text-purple-400" },
  claim: { icon: "download", bgColor: "bg-[#8b5cf6]/10", textColor: "text-[#8b5cf6]" },
  stake: { icon: "lock", bgColor: "bg-blue-500/10", textColor: "text-blue-400" },
  unstake: { icon: "lock_open", bgColor: "bg-orange-500/10", textColor: "text-orange-400" },
  staking_claim: { icon: "download", bgColor: "bg-[#8b5cf6]/10", textColor: "text-[#8b5cf6]" },
  revenue_share: { icon: "payments", bgColor: "bg-green-500/10", textColor: "text-green-400" },
};

export default function TransactionHistoryModal({
  isOpen,
  onClose,
  userId,
}: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<TransactionType | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<TransactionStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Fetch transaction history
  const fetchTransactions = useCallback(
    async (loadMore = false) => {
      if (!userId) return;

      setLoading(true);
      try {
        const options: any = {
          limit: 20,
        };

        if (selectedType !== "all") {
          options.type = selectedType;
        }

        if (selectedStatus !== "all") {
          options.status = selectedStatus;
        }

        if (loadMore && lastDoc) {
          options.startAfterDoc = lastDoc;
        }

        const result = await getTransactionHistory(userId, options);

        if (loadMore) {
          setTransactions((prev) => [...prev, ...result.transactions]);
        } else {
          setTransactions(result.transactions);
        }

        setLastDoc(result.lastDoc);
        setHasMore(result.transactions.length === 20);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    },
    [userId, selectedType, selectedStatus, lastDoc]
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!userId) return;
    try {
      const stats = await getTransactionStats(userId);
      setStats(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [userId]);

  // Search transactions
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim() || !userId) {
      fetchTransactions();
      return;
    }

    setLoading(true);
    try {
      const results = await searchTransactions(userId, searchTerm.trim());
      setTransactions(results);
      setHasMore(false);
    } catch (error) {
      console.error("Error searching transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, userId, fetchTransactions]);

  // Initial load
  useEffect(() => {
    if (isOpen && userId) {
      fetchTransactions();
      fetchStats();
    }
  }, [isOpen, userId, selectedType, selectedStatus]);

  // Handle search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  if (!isOpen) return null;

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case "success":
        return "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20";
      case "failed":
        return "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20";
      case "pending":
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const formatTimestamp = (timestamp: any) => {
    const date = timestamp?.toDate?.() || new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month} ${day}, ${year} · ${hours}:${minutes}`;
  };

  const formatAmount = (amount: number, token: string) => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-[#111111] border-2 border-[#fbbf24] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#27272a]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#fbbf24] text-3xl" style={materialIconStyle}>
              history
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Transaction History</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-2xl" style={materialIconStyle}>
              close
            </span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="px-8 py-4 bg-black/30 flex gap-4 items-center">
          <div className="relative flex-grow max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm" style={materialIconStyle}>
              search
            </span>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#050505] border border-[#27272a] rounded-lg pl-10 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#8b5cf6] transition-colors"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="bg-[#050505] border border-[#27272a] rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
          >
            <option value="all">All Types</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="transfer">Transfer</option>
            <option value="claim">Claim</option>
            <option value="stake">Stake</option>
            <option value="unstake">Unstake</option>
            <option value="staking_claim">Staking Rewards</option>
            <option value="revenue_share">Revenue Share</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="bg-[#050505] border border-[#27272a] rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
          >
            <option value="all">Last 30 Days</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Transaction Table */}
        <div className="max-h-[500px] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a #0a0a0a' }}>
          {loading && transactions.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fbbf24]"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No transactions found</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#111111] z-10 shadow-sm shadow-black">
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-[#27272a]">
                  <th className="px-8 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold text-center">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Amount</th>
                  <th className="px-6 py-4 font-semibold text-center">Reason</th>
                  <th className="px-8 py-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                  >
                    {/* Type */}
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded ${TRANSACTION_TYPE_ICONS[tx.type].bgColor} flex items-center justify-center ${TRANSACTION_TYPE_ICONS[tx.type].textColor}`}>
                          <span className="material-symbols-outlined text-lg" style={materialIconStyle}>
                            {TRANSACTION_TYPE_ICONS[tx.type].icon}
                          </span>
                        </div>
                        <span className="text-white font-medium whitespace-nowrap">
                          {TRANSACTION_TYPE_LABELS[tx.type]}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-5 text-center text-gray-400 text-sm font-mono whitespace-nowrap">
                      {formatTimestamp(tx.timestamp)}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-5 text-right font-bold text-white font-mono">
                      {tx.type === 'withdrawal' || tx.type === 'transfer' ? '- ' : '+ '}
                      {formatAmount(tx.amount, tx.token)}
                    </td>

                    {/* Reason */}
                    <td className="px-6 py-5 text-center">
                      {tx.status === 'failed' && tx.errorMessage ? (
                        <div className="flex items-center justify-center gap-1.5 text-[#ef4444]">
                          <span className="material-symbols-outlined text-[16px]" style={materialIconStyle}>
                            error
                          </span>
                          <span className="text-sm font-medium">{tx.errorMessage}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          {tx.type === 'claim' || tx.type === 'staking_claim' ? 'Daily Mining' :
                           tx.type === 'transfer' ? 'User Transfer' :
                           tx.type === 'withdrawal' ? 'Wallet Cashout' :
                           tx.type === 'revenue_share' ? 'Revenue Share' :
                           tx.type === 'stake' ? 'Staking' :
                           tx.type === 'unstake' ? 'Unstaking' : 'Transaction'}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-8 py-5 text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(tx.status)}`}>
                        {tx.status === 'success' ? 'Success' : tx.status === 'failed' ? 'Failed' : 'Pending'}
                      </span>
                    </td>
                  </tr>

                ))}
              </tbody>
            </table>
          )}

        </div>

        {/* Footer with Pagination */}
        <div className="px-8 py-6 bg-black/40 border-t border-[#27272a] flex items-center justify-between">
          <div className="text-gray-500 text-xs">
            Showing <span className="text-white font-bold">{transactions.length}</span> transactions
          </div>
          <div className="flex gap-2">
            <button
              disabled={!hasMore}
              className="px-4 py-2 bg-[#050505] border border-[#27272a] rounded text-gray-400 text-sm hover:text-white hover:border-[#8b5cf6] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => fetchTransactions(true)}
              disabled={!hasMore || loading}
              className="px-4 py-2 bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 rounded text-[#8b5cf6] text-sm hover:bg-[#8b5cf6]/30 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Next Page'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
