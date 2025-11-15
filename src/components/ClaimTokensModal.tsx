"use client";

import { useState, useEffect } from "react";
import { useTokenClaim } from "@/hooks/useTokenClaim";
import { rewardsService } from "@/services/rewardsService";

interface ClaimTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  walletAddress: string;
  onClaimSuccess?: () => void;
}

export default function ClaimTokensModal({
  isOpen,
  onClose,
  availableBalance,
  walletAddress,
  onClaimSuccess,
}: ClaimTokensModalProps) {
  const [claimAmount, setClaimAmount] = useState("");
  const [error, setError] = useState("");
  const { claimTokens, claimLoading } = useTokenClaim();

  useEffect(() => {
    if (!isOpen) {
      setClaimAmount("");
      setError("");
    }
  }, [isOpen]);

  const handleClaimAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setClaimAmount(value);
    setError("");

    const amount = parseFloat(value);
    if (isNaN(amount)) return;

    if (amount > availableBalance) {
      setError("Amount exceeds available balance");
    } else if (amount <= 0) {
      setError("Amount must be greater than 0");
    }
  };

  const handleClaim = async () => {
    const amount = parseFloat(claimAmount);

    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amount > availableBalance) {
      setError("Insufficient balance");
      return;
    }

    if (!walletAddress) {
      setError("Wallet address not found");
      return;
    }

    const result = await claimTokens(amount, walletAddress);

    if (result.success) {
      setClaimAmount("");
      setError("");
      onClaimSuccess?.();
      onClose();
    } else {
      setError(result.error || "Claim failed");
    }
  };

  const handleMaxClick = () => {
    setClaimAmount(availableBalance.toString());
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-[#DA9C2F]/30 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#DA9C2F]">Claim MKIN</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Available Balance */}
        <div className="mb-6 p-4 rounded-lg bg-[#DA9C2F]/10 border border-[#DA9C2F]/20">
          <p className="text-white/60 text-sm mb-1">Available Balance</p>
          <p className="text-2xl font-bold text-[#DA9C2F]">
            {rewardsService.formatMKIN(availableBalance)} MKIN
          </p>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="text-white/60 text-sm block mb-2">
            Claim Amount
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder="0"
              value={claimAmount}
              onChange={handleClaimAmountChange}
              disabled={claimLoading}
              className="w-full px-4 py-3 rounded-lg bg-[#0f0f0f] border border-[#DA9C2F]/30 text-white placeholder-white/30 focus:outline-none focus:border-[#DA9C2F] disabled:opacity-50"
            />
            <button
              onClick={handleMaxClick}
              disabled={claimLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#DA9C2F] text-sm font-semibold hover:text-[#ffbf00] disabled:opacity-50"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Wallet Address */}
        <div className="mb-6 p-3 rounded-lg bg-[#0f0f0f] border border-[#DA9C2F]/20">
          <p className="text-white/60 text-xs mb-1">Destination Wallet</p>
          <p className="text-white text-sm font-mono break-all">
            {walletAddress}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={claimLoading}
            className="flex-1 px-4 py-3 rounded-lg border border-[#DA9C2F]/30 text-[#DA9C2F] font-semibold hover:bg-[#DA9C2F]/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleClaim}
            disabled={claimLoading || !claimAmount || parseFloat(claimAmount) <= 0}
            className="flex-1 px-4 py-3 rounded-lg bg-[#DA9C2F] text-black font-semibold hover:bg-[#ffbf00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {claimLoading ? "Claiming..." : "Claim"}
          </button>
        </div>
      </div>
    </div>
  );
}
