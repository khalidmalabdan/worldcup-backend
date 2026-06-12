// Simple in-memory cache with TTL

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function cacheDelete(key: string) {
  cache.delete(key);
}

export function cacheClearPrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
