"use client";

import React, { ReactNode, useMemo, useEffect } from "react";
import { Buffer } from "buffer";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { GlowWalletAdapter } from "@solana/wallet-adapter-glow";
import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui";

// Import wallet adapter default styles (scoped to this client provider)
import "@solana/wallet-adapter-react-ui/styles.css";

// Ensure Buffer is available in the browser for wallet adapters that expect the Node global
if (typeof globalThis !== "undefined" && !(globalThis as { Buffer?: typeof Buffer }).Buffer) {
  (globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

if (typeof window !== "undefined" && !(window as unknown as { Buffer?: typeof Buffer }).Buffer) {
  (window as unknown as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

interface Props {
  children: ReactNode;
}

function WalletModalBridge() {
  const { setVisible } = useWalletModal();
  useEffect(() => {
    const handler = () => {
      try {
        // Debug
        console.debug('[Realmkin] Opening wallet modal via event');
        setVisible(true);
      } catch (e) {
        console.warn('[Realmkin] Failed to open wallet modal via context', e);
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
  const networkEnv = process.env.NEXT_PUBLIC_SOLANA_NETWORK?.toLowerCase() || "mainnet";
  
  // Map string to WalletAdapterNetwork enum
  let network: WalletAdapterNetwork = WalletAdapterNetwork.Mainnet;
  if (networkEnv === "devnet") {
    network = WalletAdapterNetwork.Devnet;
  } else if (networkEnv === "testnet") {
    network = WalletAdapterNetwork.Testnet;
  }
  
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  
  console.log("[Realmkin] Wallet Network:", network, "Endpoint:", endpoint);

  // Memoize wallet adapter instances
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new BackpackWalletAdapter(),
      new GlowWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletModalBridge />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
