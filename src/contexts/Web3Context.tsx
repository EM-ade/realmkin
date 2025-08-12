"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import { 
  connectMetaMask, 
  getConnectionErrorMessage, 
  getOptimizedConfig,
  ensureWindowFocus 
} from "@/utils/walletConnection";

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
        if (window.ethereum && window.ethereum.removeListener) {
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
      if (typeof window !== "undefined") {
        // Check for Ethereum wallets (MetaMask, Coinbase, etc.)
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();

          if (accounts.length > 0) {
            setAccount(accounts[0].address);
            setIsConnected(true);
            setProvider(provider);
            return;
          }
        }

        // Check for Phantom wallet persistence
        interface PhantomWindow {
          phantom?: {
            solana: {
              connect(): Promise<{ publicKey: { toString(): string } }>;
              isConnected?: boolean;
            };
          };
        }
        const phantom = (window as unknown as PhantomWindow).phantom?.solana;
        if (phantom) {
          try {
            // Check if Phantom is already connected
            if (phantom.isConnected) {
              const response = await phantom.connect();
              setAccount(response.publicKey.toString());
              setIsConnected(true);
              setProvider(null); // Phantom doesn't use ethers provider
              return;
            }
            
            // Try to connect if not already connected
            const response = await phantom.connect();
            setAccount(response.publicKey.toString());
            setIsConnected(true);
            setProvider(null);
            return;
          } catch (error) {
            console.log("Phantom wallet not connected:", error);
          }
        }

        // Check localStorage for cached wallet connection
        const cachedWallet = localStorage.getItem('realmkin_cached_wallet');
        if (cachedWallet) {
          try {
            const walletData = JSON.parse(cachedWallet);
            if (walletData.type === 'phantom' && (window as unknown as PhantomWindow).phantom?.solana) {
              // Try to reconnect Phantom
              const response = await (window as unknown as PhantomWindow).phantom!.solana.connect();
              setAccount(response.publicKey.toString());
              setIsConnected(true);
              setProvider(null);
              return;
            }
          } catch (error) {
            console.log("Failed to restore cached wallet:", error);
            localStorage.removeItem('realmkin_cached_wallet');
          }
        }
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  };

  const connectWallet = async () => {
    // Enhanced wallet detection
    if (typeof window === "undefined") {
      showCustomAlert(
        "🔮 REALM ACCESS DENIED",
        "Web3 functionality is not available in this environment."
      );
      return;
    }

    // Show wallet selection popup
    showWalletSelection();
  };

  // Enhanced connection function with better laptop support
  const connectSpecificWallet = async (walletType: string) => {
    setIsConnecting(true);

    try {
      let provider;

      if (walletType === "metamask") {
        try {
          // Use the optimized connection utility
          const config = getOptimizedConfig();
          provider = await connectMetaMask(config);
        } catch (error) {
          console.error("MetaMask connection failed:", error);
          throw error;
        }
      } else if (walletType === "phantom") {
        interface PhantomWindow {
          phantom?: {
            solana: {
              connect(): Promise<{ publicKey: { toString(): string } }>;
            };
          };
        }

        const phantom = (window as unknown as PhantomWindow).phantom?.solana;

        if (!phantom) {
          showCustomAlert(
            "👻 PHANTOM NOT FOUND",
            "Phantom wallet is not installed. Please install Phantom extension and try again.",
            false,
            "https://phantom.app/"
          );
          return;
        }

        // Connect to Phantom (Solana)
        const response = await phantom.connect();
        const publicKey = response.publicKey.toString();
        setAccount(publicKey);
        setIsConnected(true);
        setProvider(null); // Phantom doesn't use ethers provider
        
        // Cache the wallet connection
        localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
          type: 'phantom',
          address: publicKey,
          timestamp: Date.now()
        }));
        
        return;
      } else if (walletType === "walletconnect") {
        showCustomAlert(
          "🔗 COMING SOON",
          "WalletConnect integration is coming soon. Please use MetaMask for now."
        );
        return;
      } else if (walletType === "coinbase") {
        interface CoinbaseWindow {
          coinbaseWalletExtension: {
            request: (params: { method: string }) => Promise<void>;
          };
        }

        const coinbase = (window as unknown as CoinbaseWindow)
          .coinbaseWalletExtension;

        if (!coinbase) {
          showCustomAlert(
            "🔵 COINBASE NOT FOUND",
            "Coinbase Wallet is not installed. Please install Coinbase Wallet extension and try again.",
            false,
            "https://www.coinbase.com/wallet"
          );
          return;
        }

        // Enhanced Coinbase connection with laptop-friendly approach
        await ensureWindowFocus();
        
        provider = new ethers.BrowserProvider(coinbase);
        await provider.send("eth_requestAccounts", []);
      }

      if (provider) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        setAccount(address);
        setIsConnected(true);
        setProvider(provider);
        
        // Cache the wallet connection
        localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
          type: walletType,
          address: address,
          timestamp: Date.now()
        }));
      }
          } catch (error: unknown) {
        console.error("Error connecting wallet:", error);
        
        // Use the utility function to get appropriate error message
        const { title, message, showRetry } = getConnectionErrorMessage(error as Error);
        showCustomAlert(title, message, showRetry);
    } finally {
      setIsConnecting(false);
    }
  };



  const showWalletSelection = () => {
    const selectionDiv = document.createElement("div");
    selectionDiv.className =
      "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";

    selectionDiv.innerHTML = `
      <div class="bg-gradient-to-br from-purple-900 to-purple-800 border-2 border-yellow-400 rounded-lg p-6 max-w-lg mx-4 shadow-2xl">
        <div class="text-center mb-6">
          <h3 class="text-yellow-400 text-2xl font-bold mb-2">🔮 SELECT YOUR WALLET</h3>
          <p class="text-white text-sm">Choose your preferred wallet to enter the Realmkin realm</p>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <!-- MetaMask -->
          <button
            onclick="window.connectWallet('metamask'); this.closest('.fixed').remove();"
            class="bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 border-2 border-yellow-400 text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <div class="flex flex-col items-center space-y-2">
              <div class="text-3xl">🦊</div>
              <span class="text-sm">MetaMask</span>
            </div>
          </button>

          <!-- Phantom -->
          <button
            onclick="window.connectWallet('phantom'); this.closest('.fixed').remove();"
            class="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border-2 border-yellow-400 text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <div class="flex flex-col items-center space-y-2">
              <div class="text-3xl">👻</div>
              <span class="text-sm">Phantom</span>
            </div>
          </button>

          <!-- Coinbase -->
          <button
            onclick="window.connectWallet('coinbase'); this.closest('.fixed').remove();"
            class="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-2 border-yellow-400 text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <div class="flex flex-col items-center space-y-2">
              <div class="text-3xl">🔵</div>
              <span class="text-sm">Coinbase</span>
            </div>
          </button>

          <!-- WalletConnect -->
          <button
            onclick="window.connectWallet('walletconnect'); this.closest('.fixed').remove();"
            class="bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 border-2 border-yellow-400 text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <div class="flex flex-col items-center space-y-2">
              <div class="text-3xl">🔗</div>
              <span class="text-sm">WalletConnect</span>
            </div>
          </button>
        </div>

        <div class="text-center">
          <button
            onclick="this.closest('.fixed').remove()"
            class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded transition-colors"
            style="clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)"
          >
            CANCEL
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(selectionDiv);

    // Add wallet connection function to window
    interface WindowWithConnect {
      connectWallet: (walletType: string) => void;
    }

    (window as unknown as WindowWithConnect).connectWallet = (
      walletType: string
    ): void => {
      connectSpecificWallet(walletType);
    };
  };

  const showCustomAlert = (
    title: string,
    message: string,
    showRetry: boolean = false,
    downloadUrl?: string
  ) => {
    // Create custom modal-style alert
    const alertDiv = document.createElement("div");
    alertDiv.className =
      "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";

    const retryButton = showRetry
      ? `
      <button
        onclick="this.closest('.fixed').remove(); window.retryWalletConnection();"
        class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors mr-2"
        style="clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)"
      >
        RETRY
      </button>
    `
      : "";

    const downloadButton = downloadUrl
      ? `
      <button
        onclick="window.open('${downloadUrl}', '_blank'); this.closest('.fixed').remove();"
        class="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors mr-2"
        style="clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)"
      >
        INSTALL
      </button>
    `
      : "";

    alertDiv.innerHTML = `
      <div class="bg-gradient-to-br from-purple-900 to-purple-800 border-2 border-yellow-400 rounded-lg p-6 max-w-md mx-4 shadow-2xl">
        <div class="text-center">
          <h3 class="text-yellow-400 text-xl font-bold mb-3">${title}</h3>
          <p class="text-white text-sm leading-relaxed mb-4 whitespace-pre-line">${message}</p>
          <div class="flex justify-center">
            ${downloadButton}
            ${retryButton}
            <button
              onclick="this.closest('.fixed').remove()"
              class="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2 px-6 rounded transition-colors"
              style="clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)"
            >
              UNDERSTOOD
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(alertDiv);

    // Add retry function to window for the retry button
    if (showRetry) {
      (
        window as unknown as Window & { retryWalletConnection: () => void }
      ).retryWalletConnection = connectWallet;
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setProvider(null);
    
    // Clear cached wallet connection
    localStorage.removeItem('realmkin_cached_wallet');
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
