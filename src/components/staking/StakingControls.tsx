import React, { useState } from "react";

interface StakingControlsProps {
  stakedAmount: number;
  walletBalance: number;
  tokenSymbol: string;
  onStake: (amount: number) => void;
  onUnstake: (amount: number) => void;
  conversionRatio?: number;
}

export function StakingControls({
  stakedAmount,
  walletBalance,
  tokenSymbol,
  onStake,
  onUnstake,
  conversionRatio = 2500000,
}: StakingControlsProps) {
  const [amount, setAmount] = useState("");
  const [showUnstakeConfirm, setShowUnstakeConfirm] = useState(false);

  const numAmount = Number(amount);
  const stakeError = numAmount > walletBalance || !amount || numAmount <= 0;
  const unstakeError = numAmount > stakedAmount || !amount || numAmount <= 0;

  const newMkinPreview = numAmount > 0 ? numAmount / conversionRatio : 0;

  const handleStake = () => {
    if (stakeError) return;
    onStake(numAmount);
    setAmount("");
  };

  const handleUnstakeClick = () => {
    if (unstakeError) return;
    setShowUnstakeConfirm(true);
  };

  const handleUnstakeConfirm = () => {
    setShowUnstakeConfirm(false);
    onUnstake(numAmount);
    setAmount("");
  };

  return (
    <>
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
              onClick={() => setAmount(stakedAmount.toString())}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-[#f4c752]/20 text-[#f4c752] px-2 py-1 rounded hover:bg-[#f4c752]/30 uppercase tracking-wider"
            >
              Max
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleStake}
              disabled={stakeError}
              className="py-3 bg-[#f4c752] text-black font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-[#f4c752]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Stake
            </button>
            <button
              onClick={handleUnstakeClick}
              disabled={unstakeError}
              className="py-3 bg-transparent border border-[#f4c752]/50 text-[#f4c752] font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-[#f4c752]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Unstake
            </button>
          </div>
        </div>
      </div>

      {/* Unstake Confirmation Modal */}
      {showUnstakeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0806] border border-[#f4c752]/30 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-[#f4c752] text-lg font-bold uppercase tracking-wider mb-4 text-center">
              Confirm Unstake
            </h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-[#f7dca1]/60">Old MKIN unstaking</span>
                <span className="text-[#f4c752] font-mono">
                  {numAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#f7dca1]/60">New $MKIN you'll receive</span>
                <span className="text-[#f4c752] font-mono">
                  {newMkinPreview.toLocaleString(undefined, {
                    maximumFractionDigits: 8,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#f7dca1]/60">Network fee</span>
                <span className="text-[#f4c752] font-mono">~$2.50</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowUnstakeConfirm(false)}
                className="py-3 border border-[#f4c752]/30 text-[#f7dca1]/60 font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-[#f4c752]/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnstakeConfirm}
                className="py-3 bg-[#f4c752] text-black font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-[#f4c752]/90 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
