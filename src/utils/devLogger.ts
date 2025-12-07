/**
 * Development Logger
 * Only logs to console in development mode
 * In production, logs are suppressed to reduce noise and improve performance
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const devLog = {
  /**
   * Standard log (info)
   */
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Error log (always shown, even in production)
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Warning log (always shown, even in production)
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Info log (development only)
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Debug log (development only)
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Table log (development only)
   */
  table: (data: unknown) => {
    if (isDevelopment) {
      console.table(data);
    }
  },

  /**
   * Group log (development only)
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  /**
   * Group end (development only)
   */
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  /**
   * Time start (development only)
   */
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  /**
   * Time end (development only)
   */
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },
};

/**
 * Suppress all console logs in production (optional, aggressive approach)
 * Call this in your main layout or _app file
 */
export const suppressProductionLogs = () => {
  if (!isDevelopment) {
    // Keep errors and warnings, suppress everything else
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.table = () => {};
    console.group = () => {};
    console.groupEnd = () => {};
    console.time = () => {};
    console.timeEnd = () => {};
  }
};

export default devLog;
