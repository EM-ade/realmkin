"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { ethers } from "ethers";

interface Web3ContextType {
  account: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  provider: ethers.BrowserProvider | null;
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  isConnected: false,
  isConnecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  provider: null,
});

export const useWeb3 = () => {
  return useContext(Web3Context);
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider = ({ children }: Web3ProviderProps) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  // Check if wallet is already connected on page load
  useEffect(() => {
    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  const checkConnection = async () => {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          setIsConnected(true);
          setProvider(provider);
        }
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  };

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      showCustomAlert(
        "🔮 REALM ACCESS DENIED",
        "A Web3 wallet is required to enter the Realmkin universe. Please install MetaMask or another compatible wallet to continue your journey."
      );
      return;
    }

    setIsConnecting(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setAccount(address);
      setIsConnected(true);
      setProvider(provider);
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      if (error.code === 4001) {
        showCustomAlert(
          "⚔️ CONNECTION REJECTED",
          "The wallet guardian has denied access. Please approve the connection request to link your wallet to the Realmkin realm."
        );
      } else if (error.code === -32002) {
        showCustomAlert(
          "⏳ PENDING REQUEST",
          "A connection request is already pending. Please check your wallet and complete the existing request."
        );
      } else {
        showCustomAlert(
          "🚫 LINK FAILED",
          "The mystical connection to your wallet has been disrupted. Please ensure your wallet is unlocked and try again."
        );
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const showCustomAlert = (title: string, message: string) => {
    // Create custom modal-style alert
    const alertDiv = document.createElement("div");
    alertDiv.className =
      "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";
    alertDiv.innerHTML = `
      <div class="bg-gradient-to-br from-purple-900 to-purple-800 border-2 border-yellow-400 rounded-lg p-6 max-w-md mx-4 shadow-2xl">
        <div class="text-center">
          <h3 class="text-yellow-400 text-xl font-bold mb-3">${title}</h3>
          <p class="text-white text-sm leading-relaxed mb-4">${message}</p>
          <button
            onclick="this.closest('.fixed').remove()"
            class="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2 px-6 rounded transition-colors"
            style="clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)"
          >
            UNDERSTOOD
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(alertDiv);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setProvider(null);
  };

  const value = {
    account,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    provider,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
