// pages/api/people/friends.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAllCelebrities } from "@/lib/people";
import { buildFriendsForPerson, type FriendEdge } from "@/lib/friends-graph";

type CacheEntry<T> = { exp: number; v: T };
const cache = new Map<string, CacheEntry<FriendEdge[]>>();
const inflight = new Map<string, Promise<FriendEdge[]>>();

function now() {
  return Date.now();
}
function getCached(k: string) {
  const e = cache.get(k);
  if (e && e.exp > now()) return e.v;
  return null;
}
function setCached(k: string, v: FriendEdge[], ttlMs: number) {
  cache.set(k, { exp: now() + ttlMs, v });
  return v;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.slug || "").trim();
  if (!slug) return res.status(400).json({ error: "missing slug" });

  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");

  const k = `friends:${slug}`;
  const cached = getCached(k);
  if (cached) return res.status(200).json({ friends: cached });

  const p0 = inflight.get(k);
  if (p0) {
    const friends = await p0;
    return res.status(200).json({ friends });
  }

  const p = (async () => {
    const allCelebs = getAllCelebrities();
    const friends = buildFriendsForPerson({
      ownerSlug: slug,
      allCelebs,
      minConf: 99,
      manifest: null,
      minConfOwner: 99,
      minConfOther: 99,
      pageWindow: 1,
      minEdgeWeight: 1,
      limit: 48,
    });
    return setCached(k, friends, 30 * 60_000);
  })().finally(() => inflight.delete(k));

  inflight.set(k, p);
  const friends = await p;
  return res.status(200).json({ friends });
}