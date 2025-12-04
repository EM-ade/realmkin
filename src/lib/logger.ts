/**
 * Centralized logging utility
 * - Filters out logs in production
 * - Provides consistent logging interface
 * - Can be extended with external logging services (Sentry, DataDog, etc.)
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Debug logs - only shown in development
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Info logs - only shown in development
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Warning logs - shown in all environments
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Error logs - shown in all environments
   */
  error: (...args: unknown[]) => {
    console.error(...args);
    // TODO: Send to error tracking service (Sentry)
  },

  /**
   * Group logging (development only)
   */
  group: (label: string, callback: () => void) => {
    if (isDevelopment) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  },
};
