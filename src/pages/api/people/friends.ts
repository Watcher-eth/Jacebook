// pages/api/people/friends.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAllCelebrities } from "@/lib/people";
import { buildFriendsForPerson, type FriendEdge } from "@/lib/friends-graph";
import { createTtlCache } from "@/lib/apiCache";

const cache = createTtlCache<FriendEdge[]>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.slug || "").trim();
  if (!slug) return res.status(400).json({ error: "missing slug" });

  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");

  const k = `friends:${slug}`;

  const hit = cache.get(k);
  if (hit) return res.status(200).json({ friends: hit });

  const friends = await cache.once(k, async () => {
    const allCelebs = getAllCelebrities();
    const v = buildFriendsForPerson({
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
    return cache.set(k, v, 30 * 60_000);
  });

  return res.status(200).json({ friends });
}