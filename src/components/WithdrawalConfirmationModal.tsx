"use client";

import { useEffect, useState } from "react";

interface WithdrawalConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  walletAddress: string;
  transactionId?: string;
}

export default function WithdrawalConfirmationModal({
  isOpen,
  onClose,
  amount,
  walletAddress,
  transactionId,
}: WithdrawalConfirmationModalProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowModal(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setShowModal(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  const formatWalletAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const handleViewTransaction = () => {
    if (transactionId) {
      // For Solana transactions (if using Phantom)
      window.open(`https://solscan.io/tx/${transactionId}`, '_blank');
    } else {
      // Fallback - could be customized based on the blockchain
      console.log('Transaction ID not available');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div 
        className={`bg-[#1a1a1a] rounded-2xl max-w-sm w-full mx-4 transform transition-all duration-300 ${
          showModal ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Content */}
        <div className="p-8 text-center">
          {/* Success Checkmark */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <svg 
                className="w-10 h-10 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h2 className="text-white text-3xl font-bold mb-6">
            Sent!
          </h2>

          {/* Transaction Details */}
          <div className="mb-6">
            <div className="text-white text-lg mb-2">
              <span className="text-green-400 font-bold">₥{amount.toFixed(2)} MKIN</span> was
            </div>
            <div className="text-gray-300 text-sm">
              successfully sent to{" "}
              <span className="text-white font-mono">
                {formatWalletAddress(walletAddress)}
              </span>
            </div>
          </div>

          {/* View Transaction Link */}
          {transactionId && (
            <button
              onClick={handleViewTransaction}
              className="text-purple-400 hover:text-purple-300 text-sm mb-8 transition-colors underline"
            >
              View transaction
            </button>
          )}
        </div>

        {/* Close Button */}
        <div className="p-4">
          <button
            onClick={handleClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
