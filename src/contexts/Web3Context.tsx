"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { isValidSolanaAddress } from "@/utils/formatAddress";

// Simple error message function for Solana wallet connections
const getSolanaConnectionErrorMessage = (error: Error): { title: string; message: string; showRetry: boolean } => {
  const errorMessage = error?.message || '';
  
  if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
    return {
      title: "⚔️ CONNECTION REJECTED",
      message: "The wallet guardian has denied access. Please approve the connection request to link your Solana wallet to the Realmkin realm.",
      showRetry: false
    };
  }
  
  if (errorMessage.includes('Invalid Solana address')) {
    return {
      title: "🔮 INVALID WALLET",
      message: "Please ensure you're connecting a valid Solana wallet. This app only supports Solana addresses.",
      showRetry: true
    };
  }
  
  return {
    title: "🔮 CONNECTION FAILED",
    message: "Failed to connect to your Solana wallet. Please try again or ensure Phantom wallet is properly installed.",
    showRetry: true
  };
};

interface Web3ContextType {
  account: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshWalletState: () => Promise<void>;
  provider: null;
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  isConnected: false,
  isConnecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  refreshWalletState: async () => {},
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
  const [provider, setProvider] = useState<null>(null);

  // Check if wallet is already connected on page load
  useEffect(() => {
    checkConnection();
  }, []);

