// pages/api/people/wikidata.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWikidataProfileByName, type WikidataProfile } from "@/lib/wikidata";

type CacheEntry<T> = { exp: number; v: T };
const cache = new Map<string, CacheEntry<WikidataProfile | null>>();
const inflight = new Map<string, Promise<WikidataProfile | null>>();

function now() {
  return Date.now();
}
function getCached(k: string) {
  const e = cache.get(k);
  if (e && e.exp > now()) return e.v;
  return null;
}
function setCached(k: string, v: WikidataProfile | null, ttlMs: number) {
  cache.set(k, { exp: now() + ttlMs, v });
  return v;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const name = String(req.query.name || "").trim();
  if (!name) return res.status(400).json({ error: "missing name" });

  // CDN cache the API response too (big win)
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");

  const k = `wd:${name}`;

  const cached = getCached(k);
  if (cached !== null) return res.status(200).json({ wikidata: cached });

  const p0 = inflight.get(k);
  if (p0) return res.status(200).json({ wikidata: await p0 });

  const p = fetchWikidataProfileByName(name)
    .catch(() => null)
    .then((v) => setCached(k, v, 7 * 24 * 60 * 60_000))
    .finally(() => inflight.delete(k));

  inflight.set(k, p);
  return res.status(200).json({ wikidata: await p });
}