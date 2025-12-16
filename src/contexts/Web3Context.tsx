"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import { isValidSolanaAddress } from "@/utils/formatAddress";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { dataRepairService } from "@/services/dataRepairService";
import { logger } from "@/lib/logger";

// Import onboarding context type
declare global {
  interface Window {
    __realmkin_onboarding_trigger?: (step: string) => void;
  }
}

// Debug mode: hardcode wallet address for testing
const DEBUG_WALLET_ADDRESS = "7";
const ENABLE_DEBUG_MODE = false; // Set to false in production

// Enhanced error message function for Solana wallet connections with mobile support
interface ConnectionErrorResponse {
  title: string;
  message: string;
  showRetry: boolean;
  downloadUrl?: string;
}

const getSolanaConnectionErrorMessage = (
  error: Error,
  isMobile: boolean = false,
): ConnectionErrorResponse => {
  const errorMessage = error?.message || "";

  if (
    errorMessage.includes("User rejected") ||
    errorMessage.includes("User denied")
  ) {
    return {
      title: "⚔️ CONNECTION REJECTED",
      message:
        "The wallet guardian has denied access. Please approve the connection request to link your Solana wallet to the Realmkin realm.",
      showRetry: false,
    };
  }

  if (errorMessage.includes("Invalid Solana address")) {
    return {
      title: "🔮 INVALID WALLET",
      message:
        "Please ensure you're connecting a valid Solana wallet. This app only supports Solana addresses.",
      showRetry: true,
    };
  }

  if (errorMessage.includes("Connection timeout")) {
    return {
      title: "⏰ CONNECTION TIMEOUT",
      message: isMobile
        ? "Wallet connection timed out. This can happen when switching between browser and wallet app. Please ensure you return to the browser after approving the connection in Phantom."
        : "Wallet connection timed out. This can happen when the wallet app is slow to respond. Please try again.",
      showRetry: true,
    };
  }

  if (errorMessage.includes("Mobile connection failed")) {
    return {
      title: "📱 MOBILE CONNECTION ISSUE",
      message:
        "Failed to connect on mobile. Please ensure you have the Phantom app installed and try again. If the issue persists, try clearing your browser cache.",
      showRetry: true,
    };
  }

  if (errorMessage.includes("network") || errorMessage.includes("connection")) {
    return {
      title: "🌐 NETWORK ISSUE",
      message:
        "Network connection issue detected. Please check your internet connection and try again.",
      showRetry: true,
    };
  }

  if (
    errorMessage.includes("not found") ||
    errorMessage.includes("unavailable")
  ) {
    return {
      title: isMobile ? "📱 PHANTOM APP REQUIRED" : "🔌 WALLET UNAVAILABLE",
      message: isMobile
        ? "Phantom app not found. Please install Phantom from the App Store or Google Play Store to connect your wallet."
        : "Wallet extension not detected. Please ensure your wallet is installed and enabled.",
      showRetry: false,
      downloadUrl: isMobile ? "https://phantom.app/download" : undefined,
    };
  }

  return {
    title: isMobile ? "📱 MOBILE CONNECTION FAILED" : "🔮 CONNECTION FAILED",
    message: isMobile
      ? "Failed to connect to your Phantom wallet on mobile. This could be due to app switching issues. Please try again and ensure you return to the browser after approving the connection."
      : "Failed to connect to your Solana wallet. Please try again or ensure your wallet is properly installed.",
    showRetry: true,
  };
};

// Detect if running on mobile device
const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
};

interface Web3ContextType {
  account: string | null;
  uid: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshWalletState: () => Promise<void>;
  provider: null;
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  uid: null,
  isConnected: false,
  isConnecting: false,
  connectWallet: async () => { },
  disconnectWallet: () => { },
  refreshWalletState: async () => { },
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
  const [uid, setUid] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<null>(null);
  const connectionLockRef = useRef(false);
  const phantomEventListenerRef = useRef<(() => void) | null>(null);

  // Debug mode: override wallet address with hardcoded value
  useEffect(() => {
    if (ENABLE_DEBUG_MODE) {
      setAccount(DEBUG_WALLET_ADDRESS);
      setIsConnected(true);
      // Auto-authenticate with Firebase for debug wallet
      autoAuthenticateFirebase(DEBUG_WALLET_ADDRESS);
    }
  }, []);

