interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on(event: "accountsChanged", callback: (accounts: string[]) => void): void;
  on(event: "chainChanged", callback: (chainId: string) => void): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  removeListener(
    event: "accountsChanged",
    callback: (accounts: string[]) => void
  ): void;
  removeListener(
    event: "chainChanged",
    callback: (chainId: string) => void
  ): void;
  removeListener(event: string, callback: (...args: unknown[]) => void): void;
}

interface Window {
  ethereum?: EthereumProvider;
}
