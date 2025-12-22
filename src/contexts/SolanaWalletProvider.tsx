"use client";

import React, { ReactNode, useMemo, useEffect } from "react";
import { Buffer } from "buffer";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { GlowWalletAdapter } from "@solana/wallet-adapter-glow";
import {
  WalletModalProvider,
  useWalletModal,
} from "@solana/wallet-adapter-react-ui";

// Import wallet adapter default styles (scoped to this client provider)
import "@solana/wallet-adapter-react-ui/styles.css";

// Ensure Buffer is available in the browser for wallet adapters that expect the Node global
if (
  typeof globalThis !== "undefined" &&
  !(globalThis as { Buffer?: typeof Buffer }).Buffer
) {
  (globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

if (
  typeof window !== "undefined" &&
  !(window as unknown as { Buffer?: typeof Buffer }).Buffer
) {
  (window as unknown as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

// Handle Brave Wallet interference with Phantom detection
if (typeof window !== "undefined") {
  // Detect if Brave Wallet is hijacking the window.solana object
  const checkWalletProvider = () => {
    const solanaProvider = window.solana;

    if (solanaProvider) {
      // Check if this is Brave Wallet masquerading as the default provider
      const isBraveWallet =
        (solanaProvider as unknown as Record<string, unknown>).isBraveWallet ===
        true;
      const isPhantom = solanaProvider.isPhantom === true;

      console.log("[Realmkin] Wallet detection:", {
        isBraveWallet,
        isPhantom,
        provider:
          (
            solanaProvider as unknown as Record<string, unknown>
          ).constructor?.toString() || "unknown",
      });

      // If Brave Wallet is detected, try to access Phantom directly
      if (isBraveWallet && !isPhantom) {
        console.log("[Realmkin] Brave Wallet detected, looking for Phantom...");

        // Phantom usually exposes itself at window.phantom.solana
        if (window.phantom?.solana) {
          console.log(
            "[Realmkin] Found Phantom wallet at window.phantom.solana"
          );
        } else {
          console.warn(
            "[Realmkin] Phantom not found. Brave Wallet may be blocking it."
          );
          console.warn(
            "[Realmkin] Please disable Brave Wallet at brave://settings/wallet"
          );
        }
      }
    }
  };

  // Run check after a short delay to ensure wallet extensions are loaded
  setTimeout(checkWalletProvider, 100);
}

interface Props {
  children: ReactNode;
}

function WalletModalBridge() {
  const { setVisible, visible } = useWalletModal();
  const { select, connect, wallet, wallets, connecting, connected } =
    useWallet();

  useEffect(() => {
    console.log("🌉 [Modal Bridge] State:", {
      visible,
      wallet: wallet?.adapter.name,
      walletsAvailable: wallets?.length,
      connecting,
      connected,
    });
  }, [visible, wallet, wallets, connecting, connected]);

  // Auto-connect when wallet is selected and modal is closed
  // Only if the wallet adapter isn't already handling it
  useEffect(() => {
    const attemptConnection = async () => {
      // Only auto-connect if:
      // 1. Wallet is selected
      // 2. Not already connected
      // 3. Not currently connecting
      // 4. Modal was just closed (not visible)
      // 5. Wallet wasn't previously connected (to avoid re-connecting on every render)
      if (wallet && !connected && !connecting && !visible) {
        // Add a small delay to let the adapter handle auto-connect first
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Check again after delay - adapter might have connected
        if (wallet && !connected && !connecting) {
          try {
            console.log(
              "🔌 [Modal Bridge] Wallet selected, attempting auto-connect:",
              wallet.adapter.name
            );
            await connect();
            console.log("✅ [Modal Bridge] Auto-connect successful!");
          } catch (error) {
            console.error("❌ [Modal Bridge] Auto-connect failed:", error);
            // Don't re-open modal automatically - let user retry manually
            // This prevents annoying popup loops
          }
        }
      }
    };

    attemptConnection();
  }, [wallet, connected, connecting, visible, connect]);

  useEffect(() => {
    const handler = () => {
      try {
        console.log("🔔 [Modal Bridge] Opening wallet modal via event");
        setVisible(true);
      } catch (e) {
        console.warn("❌ [Modal Bridge] Failed to open wallet modal", e);
      }
    };
    window.addEventListener("realmkin:open-wallet-modal", handler);
    return () => {
      window.removeEventListener("realmkin:open-wallet-modal", handler);
    };
  }, [setVisible]);

  return null;
}

export default function SolanaWalletProvider({ children }: Props) {
  // Allow RPC URL and network to be configured via env
  const networkEnv =
    process.env.NEXT_PUBLIC_SOLANA_NETWORK?.toLowerCase() || "mainnet-beta";

  // Map string to WalletAdapterNetwork enum
  let network: WalletAdapterNetwork = WalletAdapterNetwork.Mainnet;
  if (networkEnv === "devnet") {
    network = WalletAdapterNetwork.Devnet;
  } else if (networkEnv === "testnet") {
    network = WalletAdapterNetwork.Testnet;
  }

  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com";

  // Memoize wallet adapter instances with priority order
  // Note: PhantomWalletAdapter checks window.phantom.solana first, which helps avoid Brave Wallet conflicts
  const wallets = useMemo(() => {
    // Create unique wallet instances to prevent duplicate key warnings
    const walletInstances = [
      new PhantomWalletAdapter(), // Will use window.phantom.solana if available
      new SolflareWalletAdapter({ network }),
      new BackpackWalletAdapter(),
      new GlowWalletAdapter(),
    ];

    // Deduplicate wallets by name to prevent React key warnings
    const uniqueWallets = walletInstances.filter(
      (wallet, index, self) =>
        index === self.findIndex((w) => w.name === wallet.name)
    );

    return uniqueWallets;
  }, [network]);

  // Log wallet adapter initialization for debugging
  useEffect(() => {
    console.log(
      "[Realmkin] Initialized wallet adapters:",
      wallets.map((w) => w.name)
    );
  }, [wallets]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={true}
        onError={(error) => {
          // Suppress "Invalid public key input" errors from wallet adapters
          if (error?.message?.includes("Invalid public key")) {
            console.debug(
              "[Realmkin] Suppressed wallet adapter public key error"
            );
            return;
          }

          // Handle "Something went wrong" errors from Phantom
          if (error?.message?.includes("Something went wrong")) {
            console.error(
              "[Realmkin] ❌ Phantom connection error - This is usually a Phantom extension issue"
            );
            console.error("[Realmkin] Possible fixes:");
            console.error("[Realmkin] 1. Refresh the page and try again");
            console.error("[Realmkin] 2. Unlock your Phantom wallet");
            console.error(
              "[Realmkin] 3. Check if Phantom is on the correct network (mainnet)"
            );
            console.error(
              "[Realmkin] 4. Try disconnecting and reconnecting Phantom"
            );
            return;
          }

          console.error("[Realmkin] ❌ Wallet adapter error:", error);
          console.error("[Realmkin] Error details:", {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
          });
        }}
      >
        <WalletModalProvider>
          <WalletModalBridge />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