  // Bridge to Solana Wallet Adapter state
  const {
    publicKey,
    connected,
    connecting,
    select: selectWallet,
    connect: connectAdapter,
    disconnect: adapterDisconnect,
    wallet,
    wallets,
  } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const router = useRouter();

  // Auto-authenticate with Firebase when wallet connects
  const autoAuthenticateFirebase = useCallback(async (walletAddress: string) => {
    try {
      // Validate wallet address using Solana's PublicKey constructor
      try {
        new PublicKey(walletAddress); // This will throw if invalid
      } catch (e) {
        console.error("Invalid Solana wallet address:", walletAddress);
        throw new Error("Invalid Solana wallet address");
      }

      const auth = getAuth();

      if (auth.currentUser) {
        if (auth.currentUser.uid) {
          setUid(auth.currentUser.uid);

          // Repair user data if needed
          try {
            await dataRepairService.repairUsernameMapping(auth.currentUser.uid);
          } catch (repairError) {
            console.warn("Failed to repair user data:", repairError);
          }

          return;
        }
      }

      // Use lowercase for email only, keep original case for wallet address
      const tempEmail = `${walletAddress.toLowerCase()}@wallet.realmkin.com`;
      const tempPassword = walletAddress;

      logger.debug(`🔐 Authenticating wallet: ${walletAddress}`);

      // Check if we're in onboarding - if so, don't navigate
      const isOnboarding = localStorage.getItem("onboarding_active") === "true";

      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          tempEmail,
          tempPassword,
        );
        setUid(userCredential.user.uid);

        // Store wallet address in original case (Solana addresses are case-sensitive)
        const walletLower = walletAddress.toLowerCase();

        // Ensure wallet mapping exists (lowercased key for lookup, but store original case)
        const walletDocRef = doc(db, "wallets", walletLower);
        const walletDoc = await getDoc(walletDocRef);
        if (!walletDoc.exists()) {
          console.log("📝 Creating missing wallet mapping...");
          await setDoc(walletDocRef, {
            uid: userCredential.user.uid,
            walletAddress: walletAddress, // Store in original case
            createdAt: new Date(),
          });
          console.log("✅ Wallet mapping created");
        }

        // Ensure user profile exists with proper username validation
        try {
          const userDocRef = doc(db, "users", userCredential.user.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            console.log("📝 Creating missing user profile...");
            await setDoc(userDocRef, {
              walletAddress: walletAddress, // Store in original case
              createdAt: new Date(),
            });
            console.log("✅ User profile created");
          } else {
            // Check if user has a username set
            const userData = userDoc.data();
            if (!userData?.username) {
              console.warn("User profile exists but missing username");
              // Try to repair username mapping
              try {
                const repaired = await dataRepairService.repairUsernameMapping(userCredential.user.uid);
                if (repaired) {
                  console.log("✅ Username mapping repaired during login");
                }
              } catch (repairError) {
                console.warn("Failed to repair username mapping:", repairError);
              }

              // Don't redirect during onboarding
              if (!isOnboarding) {
                // Set a flag to indicate incomplete setup
                localStorage.setItem("realmkin_incomplete_setup", "true");
              }
            }
          }
        } catch (profileErr) {
          console.warn("⚠️ Failed to ensure user profile exists:", profileErr);
        }

        console.log("✅ Sign-in successful");
      } catch (error: unknown) {
        const authError = error as { code?: string };
        if (
          authError.code === "auth/user-not-found" ||
          authError.code === "auth/invalid-credential"
        ) {
          console.log("ℹ️ No account found. Attempting to create profile...");
          try {
            // Try to create a new account instead of redirecting
            const newUserCredential = await createUserWithEmailAndPassword(
              auth,
              tempEmail,
              tempPassword,
            );
            setUid(newUserCredential.user.uid);

            // Create wallet mapping (lowercased key for lookup, but store original case)
            const walletLower = walletAddress.toLowerCase();
            const walletDocRef = doc(db, "wallets", walletLower);
            await setDoc(walletDocRef, {
              uid: newUserCredential.user.uid,
              walletAddress: walletAddress, // Store in original case
              createdAt: new Date(),
            });

            // Create user profile
            const userDocRef = doc(db, "users", newUserCredential.user.uid);
            await setDoc(userDocRef, {
              walletAddress: walletAddress, // Store in original case
              createdAt: new Date(),
            });

            console.log("✅ New account created successfully");
          } catch (createErr) {
            console.error("🚨 Failed to create account:", createErr);

            // Instead of redirecting to login, trigger onboarding at wallet step
            console.log("🔄 Triggering onboarding wizard at wallet connection step...");

            // Check if we have onboarding trigger available
            if (typeof window !== 'undefined' && window.__realmkin_onboarding_trigger) {
              window.__realmkin_onboarding_trigger('wallet');
            } else {
              // Fallback: Only redirect if we're not already on the login page and not during onboarding
              if (!window.location.pathname.includes("/login") && !isOnboarding) {
                router.push(`/login?wallet=${walletAddress}`);
              }
            }
          }
        } else {
          console.error("🚨 Firebase sign-in error:", error);
        }
      }
    } catch (error) {
      console.error("🚨 Auto-authentication process failed:", error);
    }
  }, [router]);

  // Sync adapter state into this context (with debouncing to prevent race conditions)
  useEffect(() => {
    console.log("🔄 [Wallet Sync] State changed:", {
      publicKey: publicKey?.toString(),
      connected,
      connecting,
      wallet: wallet?.adapter.name,
    });

    // Debounce rapid state changes to prevent race conditions
    const timeoutId = setTimeout(async () => {
      try {
        // Only show connecting state if we actually have a reason to believe we're connecting
        // (i.e., we have a cached wallet or the adapter is truly connecting)
        const hasCachedWallet = typeof window !== 'undefined' && !!localStorage.getItem("realmkin_cached_wallet");
        setIsConnecting(Boolean(connecting && (hasCachedWallet || connected)));
        if (publicKey) {
          console.log("✅ [Wallet Sync] Public key detected:", publicKey.toString());
          const address =
            (
              publicKey as unknown as {
                toBase58?: () => string;
                toString: () => string;
              }
            ).toBase58?.() ?? publicKey.toString();

          // Validate wallet address using Solana's PublicKey constructor
          try {
            new PublicKey(address); // This will throw if invalid
          } catch (e) {
            console.error("Invalid Solana wallet address from wallet adapter:", address);
            setAccount(null);
            setUid(null);
            setIsConnected(false);
            return;
          }

          if (address && isValidSolanaAddress(address)) {
            // Only update if address actually changed (prevent unnecessary rerenders)
            setAccount(prevAccount => prevAccount === address ? prevAccount : address);
            setIsConnected(true);

            // Cache connection for faster reloads
            localStorage.setItem(
              "realmkin_cached_wallet",
              JSON.stringify({
                type: "adapter",
                address,
                timestamp: Date.now(),
              }),
            );

            // Auto-authenticate with Firebase (AWAIT to ensure auth completes before navigation)
            console.log("🔐 Starting Firebase authentication for wallet:", address);

            // Show toast notification for better UX
            try {
              const toast = (await import('react-hot-toast')).default;
              toast.loading('Authenticating wallet...', {
                id: 'wallet-auth',
                duration: 2000,
              });
            } catch (e) {
              console.warn("Failed to show toast:", e);
            }

            await autoAuthenticateFirebase(address);
            console.log("✅ Firebase authentication completed");

            // Show success toast
            try {
              const toast = (await import('react-hot-toast')).default;
              toast.success('Wallet connected successfully!', {
                id: 'wallet-auth',
                duration: 2000,
              });
            } catch (e) {
              console.warn("Failed to show success toast:", e);
            }
          }
        } else if (connected === false) {
          // Only clear state if adapter explicitly disconnected
          setAccount(null);
          setUid(null);
          setIsConnected(false);
        }
      } catch (e) {
        console.log("Wallet adapter sync error:", e);
      }
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [publicKey, connected, connecting, autoAuthenticateFirebase]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      if (phantomEventListenerRef.current) {
        console.log("🧹 Cleaning up Phantom event listeners");
        phantomEventListenerRef.current();
        phantomEventListenerRef.current = null;
      }
    };
  }, []);

  // Prevent multiple simultaneous connection attempts
  const acquireConnectionLock = () => {
    if (connectionLockRef.current) {
      console.log("🔒 Connection attempt already in progress");
      return false;
    }
    connectionLockRef.current = true;
    // Auto-release lock after 5 seconds to prevent deadlocks
    setTimeout(() => {
      if (connectionLockRef.current) {
        console.log("🔓 Connection lock auto-released after timeout");
        connectionLockRef.current = false;
      }
    }, 5000);
    return true;
  };

  const releaseConnectionLock = () => {
    connectionLockRef.current = false;
  };

  // Check connection on mount (only if not already connected via adapter)
  useEffect(() => {
    // Wait a bit for wallet adapter to initialize
    const timeoutId = setTimeout(() => {
      // Only check cached connection if adapter hasn't connected yet
      if (!publicKey && !connected) {
        checkConnection();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [publicKey, connected]);

  // Setup Phantom event listeners
  const setupPhantomEventListeners = (phantom: PhantomWallet) => {
    // Remove existing listeners first
    removePhantomEventListeners();

    const handleAccountChanged = (publicKey: unknown) => {
      console.log("🔍 Phantom account changed:", publicKey);
      if (
        publicKey &&
        typeof publicKey === "object" &&
        "toString" in publicKey
      ) {
        const address = publicKey.toString();
        if (isValidSolanaAddress(address)) {
          setAccount(address);
          setIsConnected(true);

          // Update cached wallet data
          localStorage.setItem(
            "realmkin_cached_wallet",
            JSON.stringify({
              type: "phantom",
              address: address,
              timestamp: Date.now(),
            }),
          );
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
      phantom.on("accountChanged", handleAccountChanged);
      phantom.on("disconnect", handleDisconnect);
    }

    // Store cleanup function
    phantomEventListenerRef.current = () => {
      if (phantom.off) {
        phantom.off("accountChanged", handleAccountChanged);
        phantom.off("disconnect", handleDisconnect);
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

  async function checkConnection() {
    // Add debounce to prevent excessive connection checks
    const now = Date.now();
    const lastCheck = parseInt(localStorage.getItem("last_connection_check") || "0");
    if (now - lastCheck < 2000) {
      console.log("⏱️ Skipping connection check (too frequent)");
      return;
    }
    localStorage.setItem("last_connection_check", now.toString());

    if (!acquireConnectionLock()) {
      console.log("🔒 Connection check already in progress");
      return;
    }

    try {
      if (typeof window !== "undefined") {
        const solanaWindow = window as Window & ExtendedWindow;
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
                walletType = "phantom";
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
          { name: "solflare", provider: solanaWindow.solflare },
          { name: "backpack", provider: solanaWindow.backpack },
          { name: "glow", provider: solanaWindow.glow },
        ];

        for (const wallet of walletsToTry) {
          if (!connectedAddress && wallet.provider) {
            try {
              const response = await wallet.provider.connect();
              let address: string | null = null;

              // Handle different wallet response types
              if (wallet.name === "solflare") {
                // Type narrow to SolflareWallet
                const solflareProvider = wallet.provider as SolflareWallet;
                // Solflare returns boolean and stores publicKey on the wallet object
                if (response === true && solflareProvider.publicKey) {
                  address = solflareProvider.publicKey.toString();
                }
              } else {
                // Other wallets return object with publicKey property
                address =
                  (
                    response as { publicKey?: { toString(): string } | string }
                  )?.publicKey?.toString() || null;
              }

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
          localStorage.setItem(
            "realmkin_cached_wallet",
            JSON.stringify({
              type: walletType,
              address: connectedAddress,
              timestamp: Date.now(),
            }),
          );

          // Auto-authenticate with Firebase
          await autoAuthenticateFirebase(connectedAddress);
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
  }

  const checkCachedWalletConnection = async () => {
    const cachedWallet = localStorage.getItem("realmkin_cached_wallet");
    if (!cachedWallet) return;

    try {
      const walletData = JSON.parse(cachedWallet);
      const cacheAge = Date.now() - walletData.timestamp;

      // Only use cache if it's less than 15 minutes old
      if (cacheAge < 900000) {
        const solanaWindow = window as Window & ExtendedWindow;

        // Try to reconnect based on cached wallet type with retry logic
        const maxRetries = 2;
        let retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            if (walletData.type === "phantom" && solanaWindow.phantom?.solana) {
              const phantom = solanaWindow.phantom.solana;
              const response = await phantom.connect();
              const address = response.publicKey.toString();

              if (address && isValidSolanaAddress(address)) {
                setAccount(address);
                setIsConnected(true);
                setProvider(null);
                setupPhantomEventListeners(phantom);

                localStorage.setItem(
                  "realmkin_cached_wallet",
                  JSON.stringify({
                    type: "phantom",
                    address: address,
                    timestamp: Date.now(),
                  }),
                );
                return;
              }
            } else if (
              walletData.type === "solflare" &&
              solanaWindow.solflare
            ) {
              const response = await solanaWindow.solflare.connect();
              let address: string | null = null;

              // Solflare returns boolean and stores publicKey on the wallet object
              if (response === true && solanaWindow.solflare.publicKey) {
                address = solanaWindow.solflare.publicKey.toString();
              }

              if (address && isValidSolanaAddress(address)) {
                setAccount(address);
                setIsConnected(true);
                setProvider(null);

                localStorage.setItem(
                  "realmkin_cached_wallet",
                  JSON.stringify({
                    type: "solflare",
                    address: address,
                    timestamp: Date.now(),
                  }),
                );
                return;
              }
            } else if (
              walletData.type === "backpack" &&
              solanaWindow.backpack
            ) {
              const response = await solanaWindow.backpack.connect();
              const address = response.publicKey.toString();

              if (address && isValidSolanaAddress(address)) {
                setAccount(address);
                setIsConnected(true);
                setProvider(null);

                localStorage.setItem(
                  "realmkin_cached_wallet",
                  JSON.stringify({
                    type: "backpack",
                    address: address,
                    timestamp: Date.now(),
                  }),
                );
                return;
              }
            } else if (walletData.type === "glow" && solanaWindow.glow) {
              const response = await solanaWindow.glow.connect();
              const address = response.publicKey.toString();

              if (address && isValidSolanaAddress(address)) {
                setAccount(address);
                setIsConnected(true);
                setProvider(null);

                localStorage.setItem(
                  "realmkin_cached_wallet",
                  JSON.stringify({
                    type: "glow",
                    address: address,
                    timestamp: Date.now(),
                  }),
                );
                return;
              }
            }
            break; // Break if wallet type doesn't match
          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
              console.log(
                `Failed to restore ${walletData.type} connection from cache after ${maxRetries} attempts:`,
                error,
              );
              break;
            }
            // Wait before retrying (exponential backoff)
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * retryCount),
            );
          }
        }
      } else {
        // Cache is too old, remove it
        localStorage.removeItem("realmkin_cached_wallet");
      }
    } catch (error) {
      console.log("Failed to restore cached wallet:", error);
      localStorage.removeItem("realmkin_cached_wallet");
    }
  };

  const connectWallet = async () => {
    // Check if already connected via adapter
    if (publicKey && connected) {
      logger.debug("✅ Wallet already connected via adapter");
      return;
    }

    if (!acquireConnectionLock()) {
      logger.debug("🔒 Connection already in progress");
      // Show user feedback
      try {
        const toast = (await import('react-hot-toast')).default;
        toast("Wallet connection in progress, please wait...", {
          duration: 2000,
          id: 'connection-in-progress',
          icon: 'ℹ️',
        });
      } catch (e) {
        console.warn("Failed to show toast:", e);
      }
      return;
    }

    setIsConnecting(true);

    try {
      if (typeof window === "undefined") {
        showCustomAlert(
          "🔮 REALM ACCESS DENIED",
          "Web3 functionality is not available in this environment.",
        );
        setIsConnecting(false);
        return;
      }

      // Check for Brave Wallet interference
      const solanaWindow = window as Window & ExtendedWindow;
      interface SolanaProviderCheck {
        isBraveWallet?: boolean;
        isPhantom?: boolean;
      }
      const solanaProvider = (window as { solana?: SolanaProviderCheck })
        .solana;

      if (solanaProvider?.isBraveWallet && !solanaProvider?.isPhantom) {
        console.warn("⚠️ Brave Wallet detected - may interfere with Phantom");

        // Check if Phantom is available at its dedicated namespace
        if (!solanaWindow.phantom?.solana) {
          showCustomAlert(
            "⚠️ BRAVE WALLET DETECTED",
            "Brave Wallet is blocking other wallets. Please disable it at brave://settings/wallet and set both Ethereum and Solana default wallets to 'None', then restart your browser.",
          );
          releaseConnectionLock();
          return;
        }
      }

      // Prefer opening the official adapter modal directly (we are inside WalletModalProvider)
      let opened = false;
      try {
        if (setWalletModalVisible) {
          console.log("🔔 Opening Solana Wallet Adapter modal via context");
          console.log("📋 Available wallets:", wallets?.map(w => w.adapter.name));
          console.log("🔌 Currently selected wallet:", wallet?.adapter.name);

          setWalletModalVisible(true);
          opened = true;

          // Wait for user to select and connect a wallet
          // The modal will handle wallet selection and connection internally
          console.log("⏳ Waiting for user to select a wallet...");
        }
      } catch (e) {
        console.warn("⚠️ Failed to open adapter modal via context:", e);
      }

      if (!opened) {
        try {
          console.log("🔔 Dispatching event to open adapter modal");
          window.dispatchEvent(new Event("realmkin:open-wallet-modal"));
          opened = true;

          // Add a small delay to ensure modal opens before releasing lock
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (e) {
          console.warn("⚠️ Failed to open adapter modal via event:", e);
        }
      }

      if (!opened) {
        console.log("🔁 Falling back to custom wallet selector");
        showWalletSelection();
      } else {
        // Verify modal appeared; if not, fallback quickly for reliability
        setTimeout(() => {
          try {
            const modalPresent = !!document.querySelector(
              '[class*="wallet-adapter"]',
            );
            if (!modalPresent) {
              console.log(
                "⚠️ Adapter modal not detected in DOM; showing custom selector as fallback",
              );
              showWalletSelection();
            }
          } catch {
            console.log(
              "Modal presence check failed; showing fallback selector",
            );
            showWalletSelection();
          }
        }, 400);
      }
    } finally {
      setIsConnecting(false);
      releaseConnectionLock();
    }
  };

  // Define types for Solana wallet providers with their specific response structures
  interface PhantomWallet {
    connect(): Promise<{ publicKey: { toString(): string } }>;
    disconnect?(): Promise<void>;
    isConnected?: boolean;
    on?(
      event: "accountChanged" | "disconnect",
      callback: (...args: unknown[]) => void,
    ): void;
    off?(
      event: "accountChanged" | "disconnect",
      callback: (...args: unknown[]) => void,
    ): void;
  }

  interface SolflareWallet {
    connect(): Promise<boolean>;
    disconnect?(): Promise<void>;
    isConnected?: boolean;
    publicKey?: { toString(): string };
  }

  interface BackpackWallet {
    connect(): Promise<{ publicKey: string }>;
    disconnect?(): Promise<void>;
    isConnected?: boolean;
  }

  interface GlowWallet {
    connect(): Promise<{ publicKey: string }>;
    disconnect?(): Promise<void>;
    isConnected?: boolean;
  }

  // Use global Window type with additional wallet properties
  // Note: Window.phantom is already defined in phantom.d.ts
  interface ExtendedWindow {
    solflare?: SolflareWallet;
    backpack?: BackpackWallet;
    glow?: GlowWallet;
  }

  // Helper function to extract address from wallet response
  const extractAddressFromResponse = (
    response: unknown,
    walletType: string,
  ): string | null => {
    try {
      switch (walletType) {
        case "phantom":
          // Phantom returns { publicKey: { toString() } }
          return (
            (
              response as { publicKey?: { toString(): string } }
            )?.publicKey?.toString() || null
          );
        case "solflare":
          // Solflare returns { publicKey: string } directly
          return (response as { publicKey?: string })?.publicKey || null;
        case "backpack":
          // Backpack returns { publicKey: string } directly
          return (response as { publicKey?: string })?.publicKey || null;
        case "glow":
          // Glow returns { publicKey: string } directly
          return (response as { publicKey?: string })?.publicKey || null;
        default:
          return null;
      }
    } catch (error) {
      console.error(
        `Error extracting address from ${walletType} response:`,
        error,
      );
      return null;
    }
  };

  // Enhanced connection function with better error handling and retry logic
  const connectSpecificWallet = async (walletType: string) => {
    if (!acquireConnectionLock()) {
      console.log("🔒 Connection already in progress");
      return;
    }

    setIsConnecting(true);

    try {
      let connectedAddress: string | null = null;
      const solanaWindow = window as Window & ExtendedWindow;
      const maxRetries = 3;
      let retryCount = 0;
      const isMobile = isMobileDevice();
      // const isPhantomMobile = isPhantomMobileBrowser();

      while (retryCount < maxRetries) {
        try {
          if (walletType === "phantom") {
            // Check if Phantom is available
            if (
              typeof solanaWindow === "undefined" ||
              !solanaWindow.phantom?.solana
            ) {
              // For mobile, check if we should use deep linking
              if (isMobile) {
                showCustomAlert(
                  "📱 PHANTOM APP REQUIRED",
                  "Phantom app not found. Please install Phantom from the App Store or Google Play Store to connect your wallet.",
                  false,
                  "https://phantom.app/download",
                );
                return;
              } else {
                showCustomAlert(
                  "👻 PHANTOM NOT FOUND",
                  "Phantom wallet is not installed. Please install Phantom extension and try again.",
                  false,
                  "https://phantom.app/",
                );
                return;
              }
            }

            const phantom = solanaWindow.phantom.solana as PhantomWallet;

            // Special handling for mobile devices
            if (isMobile) {
              console.log(
                "📱 Mobile device detected, using mobile connection flow",
              );

              // For mobile, we need to handle the connection differently
              // Use a longer timeout for mobile since users need to switch apps
              const connectionPromise = phantom.connect();
              const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Connection timeout")), 15000),
              );

              const response = await Promise.race([
                connectionPromise,
                timeoutPromise,
              ]);
              connectedAddress = response.publicKey.toString();
            } else {
              // Standard desktop connection
              const connectionPromise = phantom.connect();
              const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(
                  () => reject(new Error("Connection timeout")),
                  10000,
                ),
              );

              const response = await Promise.race([
                connectionPromise,
                timeoutPromise,
              ]);
              connectedAddress = response.publicKey.toString();
            }

            // Validate this is a Solana address
            if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
              throw new Error(
                "Invalid Solana address received from Phantom wallet",
              );
            }

            // Setup event listeners (only for desktop)
            if (!isMobile) {
              setupPhantomEventListeners(phantom);
            }

            // Cache the wallet connection - use sessionStorage for mobile for better reliability
            const storage = isMobile ? sessionStorage : localStorage;
            storage.setItem(
              "realmkin_cached_wallet",
              JSON.stringify({
                type: "phantom",
                address: connectedAddress,
                timestamp: Date.now(),
                isMobile: isMobile,
              }),
            );

            setAccount(connectedAddress);
            setIsConnected(true);
            setProvider(null);

            // Auto-authenticate with Firebase
            await autoAuthenticateFirebase(connectedAddress);
            return;
          } else if (walletType === "solflare") {
            // Check if Solflare is available
            if (typeof solanaWindow === "undefined" || !solanaWindow.solflare) {
              showCustomAlert(
                "🔥 SOLFLARE NOT FOUND",
                "Solflare wallet is not installed. Please install Solflare extension and try again.",
                false,
                "https://solflare.com/",
              );
              return;
            }

            const solflare = solanaWindow.solflare as SolflareWallet;

            // Request connection with timeout
            const connectionPromise = solflare.connect();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Connection timeout")), 10000),
            );

            const response = await Promise.race([
              connectionPromise,
              timeoutPromise,
            ]);

            console.log("🔍 Solflare connection response:", response);
            console.log(
              "🔍 Solflare wallet object after connection:",
              solflare,
            );

            // Solflare returns boolean true on success, and stores publicKey on the wallet object
            if (response === true && solflare.publicKey) {
              connectedAddress = solflare.publicKey.toString();
              console.log(
                "🔍 Solflare publicKey from wallet object:",
                connectedAddress,
              );
            } else {
              console.error(
                "❌ Solflare connection failed or publicKey not available",
              );
              throw new Error(
                "Solflare connection failed or publicKey not available",
              );
            }

            if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
              console.error(
                "❌ Invalid Solana address from Solflare:",
                connectedAddress,
              );
              throw new Error(
                "Invalid Solana address received from Solflare wallet",
              );
            }

            localStorage.setItem(
              "realmkin_cached_wallet",
              JSON.stringify({
                type: "solflare",
                address: connectedAddress,
                timestamp: Date.now(),
                isMobile: isMobile,
              }),
            );

            setAccount(connectedAddress);
            setIsConnected(true);
            setProvider(null);

            // Auto-authenticate with Firebase
            await autoAuthenticateFirebase(connectedAddress);
            return;
          } else if (walletType === "backpack") {
            // Check if Backpack is available
            if (typeof solanaWindow === "undefined" || !solanaWindow.backpack) {
              showCustomAlert(
                "🎒 BACKPACK NOT FOUND",
                "Backpack wallet is not installed. Please install Backpack extension and try again.",
                false,
                "https://backpack.app/",
              );
              return;
            }

            const backpack = solanaWindow.backpack as BackpackWallet;

            // Request connection with timeout
            const connectionPromise = backpack.connect();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Connection timeout")), 10000),
            );

            const response = await Promise.race([
              connectionPromise,
              timeoutPromise,
            ]);
            connectedAddress = extractAddressFromResponse(response, "backpack");

            if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
              throw new Error(
                "Invalid Solana address received from Backpack wallet",
              );
            }

            localStorage.setItem(
              "realmkin_cached_wallet",
              JSON.stringify({
                type: "backpack",
                address: connectedAddress,
                timestamp: Date.now(),
              }),
            );

            setAccount(connectedAddress);
            setIsConnected(true);
            setProvider(null);

            // Auto-authenticate with Firebase
            await autoAuthenticateFirebase(connectedAddress);
            return;
          } else if (walletType === "glow") {
            // Check if Glow is available
            if (typeof solanaWindow === "undefined" || !solanaWindow.glow) {
              showCustomAlert(
                "✨ GLOW NOT FOUND",
                "Glow wallet is not installed. Please install Glow extension and try again.",
                false,
                "https://glow.app/",
              );
              return;
            }

            const glow = solanaWindow.glow as GlowWallet;

            // Request connection with timeout
            const connectionPromise = glow.connect();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Connection timeout")), 10000),
            );

            const response = await Promise.race([
              connectionPromise,
              timeoutPromise,
            ]);
            connectedAddress = extractAddressFromResponse(response, "glow");

            if (!connectedAddress || !isValidSolanaAddress(connectedAddress)) {
              throw new Error(
                "Invalid Solana address received from Glow wallet",
              );
            }

            localStorage.setItem(
              "realmkin_cached_wallet",
              JSON.stringify({
                type: "glow",
                address: connectedAddress,
                timestamp: Date.now(),
              }),
            );

            setAccount(connectedAddress);
            setIsConnected(true);
            setProvider(null);

            // Auto-authenticate with Firebase
            await autoAuthenticateFirebase(connectedAddress);
            return;
          } else {
            showCustomAlert(
              "🔮 UNSUPPORTED WALLET",
              "This wallet type is not supported. Please use Phantom, Solflare, Backpack, or Glow.",
            );
            return;
          }
        } catch (error: unknown) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error(
              `Error connecting wallet after ${maxRetries} attempts:`,
              error,
            );

            // Use the utility function to get appropriate error message
            const { title, message, showRetry } =
              getSolanaConnectionErrorMessage(error as Error);
            showCustomAlert(title, message, showRetry);
            break;
          }

          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
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
      walletType: string,
    ): void => {
      connectSpecificWallet(walletType);
    };
  };

  const showCustomAlert = (
    title: string,
    message: string,
    showRetry: boolean = false,
    downloadUrl?: string,
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
    localStorage.removeItem("realmkin_cached_wallet");

    // Also disconnect via adapter when available
    try {
      if (adapterDisconnect) adapterDisconnect();
    } catch (e) {
      console.log("Adapter disconnect error:", e);
    }
  };
  const refreshWalletState = async () => {
    await checkConnection();
  };

  const value = {
    account,
    uid,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    refreshWalletState,
    provider,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