  // Handle page visibility changes (important for mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isConnected) {
        // Page became visible again, refresh wallet state
        console.log("🔍 Web3Context: Page became visible, refreshing wallet state");
        setTimeout(() => {
          checkConnection();
        }, 500); // Small delay to ensure wallet is ready
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected]);

  // Listen for account changes
  useEffect(() => {
    // Note: Phantom doesn't have the same event system as Ethereum wallets
    // We rely on the page visibility change handler for mobile state management
  }, []);

  const checkConnection = async () => {
    try {
      if (typeof window !== "undefined") {
        const solanaWindow = window as WindowWithSolanaWallets;
        let connectedAddress: string | null = null;
        let walletType: string | null = null;

        // Try Phantom first
        if (solanaWindow.phantom?.solana) {
          try {
            const response = await solanaWindow.phantom.solana.connect();
            const address = response.publicKey.toString();

            if (address && isValidSolanaAddress(address)) {
              connectedAddress = address;
              walletType = 'phantom';
            }
          } catch (error) {
            console.log("Phantom not connected:", error);
          }
        }

        // Try Solflare if Phantom didn't work
        if (!connectedAddress && solanaWindow.solflare) {
          try {
            const response = await solanaWindow.solflare.connect();
            const address = response.publicKey.toString();

            if (address && isValidSolanaAddress(address)) {
              connectedAddress = address;
              walletType = 'solflare';
            }
          } catch (error) {
            console.log("Solflare not connected:", error);
          }
        }

        // Try Backpack if others didn't work
        if (!connectedAddress && solanaWindow.backpack) {
          try {
            const response = await solanaWindow.backpack.connect();
            const address = response.publicKey.toString();

            if (address && isValidSolanaAddress(address)) {
              connectedAddress = address;
              walletType = 'backpack';
            }
          } catch (error) {
            console.log("Backpack not connected:", error);
          }
        }

        // Try Glow if others didn't work
        if (!connectedAddress && solanaWindow.glow) {
          try {
            const response = await solanaWindow.glow.connect();
            const address = response.publicKey.toString();

            if (address && isValidSolanaAddress(address)) {
              connectedAddress = address;
              walletType = 'glow';
            }
          } catch (error) {
            console.log("Glow not connected:", error);
          }
        }

        // If we found a connected wallet, set the state
        if (connectedAddress && walletType) {
          setAccount(connectedAddress);
          setIsConnected(true);
          setProvider(null);

          // Update cached wallet data
          localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
            type: walletType,
            address: connectedAddress,
            timestamp: Date.now()
          }));
          return;
        }

        // Check localStorage for cached wallet connection
        const cachedWallet = localStorage.getItem('realmkin_cached_wallet');
        if (cachedWallet) {
          try {
            const walletData = JSON.parse(cachedWallet);
            const cacheAge = Date.now() - walletData.timestamp;

            // Only use cache if it's less than 30 minutes old
            if (cacheAge < 1800000) {
              // Try to reconnect based on cached wallet type
              if (walletData.type === 'phantom' && solanaWindow.phantom?.solana) {
                try {
                  const response = await solanaWindow.phantom.solana.connect();
                  const address = response.publicKey.toString();

                  if (address && isValidSolanaAddress(address)) {
                    setAccount(address);
                    setIsConnected(true);
                    setProvider(null);

                    localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
                      type: 'phantom',
                      address: address,
                      timestamp: Date.now()
                    }));
                    return;
                  }
                } catch (error) {
                  console.log("Failed to restore Phantom connection from cache:", error);
                }
              } else if (walletData.type === 'solflare' && solanaWindow.solflare) {
                try {
                  const response = await solanaWindow.solflare.connect();
                  const address = response.publicKey.toString();

                  if (address && isValidSolanaAddress(address)) {
                    setAccount(address);
                    setIsConnected(true);
                    setProvider(null);

                    localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
                      type: 'solflare',
                      address: address,
                      timestamp: Date.now()
                    }));
                    return;
                  }
                } catch (error) {
                  console.log("Failed to restore Solflare connection from cache:", error);
                }
              } else if (walletData.type === 'backpack' && solanaWindow.backpack) {
                try {
                  const response = await solanaWindow.backpack.connect();
                  const address = response.publicKey.toString();

                  if (address && isValidSolanaAddress(address)) {
                    setAccount(address);
                    setIsConnected(true);
                    setProvider(null);

                    localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
                      type: 'backpack',
                      address: address,
                      timestamp: Date.now()
                    }));
                    return;
                  }
                } catch (error) {
                  console.log("Failed to restore Backpack connection from cache:", error);
                }
              } else if (walletData.type === 'glow' && solanaWindow.glow) {
                try {
                  const response = await solanaWindow.glow.connect();
                  const address = response.publicKey.toString();

                  if (address && isValidSolanaAddress(address)) {
                    setAccount(address);
                    setIsConnected(true);
                    setProvider(null);

                    localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
                      type: 'glow',
                      address: address,
                      timestamp: Date.now()
                    }));
                    return;
                  }
                } catch (error) {
                  console.log("Failed to restore Glow connection from cache:", error);
                }
              }
            } else {
              // Cache is too old, remove it
              localStorage.removeItem('realmkin_cached_wallet');
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

  // Define types for Solana wallet providers
  interface SolanaWalletProvider {
    connect(): Promise<{ publicKey: { toString(): string } }>;
    disconnect?(): Promise<void>;
    isConnected?: boolean;
  }

  interface PhantomWallet extends SolanaWalletProvider {
    isConnected?: boolean;
  }

  interface WindowWithSolanaWallets extends Window {
    phantom?: {
      solana?: PhantomWallet;
    };
    solflare?: SolanaWalletProvider;
    backpack?: SolanaWalletProvider;
    glow?: SolanaWalletProvider;
  }

  // Enhanced connection function with better error handling
  const connectSpecificWallet = async (walletType: string) => {
    setIsConnecting(true);

    try {
      let connectedAddress: string | null = null;
      const solanaWindow = window as WindowWithSolanaWallets;

      if (walletType === "phantom") {
        // Check if Phantom is available
        if (typeof solanaWindow === "undefined" || !solanaWindow.phantom?.solana) {
          showCustomAlert(
            "👻 PHANTOM NOT FOUND",
            "Phantom wallet is not installed. Please install Phantom extension and try again.",
            false,
            "https://phantom.app/"
          );
          return;
        }

        const phantom = solanaWindow.phantom.solana as PhantomWallet;

        // Request connection
        const response = await phantom.connect();
        connectedAddress = response.publicKey.toString();

        // Validate this is a Solana address
        if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
          throw new Error('Invalid Solana address received from Phantom wallet');
        }

        // Cache the wallet connection
        localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
          type: 'phantom',
          address: connectedAddress,
          timestamp: Date.now()
        }));

        setAccount(connectedAddress);
        setIsConnected(true);
        setProvider(null);
        return;
      } else if (walletType === "solflare") {
        // Check if Solflare is available
        if (typeof solanaWindow === "undefined" || !solanaWindow.solflare) {
          showCustomAlert(
            "🔥 SOLFLARE NOT FOUND",
            "Solflare wallet is not installed. Please install Solflare extension and try again.",
            false,
            "https://solflare.com/"
          );
          return;
        }

        const solflare = solanaWindow.solflare as SolanaWalletProvider;

        // Connect to Solflare (Solana)
        const response = await solflare.connect();
        connectedAddress = response.publicKey.toString();

        // Validate this is a Solana address
        if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
          throw new Error('Invalid Solana address received from Solflare wallet');
        }

        // Cache the wallet connection
        localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
          type: 'solflare',
          address: connectedAddress,
          timestamp: Date.now()
        }));

        setAccount(connectedAddress);
        setIsConnected(true);
        setProvider(null);
        return;
      } else if (walletType === "backpack") {
        // Check if Backpack is available
        if (typeof solanaWindow === "undefined" || !solanaWindow.backpack) {
          showCustomAlert(
            "🎒 BACKPACK NOT FOUND",
            "Backpack wallet is not installed. Please install Backpack extension and try again.",
            false,
            "https://backpack.app/"
          );
          return;
        }

        const backpack = solanaWindow.backpack as SolanaWalletProvider;

        // Connect to Backpack (Solana)
        const response = await backpack.connect();
        connectedAddress = response.publicKey.toString();

        // Validate this is a Solana address
        if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
          throw new Error('Invalid Solana address received from Backpack wallet');
        }

        // Cache the wallet connection
        localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
          type: 'backpack',
          address: connectedAddress,
          timestamp: Date.now()
        }));

        setAccount(connectedAddress);
        setIsConnected(true);
        setProvider(null);
        return;
      } else if (walletType === "glow") {
        // Check if Glow is available
        if (typeof solanaWindow === "undefined" || !solanaWindow.glow) {
          showCustomAlert(
            "✨ GLOW NOT FOUND",
            "Glow wallet is not installed. Please install Glow extension and try again.",
            false,
            "https://glow.app/"
          );
          return;
        }

        const glow = solanaWindow.glow as SolanaWalletProvider;

        // Connect to Glow (Solana)
        const response = await glow.connect();
        connectedAddress = response.publicKey.toString();

        // Validate this is a Solana address
        if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
          throw new Error('Invalid Solana address received from Glow wallet');
        }

        // Cache the wallet connection
        localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
          type: 'glow',
          address: connectedAddress,
          timestamp: Date.now()
        }));

        setAccount(connectedAddress);
        setIsConnected(true);
        setProvider(null);
        return;
      } else {
        showCustomAlert(
          "🔮 UNSUPPORTED WALLET",
          "This wallet type is not supported. Please use Phantom, Solflare, Backpack, or Glow."
        );
        return;
      }
    } catch (error: unknown) {
      console.error("Error connecting wallet:", error);

      // Use the utility function to get appropriate error message
      const { title, message, showRetry } = getSolanaConnectionErrorMessage(error as Error);
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
          <h3 class="text-yellow-400 text-2xl font-bold mb-2">🔮 CONNECT SOLANA WALLET</h3>
          <p class="text-white text-sm">Choose your preferred Solana wallet to enter the Realmkin realm</p>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
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

          <!-- Solflare -->
          <button
            onclick="window.connectWallet('solflare'); this.closest('.fixed').remove();"
            class="bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 border-2 border-yellow-400 text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <div class="flex flex-col items-center space-y-2">
              <div class="text-3xl">🔥</div>
              <span class="text-sm">Solflare</span>
            </div>
          </button>

          <!-- Backpack -->
          <button
            onclick="window.connectWallet('backpack'); this.closest('.fixed').remove();"
            class="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-2 border-yellow-400 text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <div class="flex flex-col items-center space-y-2">
              <div class="text-3xl">🎒</div>
              <span class="text-sm">Backpack</span>
            </div>
          </button>

          <!-- Glow -->
          <button
            onclick="window.connectWallet('glow'); this.closest('.fixed').remove();"
            class="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border-2 border-yellow-400 text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <div class="flex flex-col items-center space-y-2">
              <div class="text-3xl">✨</div>
              <span class="text-sm">Glow</span>
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

  const refreshWalletState = async () => {
    await checkConnection();
  };

  const value = {
    account,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    refreshWalletState,
    provider,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
