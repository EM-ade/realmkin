/**
 * Client-side cache for Firebase reads to reduce quota usage
 * Cache TTL: 30 seconds for most data, 5 minutes for static config
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class FirebaseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 30000; // 30 seconds
  private readonly LONG_TTL = 300000; // 5 minutes for static data

  /**
   * Get cached data if valid, otherwise fetch and cache
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }

    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: now, ttl });
    return data;
  }

  /**
   * Set cache manually
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  /**
   * Get cached data without fetching
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const firebaseCache = new FirebaseCache();

/**
 * Helper to generate cache keys
 */
export function createCacheKey(collection: string, docId?: string): string {
  return docId ? `${collection}/${docId}` : collection;
}
