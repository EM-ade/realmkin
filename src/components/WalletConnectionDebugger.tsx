"use client";

import { useState } from "react";
import { detectPopupBlocker, isLaptopEnvironment, getOptimizedConfig } from "@/utils/walletConnection";

interface WalletConnectionDebuggerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletConnectionDebugger({ isOpen, onClose }: WalletConnectionDebuggerProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const runDiagnostics = () => {
    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
      },
      ethereum: {
        available: typeof window !== "undefined" && !!window.ethereum,
        isMetaMask: typeof window !== "undefined" && window.ethereum?.isMetaMask,
        isCoinbaseWallet: typeof window !== "undefined" && window.ethereum?.isCoinbaseWallet,
        isBraveWallet: typeof window !== "undefined" && window.ethereum?.isBraveWallet,
        chainId: typeof window !== "undefined" && window.ethereum?.chainId,
      },
      phantom: {
        available: typeof window !== "undefined" && !!(window as any).phantom?.solana,
        isConnected: typeof window !== "undefined" && (window as any).phantom?.solana?.isConnected,
      },
      popupBlocker: detectPopupBlocker(),
      isLaptop: isLaptopEnvironment(),
      optimizedConfig: getOptimizedConfig(),
      localStorage: {
        available: typeof window !== "undefined" && !!window.localStorage,
        cachedWallet: typeof window !== "undefined" ? localStorage.getItem('realmkin_cached_wallet') : null,
      },
      sessionStorage: {
        available: typeof window !== "undefined" && !!window.sessionStorage,
      },
      touchSupport: {
        ontouchstart: 'ontouchstart' in window,
        maxTouchPoints: navigator.maxTouchPoints,
        msMaxTouchPoints: (navigator as any).msMaxTouchPoints,
      },
    };

    setDebugInfo(info);
  };

  const copyDebugInfo = () => {
    if (debugInfo) {
      const debugText = JSON.stringify(debugInfo, null, 2);
      navigator.clipboard.writeText(debugText).then(() => {
        alert("Debug info copied to clipboard!");
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = debugText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Debug info copied to clipboard!");
      });
    }
  };

  const getRecommendations = () => {
    const recommendations = [];

    if (debugInfo?.popupBlocker) {
      recommendations.push("🚫 Popup blocker detected - Allow popups for this site");
    }

    if (!debugInfo?.ethereum?.available) {
      recommendations.push("🦊 MetaMask not detected - Install MetaMask extension");
    }

    if (debugInfo?.isLaptop) {
      recommendations.push("💻 Laptop environment detected - Using optimized connection settings");
    }

    if (debugInfo?.ethereum?.available && !debugInfo?.ethereum?.isMetaMask) {
      recommendations.push("⚠️ Non-MetaMask wallet detected - Some features may not work optimally");
    }

    if (debugInfo?.touchSupport?.ontouchstart) {
      recommendations.push("👆 Touch screen detected - Consider using touch-friendly wallet interactions");
    }

    if (!debugInfo?.localStorage?.available) {
      recommendations.push("💾 Local storage not available - Wallet connection may not persist");
    }

    return recommendations;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900 to-purple-800 border-2 border-yellow-400 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-yellow-400 text-2xl font-bold">🔧 Wallet Connection Debugger</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-yellow-400 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={runDiagnostics}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              🔍 Run Diagnostics
            </button>
            {debugInfo && (
              <button
                onClick={copyDebugInfo}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                📋 Copy Debug Info
              </button>
            )}
          </div>

          {/* Recommendations */}
          {debugInfo && (
            <div className="border border-yellow-400 rounded-lg p-4">
              <h4 className="text-yellow-400 font-bold mb-3">💡 Recommendations</h4>
              <ul className="space-y-2">
                {getRecommendations().map((rec, index) => (
                  <li key={index} className="text-white text-sm">• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Debug Information */}
          {debugInfo && (
            <div className="border border-gray-600 rounded-lg p-4">
              <h4 className="text-white font-bold mb-3">📊 Debug Information</h4>
              <div className="bg-black bg-opacity-50 rounded p-3 overflow-x-auto">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Quick Fixes */}
          <div className="border border-blue-400 rounded-lg p-4">
            <h4 className="text-blue-400 font-bold mb-3">⚡ Quick Fixes</h4>
            <div className="space-y-3">
              <div className="text-white text-sm">
                <strong>1. Popup Issues:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• Click the wallet extension icon in your browser toolbar</li>
                  <li>• Allow popups for this site in browser settings</li>
                  <li>• Try refreshing the page before connecting</li>
                </ul>
              </div>
              <div className="text-white text-sm">
                <strong>2. Connection Issues:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• Ensure your wallet is unlocked</li>
                  <li>• Check if you have pending connection requests</li>
                  <li>• Try disconnecting and reconnecting</li>
                </ul>
              </div>
              <div className="text-white text-sm">
                <strong>3. Laptop-Specific:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• Close other browser tabs to free up resources</li>
                  <li>• Ensure your laptop is plugged in for better performance</li>
                  <li>• Try using a different browser</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2 px-6 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
