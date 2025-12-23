import React, { useState } from "react";

interface StakingControlsProps {
  stakedAmount: number;
  walletBalance: number; // Mocked for now if needed, or passed from parent
  tokenSymbol: string;
  onStake: (amount: number) => void;
  onUnstake: (amount: number) => void;
}

export function StakingControls({
  stakedAmount,
  walletBalance,
  tokenSymbol,
  onStake,
  onUnstake,
}: StakingControlsProps) {
  const [amount, setAmount] = useState("");

  return (
    <div className="bg-black/40 border border-[#f4c752]/20 rounded-xl p-6">
      <h3 className="text-[#f7dca1]/60 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
        Manage Stake
      </h3>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-[#f7dca1]/60 mb-2 uppercase tracking-wider">
          <span>Staked Balance</span>
          <span className="text-[#f4c752]">
            {stakedAmount.toLocaleString()} {tokenSymbol}
          </span>
        </div>
        <div className="flex justify-between text-xs text-[#f7dca1]/60 mb-2 uppercase tracking-wider">
          <span>Wallet Balance</span>
          <span>
            {walletBalance.toLocaleString()} {tokenSymbol}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-black/60 border border-[#f4c752]/30 rounded-lg py-3 px-4 text-[#f4c752] placeholder-[#f7dca1]/20 focus:outline-none focus:border-[#f4c752] transition-colors font-mono"
          />
          <button
            onClick={() => setAmount(walletBalance.toString())}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-[#f4c752]/20 text-[#f4c752] px-2 py-1 rounded hover:bg-[#f4c752]/30 uppercase tracking-wider"
          >
            Max
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onStake(Number(amount))}
            disabled={!amount || Number(amount) <= 0}
            className="py-3 bg-[#f4c752] text-black font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-[#f4c752]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Stake
          </button>
          <button
            onClick={() => onUnstake(Number(amount))}
            disabled={!amount || Number(amount) <= 0}
            className="py-3 bg-transparent border border-[#f4c752]/50 text-[#f4c752] font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-[#f4c752]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Unstake
          </button>
        </div>
      </div>
    </div>
  );
}
