// Import PublicKey at the top of the file
import { PublicKey } from "@solana/web3.js";

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
 * @returns 'solana' | 'unknown'
 */
export const detectWalletType = (address: string): 'solana' | 'unknown' => {
  if (!address) return 'unknown';

  // Solana addresses are base58 encoded and typically 32-44 characters
  if (address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
    return 'solana';
  }

  return 'unknown';
};

/**
 * Validates if an address is a proper Solana address
 * @param address - The address to validate
 * @returns boolean
 */
export const isValidSolanaAddress = (address: string): boolean => {
  if (!address) return false;
  
  // Use Solana's PublicKey constructor for validation instead of regex
  try {
    new PublicKey(address);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Validates a wallet address format
 * @param address - The wallet address to validate
 * @returns true if valid, false otherwise
 */
export const isValidWalletAddress = (address: string): boolean => {
  if (!address) return false;

  return isValidSolanaAddress(address);
};
