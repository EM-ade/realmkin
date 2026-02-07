"use client";

import { useState } from "react";

interface RevenueDistributionCardProps {
  mkinAmount: number;
  empireAmount: number;
  solAmount: number;
  eligible: boolean;
  loading: boolean;
  onClaim: () => void;
  claiming: boolean;
  claimFeeUsd: number;
  accountsToCreate?: {
    empire: boolean;
    mkin: boolean;
  };
  reason?: string; // Reason why user is not eligible
}

export default function RevenueDistributionCard({
  mkinAmount,
  empireAmount,
  solAmount,
  eligible,
  loading,
  onClaim,
  claiming,
  claimFeeUsd,
  accountsToCreate,
  reason,
}: RevenueDistributionCardProps) {
  const [selectedTab, setSelectedTab] = useState<"mkin" | "empire" | "sol">("mkin");

  const tokens = [
    {
      id: "mkin" as const,
      name: "MKIN",
      amount: mkinAmount,
      icon: "👑",
      color: "text-yellow-400",
      bgColor: "bg-yellow-900/20",
      borderColor: "border-yellow-500/20",
    },
    {
      id: "empire" as const,
      name: "EMPIRE",
      amount: empireAmount,
      icon: "🏛️",
      color: "text-blue-400",
      bgColor: "bg-blue-900/20",
      borderColor: "border-blue-500/20",
    },
    {
      id: "sol" as const,
      name: "SOL",
      amount: solAmount,
      icon: "◎",
      color: "text-purple-400",
      bgColor: "bg-purple-900/20",
      borderColor: "border-purple-500/20",
    },
  ];

  const selectedToken = tokens.find((t) => t.id === selectedTab);

  return (
    <section className="bg-[#111111] rounded-2xl p-5 border border-[#27272a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-green-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
          </svg>
          <h2 className="text-white font-semibold">Revenue Distribution</h2>
        </div>
        {eligible ? (
          <span className="text-xs px-2 py-1 rounded bg-green-900/20 text-green-400 border border-green-500/20">
            Eligible
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded bg-gray-900/20 text-gray-400 border border-gray-500/20">
            Not Eligible
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : !eligible ? (
        <div className="py-6">
          {/* Not Eligible Info */}
          <div className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium text-sm mb-1">Not Eligible</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {reason || "You need at least 1 Realmkin NFT purchased from secondary market to be eligible for revenue distribution."}
                </p>
              </div>
            </div>
          </div>

          {/* How to Become Eligible */}
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <svg
                className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-blue-400 font-medium mb-2">How to Become Eligible</p>
                <ul className="space-y-2 text-xs text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>Purchase a Realmkin NFT from a secondary marketplace (Magic Eden, Tensor, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>Connect your wallet to verify ownership</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>Revenue is distributed monthly to eligible holders</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Zero Balance Display */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-2">Current Month Allocation:</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">👑 MKIN:</span>
                <span className="text-gray-600 font-mono">0</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">🏛️ EMPIRE:</span>
                <span className="text-gray-600 font-mono">0</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">◎ SOL:</span>
                <span className="text-gray-600 font-mono">0.000000</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Token Tabs */}
          <div className="flex gap-2 mb-4">
            {tokens.map((token) => (
              <button
                key={token.id}
                onClick={() => setSelectedTab(token.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTab === token.id
                    ? `${token.bgColor} ${token.color} border ${token.borderColor}`
                    : "bg-[#0f0f0f] text-gray-400 border border-gray-800 hover:border-gray-700"
                }`}
              >
                <span className="mr-1">{token.icon}</span>
                {token.name}
              </button>
            ))}
          </div>

          {/* Selected Token Display */}
          {selectedToken && (
            <div className={`${selectedToken.bgColor} rounded-lg p-4 border ${selectedToken.borderColor} mb-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Available to Claim</p>
                  <p className={`text-3xl font-bold ${selectedToken.color}`}>
                    {selectedToken.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{selectedToken.name}</p>
                </div>
                <div className="text-4xl">{selectedToken.icon}</div>
              </div>
            </div>
          )}


          {/* Fee Information */}
          <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-yellow-400 font-medium mb-1">Claim Fee</p>
                <p className="text-xs text-gray-300">
                  Base fee: $1.00 total ($0.10 claim + $0.90 site fee, paid in SOL)
                </p>
                {accountsToCreate && (accountsToCreate.empire || accountsToCreate.mkin) && (
                  <p className="text-xs text-gray-300 mt-1">
                    + Token account creation fee ($1.00 per account)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Claim All Button */}
          <button
            onClick={onClaim}
            disabled={claiming || !eligible}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {claiming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Claim All Tokens
              </>
            )}
          </button>

          {/* Breakdown */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-2">Claim Breakdown:</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">👑 MKIN:</span>
                <span className="text-white font-mono">{mkinAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">🏛️ EMPIRE:</span>
                <span className="text-white font-mono">{empireAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">◎ SOL:</span>
                <span className="text-white font-mono">{solAmount.toFixed(6)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
