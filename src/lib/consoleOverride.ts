/**
 * Console Override for Production
 * Automatically suppresses console.log in production while keeping errors/warnings
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Store original console methods
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

/**
 * Initialize console override
 * Call this once at app startup
 */
export function initConsoleOverride() {
  if (typeof window === 'undefined') {
    // Server-side - keep all logs for debugging
    return;
  }

  if (isProduction) {
    // Production: Suppress debug logs, keep errors/warnings
    console.log = () => {}; // Suppress
    console.debug = () => {}; // Suppress
    console.info = () => {}; // Suppress
    
    // Keep warnings (might be important)
    console.warn = (...args: unknown[]) => {
      originalConsole.warn('[WARN]', ...args);
    };
    
    // Keep errors (definitely important)
    console.error = (...args: unknown[]) => {
      originalConsole.error('[ERROR]', ...args);
    };

    console.log('🔇 Console logs suppressed in production (errors/warnings still visible)');
  } else if (isDevelopment) {
    // Development: Prefix all logs for clarity
    console.log = (...args: unknown[]) => {
      originalConsole.log('[LOG]', ...args);
    };
    
    console.debug = (...args: unknown[]) => {
      originalConsole.debug('[DEBUG]', ...args);
    };
    
    console.info = (...args: unknown[]) => {
      originalConsole.info('[INFO]', ...args);
    };
    
    console.warn = (...args: unknown[]) => {
      originalConsole.warn('[WARN]', ...args);
    };
    
    console.error = (...args: unknown[]) => {
      originalConsole.error('[ERROR]', ...args);
    };
  }
}

/**
 * Restore original console (for testing)
 */
export function restoreConsole() {
  console.log = originalConsole.log;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}

/**
 * Force log (even in production) for critical debugging
 */
export function forceLog(...args: unknown[]) {
  originalConsole.log('[FORCE]', ...args);
}

/**
 * Conditional logger that respects environment
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.log('[LOG]', ...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.debug('[DEBUG]', ...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.info('[INFO]', ...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    originalConsole.warn('[WARN]', ...args);
  },
  
  error: (...args: unknown[]) => {
    originalConsole.error('[ERROR]', ...args);
  },
  
  force: (...args: unknown[]) => {
    originalConsole.log('[FORCE]', ...args);
  },
};

export default logger;
