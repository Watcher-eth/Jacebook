// src/lib/apiCache.ts
type Entry<T> = { exp: number; v: T };

export function createTtlCache<T>() {
  const cache = new Map<string, Entry<T>>();
  const inflight = new Map<string, Promise<T>>();

  const now = () => Date.now();

  function get(k: string) {
    const e = cache.get(k);
    if (e && e.exp > now()) return e.v;
    return null;
  }

  function set(k: string, v: T, ttlMs: number) {
    cache.set(k, { exp: now() + ttlMs, v });
    return v;
  }

  async function once(k: string, fn: () => Promise<T>) {
    const p0 = inflight.get(k);
    if (p0) return p0;
    const p = fn().finally(() => inflight.delete(k));
    inflight.set(k, p);
    return p;
  }

  return { get, set, once };
}