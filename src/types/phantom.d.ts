/**
 * Phantom Wallet TypeScript definitions
 */

import { Transaction, VersionedTransaction } from "@solana/web3.js";

export interface PhantomProvider {
  isPhantom: boolean;
  publicKey: { toBase58(): string } | null;
  isConnected: boolean;
  
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
  
  signAndSendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
    options?: {
      skipPreflight?: boolean;
      preflightCommitment?: string;
    }
  ): Promise<{ signature: string }>;
  
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  
  on(event: "connect" | "disconnect" | "accountChanged", handler: (...args: unknown[]) => void): void;
  removeListener(event: "connect" | "disconnect" | "accountChanged", handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
    phantom?: {
      solana?: PhantomProvider;
    };
  }
}

export {};
