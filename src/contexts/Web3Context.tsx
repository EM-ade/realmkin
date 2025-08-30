"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
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
  const connectionLockRef = useRef(false);
  const phantomEventListenerRef = useRef<(() => void) | null>(null);

  // Prevent multiple simultaneous connection attempts
  const acquireConnectionLock = () => {
    if (connectionLockRef.current) return false;
    connectionLockRef.current = true;
    return true;
  };

  const releaseConnectionLock = () => {
    connectionLockRef.current = false;
  };

  // Setup Phantom event listeners
  const setupPhantomEventListeners = (phantom: PhantomWallet) => {
    // Remove existing listeners first
    removePhantomEventListeners();

    const handleAccountChanged = (publicKey: unknown) => {
      console.log("🔍 Phantom account changed:", publicKey);
      if (publicKey && typeof publicKey === 'object' && 'toString' in publicKey) {
        const address = publicKey.toString();
        if (isValidSolanaAddress(address)) {
          setAccount(address);
          setIsConnected(true);
          
          // Update cached wallet data
          localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
            type: 'phantom',
            address: address,
            timestamp: Date.now()
          }));
        }
      } else {
        // Account disconnected
        disconnectWallet();
      }
    };

    const handleDisconnect = () => {
      console.log("🔌 Phantom disconnected");
      disconnectWallet();
    };

    // Add new listeners
    if (phantom.on) {
      phantom.on('accountChanged', handleAccountChanged);
      phantom.on('disconnect', handleDisconnect);
    }

    // Store cleanup function
    phantomEventListenerRef.current = () => {
      if (phantom.off) {
        phantom.off('accountChanged', handleAccountChanged);
        phantom.off('disconnect', handleDisconnect);
      }
    };
  };

  const removePhantomEventListeners = () => {
    if (phantomEventListenerRef.current) {
      phantomEventListenerRef.current();
      phantomEventListenerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      removePhantomEventListeners();
    };
  }, []);

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
    if (!acquireConnectionLock()) {
      console.log("🔒 Connection check already in progress");
      return;
    }

    try {
      if (typeof window !== "undefined") {
        const solanaWindow = window as WindowWithSolanaWallets;
        let connectedAddress: string | null = null;
        let walletType: string | null = null;

        // Try Phantom first with better error handling
        if (solanaWindow.phantom?.solana) {
          try {
            const phantom = solanaWindow.phantom.solana;
            
            // Check if already connected
            if (phantom.isConnected) {
              const response = await phantom.connect();
              const address = response.publicKey.toString();

              if (address && isValidSolanaAddress(address)) {
                connectedAddress = address;
                walletType = 'phantom';
                setupPhantomEventListeners(phantom);
              }
            }
          } catch (error) {
            console.log("Phantom connection check failed:", error);
            // Continue to try other wallets
          }
        }

        // Try other wallets if Phantom didn't work
        const walletsToTry = [
          { name: 'solflare', provider: solanaWindow.solflare },
          { name: 'backpack', provider: solanaWindow.backpack },
          { name: 'glow', provider: solanaWindow.glow }
        ];

        for (const wallet of walletsToTry) {
          if (!connectedAddress && wallet.provider) {
            try {
              const response = await wallet.provider.connect();
              const address = response.publicKey.toString();

              if (address && isValidSolanaAddress(address)) {
                connectedAddress = address;
                walletType = wallet.name;
                break;
              }
            } catch (error) {
              console.log(`${wallet.name} connection failed:`, error);
            }
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

        // Check localStorage for cached wallet connection with retry logic
        await checkCachedWalletConnection();
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    } finally {
      releaseConnectionLock();
    }
  };

  const checkCachedWalletConnection = async () => {
    const cachedWallet = localStorage.getItem('realmkin_cached_wallet');
    if (!cachedWallet) return;

    try {
      const walletData = JSON.parse(cachedWallet);
      const cacheAge = Date.now() - walletData.timestamp;

      // Only use cache if it's less than 2 hours old (more generous for mobile)
      if (cacheAge < 7200000) {
        const solanaWindow = window as WindowWithSolanaWallets;
        
        // Try to reconnect based on cached wallet type with retry logic
        const maxRetries = 2;
        let retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            if (walletData.type === 'phantom' && solanaWindow.phantom?.solana) {
              const phantom = solanaWindow.phantom.solana;
              const response = await phantom.connect();
              const address = response.publicKey.toString();

              if (address && isValidSolanaAddress(address)) {
                setAccount(address);
                setIsConnected(true);
                setProvider(null);
                setupPhantomEventListeners(phantom);

                localStorage.setItem('realmkin_cached_wallet', JSON.stringify({
                  type: 'phantom',
                  address: address,
                  timestamp: Date.now()
                }));
                return;
              }
            } else if (walletData.type === 'solflare' && solanaWindow.solflare) {
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
            } else if (walletData.type === 'backpack' && solanaWindow.backpack) {
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
            } else if (walletData.type === 'glow' && solanaWindow.glow) {
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
            }
            break; // Break if wallet type doesn't match
          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
              console.log(`Failed to restore ${walletData.type} connection from cache after ${maxRetries} attempts:`, error);
              break;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
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
  };

  const connectWallet = async () => {
    if (!acquireConnectionLock()) {
      console.log("🔒 Connection already in progress");
      return;
    }

    try {
      if (typeof window === "undefined") {
        showCustomAlert(
          "🔮 REALM ACCESS DENIED",
          "Web3 functionality is not available in this environment."
        );
        return;
      }

      // Show wallet selection popup
      showWalletSelection();
    } finally {
      releaseConnectionLock();
    }
  };

  // Define types for Solana wallet providers
  interface SolanaWalletProvider {
    connect(): Promise<{ publicKey: { toString(): string } }>;
    disconnect?(): Promise<void>;
    isConnected?: boolean;
  }

  interface PhantomWallet extends SolanaWalletProvider {
    isConnected?: boolean;
    on?(event: 'accountChanged' | 'disconnect', callback: (...args: unknown[]) => void): void;
    off?(event: 'accountChanged' | 'disconnect', callback: (...args: unknown[]) => void): void;
  }

  interface WindowWithSolanaWallets extends Window {
    phantom?: {
      solana?: PhantomWallet;
    };
    solflare?: SolanaWalletProvider;
    backpack?: SolanaWalletProvider;
    glow?: SolanaWalletProvider;
  }

  // Enhanced connection function with better error handling and retry logic
  const connectSpecificWallet = async (walletType: string) => {
    if (!acquireConnectionLock()) {
      console.log("🔒 Connection already in progress");
      return;
    }

    setIsConnecting(true);

    try {
      let connectedAddress: string | null = null;
      const solanaWindow = window as WindowWithSolanaWallets;
      const maxRetries = 3;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
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

            // Request connection with timeout
            const connectionPromise = phantom.connect();
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), 10000)
            );

            const response = await Promise.race([connectionPromise, timeoutPromise]);
            connectedAddress = response.publicKey.toString();

            // Validate this is a Solana address
            if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
              throw new Error('Invalid Solana address received from Phantom wallet');
            }

            // Setup event listeners
            setupPhantomEventListeners(phantom);

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

            // Request connection with timeout
            const connectionPromise = solflare.connect();
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), 10000)
            );

            const response = await Promise.race([connectionPromise, timeoutPromise]);
            connectedAddress = response.publicKey.toString();

            if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
              throw new Error('Invalid Solana address received from Solflare wallet');
            }

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

            // Request connection with timeout
            const connectionPromise = backpack.connect();
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), 10000)
            );

            const response = await Promise.race([connectionPromise, timeoutPromise]);
            connectedAddress = response.publicKey.toString();

            if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
              throw new Error('Invalid Solana address received from Backpack wallet');
            }

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

            // Request connection with timeout
            const connectionPromise = glow.connect();
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), 10000)
            );

            const response = await Promise.race([connectionPromise, timeoutPromise]);
            connectedAddress = response.publicKey.toString();

            if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
              throw new Error('Invalid Solana address received from Glow wallet');
            }

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
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error(`Error connecting wallet after ${maxRetries} attempts:`, error);
            
            // Use the utility function to get appropriate error message
            const { title, message, showRetry } = getSolanaConnectionErrorMessage(error as Error);
            showCustomAlert(title, message, showRetry);
            break;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    } finally {
      setIsConnecting(false);
      releaseConnectionLock();
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
