// Wallet connection utilities for better laptop support

export interface WalletConnectionConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  enablePopupDetection: boolean;
}

export const DEFAULT_CONFIG: WalletConnectionConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  enablePopupDetection: true,
};

/**
 * Detects if popup blockers are active
 */
export const detectPopupBlocker = (): boolean => {
  try {
    const popup = window.open('', '_blank', 'width=1,height=1');
    if (popup) {
      popup.close();
      return false; // Popup allowed
    }
    return true; // Popup blocked
  } catch (error) {
    return true; // Popup blocked
  }
};

/**
 * Ensures the window has focus and waits for browser to process
 */
export const ensureWindowFocus = async (): Promise<void> => {
  window.focus();
  // Wait for browser to process focus change
  await new Promise(resolve => setTimeout(resolve, 150));
};

/**
 * Waits for ethereum object to be available
 */
export const waitForEthereum = (timeout: number = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.ethereum) {
      resolve();
      return;
    }

    const startTime = Date.now();
    const checkEthereum = () => {
      if (window.ethereum) {
        resolve();
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error('Ethereum object not found within timeout'));
        return;
      }

      setTimeout(checkEthereum, 100);
    };

    checkEthereum();
  });
};

/**
 * Attempts to connect to MetaMask with multiple fallback methods
 */
export const connectMetaMask = async (
  config: WalletConnectionConfig = DEFAULT_CONFIG
): Promise<ethers.BrowserProvider> => {
  let lastError: any = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`MetaMask connection attempt ${attempt}/${config.maxRetries}`);

      // Ensure window focus
      await ensureWindowFocus();

      // Check for popup blockers on first attempt
      if (attempt === 1 && config.enablePopupDetection) {
        if (detectPopupBlocker()) {
          throw new Error('Popup blocker detected');
        }
      }

      // Wait for ethereum object
      await waitForEthereum(config.timeout);

      if (!window.ethereum || !window.ethereum.isMetaMask) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Try multiple connection methods
      let connected = false;

      // Method 1: Standard ethers request
      try {
        await provider.send("eth_requestAccounts", []);
        connected = true;
      } catch (error) {
        console.log(`Method 1 failed on attempt ${attempt}:`, error);
        lastError = error;
      }

      // Method 2: Direct ethereum request
      if (!connected) {
        try {
          await window.ethereum.request({ method: "eth_requestAccounts" });
          connected = true;
        } catch (error) {
          console.log(`Method 2 failed on attempt ${attempt}:`, error);
          lastError = error;
        }
      }

      // Method 3: With timeout
      if (!connected) {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), config.timeout)
          );
          const connectionPromise = window.ethereum.request({ method: "eth_requestAccounts" });
          await Promise.race([connectionPromise, timeoutPromise]);
          connected = true;
        } catch (error) {
          console.log(`Method 3 failed on attempt ${attempt}:`, error);
          lastError = error;
        }
      }

      if (connected) {
        return provider;
      }

    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error);
      lastError = error;

      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('User denied')) {
          throw error; // Don't retry user rejections
        }
        if (error.message.includes('Popup blocker detected')) {
          throw error; // Don't retry if popup is blocked
        }
      }

      // Wait before retry (except on last attempt)
      if (attempt < config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }
  }

  throw lastError || new Error('All connection attempts failed');
};

/**
 * Gets detailed error message for wallet connection issues
 */
export const getConnectionErrorMessage = (error: any): { title: string; message: string; showRetry: boolean } => {
  const errorCode = error?.code;
  const errorMessage = error?.message || '';

  if (errorCode === 4001) {
    return {
      title: "⚔️ CONNECTION REJECTED",
      message: "The wallet guardian has denied access. Please approve the connection request to link your wallet to the Realmkin realm.",
      showRetry: false
    };
  }

  if (errorCode === -32002) {
    return {
      title: "⏳ PENDING REQUEST",
      message: "A connection request is already pending. Please check your wallet extension and complete the existing request. If the popup didn't appear, try clicking the wallet extension icon in your browser toolbar.",
      showRetry: true
    };
  }

  if (errorCode === -32603) {
    return {
      title: "🔄 WALLET BUSY",
      message: "Your wallet is currently processing another request. Please wait a moment and try again.",
      showRetry: true
    };
  }

  if (errorMessage.includes("popup") || errorMessage.includes("blocked")) {
    return {
      title: "🚫 POPUP BLOCKED",
      message: "Your browser may be blocking the wallet popup. Please:\n\n1. Check your browser's popup blocker settings\n2. Allow popups for this site\n3. Try clicking the wallet extension icon in your browser toolbar\n4. Refresh the page and try again",
      showRetry: true
    };
  }

  if (errorMessage.includes("timeout")) {
    return {
      title: "⏰ CONNECTION TIMEOUT",
      message: "The wallet connection timed out. This can happen on slower systems. Please:\n\n1. Ensure your wallet extension is unlocked\n2. Try clicking the wallet extension icon manually\n3. Refresh the page and try again",
      showRetry: true
    };
  }

  return {
    title: "🚫 LINK FAILED",
    message: "The mystical connection to your wallet has been disrupted. Please ensure your wallet is unlocked, refresh the page, and try again. If the problem persists, try restarting your browser.",
    showRetry: true
  };
};

/**
 * Checks if the current environment is likely a laptop
 */
export const isLaptopEnvironment = (): boolean => {
  // Check for common laptop indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
  const isTablet = /tablet|ipad/i.test(userAgent);
  
  // Check screen size (laptops typically have smaller screens than desktops)
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const isSmallScreen = screenWidth < 1920 || screenHeight < 1080;
  
  // Check for touch capability (laptops often have touch screens)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return !isMobile && !isTablet && (isSmallScreen || hasTouch);
};

/**
 * Gets optimized connection config based on environment
 */
export const getOptimizedConfig = (): WalletConnectionConfig => {
  const isLaptop = isLaptopEnvironment();
  
  if (isLaptop) {
    return {
      ...DEFAULT_CONFIG,
      maxRetries: 4, // More retries for laptops
      retryDelay: 1500, // Longer delay between retries
      timeout: 45000, // Longer timeout for slower systems
      enablePopupDetection: true
    };
  }
  
  return DEFAULT_CONFIG;
};
