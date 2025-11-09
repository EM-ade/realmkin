/**
 * Context Optimization Utilities
 * Helps prevent unnecessary re-renders in context consumers
 */

import React, { useMemo } from 'react';

/**
 * Memoize context value to prevent unnecessary re-renders
 * Use this to wrap your context provider value
 */
export function useMemoizedContext<T extends Record<string, unknown>>(value: T): T {
  return useMemo(() => value, [JSON.stringify(value)]);
}

/**
 * Create a context selector hook to subscribe to specific parts of context
 * This prevents re-renders when other parts of context change
 */
export function useContextSelector<T, S>(
  context: React.Context<T>,
  selector: (state: T) => S
): S {
  const value = React.useContext(context);
  return useMemo(() => selector(value), [value, selector]);
}

/**
 * Debounce context updates to batch multiple changes
 */
export function useDebounceContext<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
