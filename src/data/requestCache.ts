type CacheEntry<T> = {
  expiresAt: number;
  promise?: Promise<T>;
  value?: T;
};

const requestCache = new Map<string, CacheEntry<unknown>>();

export async function cachedRequest<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = 15_000,
): Promise<T> {
  const now = Date.now();
  const cached = requestCache.get(key) as CacheEntry<T> | undefined;

  if (cached?.promise) return cached.promise;
  if (cached?.value !== undefined && cached.expiresAt > now) {
    return cached.value;
  }

  const promise = loader()
    .then(value => {
      requestCache.set(key, {
        expiresAt: Date.now() + ttlMs,
        value,
      });
      return value;
    })
    .catch(error => {
      requestCache.delete(key);
      throw error;
    });

  requestCache.set(key, {
    expiresAt: now + ttlMs,
    promise,
  });

  return promise;
}

export function invalidateRequestCache(prefix?: string) {
  if (!prefix) {
    requestCache.clear();
    return;
  }

  for (const key of requestCache.keys()) {
    if (key.startsWith(prefix)) requestCache.delete(key);
  }
}
