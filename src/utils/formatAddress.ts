/**
 * Formats a wallet address to display in truncated format
 * @param address - The full wallet address
 * @param startLength - Number of characters to show at the start (default: 6)
 * @param endLength - Number of characters to show at the end (default: 4)
 * @returns Formatted address like "0xAbc...Xyz"
 */
export const formatAddress = (
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string => {
  if (!address) return '';
  
  if (address.length <= startLength + endLength) {
    return address;
  }
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

/**
 * Detects the type of wallet address
 * @param address - The wallet address to check
 * @returns 'ethereum' | 'solana' | 'unknown'
 */
export const detectWalletType = (address: string): 'ethereum' | 'solana' | 'unknown' => {
  if (!address) return 'unknown';
  
  // Ethereum addresses are 42 characters long and start with 0x
  if (address.length === 42 && address.startsWith('0x')) {
    return 'ethereum';
  }
  
  // Solana addresses are 32-44 characters long and contain only base58 characters
  if (address.length >= 32 && address.length <= 44) {
    // Basic check for base58 characters (no 0, O, I, l)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (base58Regex.test(address)) {
      return 'solana';
    }
  }
  
  return 'unknown';
};

/**
 * Validates a wallet address format
 * @param address - The wallet address to validate
 * @returns true if valid, false otherwise
 */
export const isValidWalletAddress = (address: string): boolean => {
  if (!address) return false;
  
  const walletType = detectWalletType(address);
  return walletType !== 'unknown';
};
