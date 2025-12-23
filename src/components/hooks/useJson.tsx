// src/hooks/useJson.ts
import * as React from "react";

export function useJson<T>(url: string | null, init?: RequestInit) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(Boolean(url));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!url) return;

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    fetch(url, {
      ...init,
      signal: ac.signal,
      headers: { Accept: "application/json", ...(init?.headers || {}) },
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<T>;
      })
      .then(setData)
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e?.message ?? "error");
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [url]);

  return { data, loading, error };
}