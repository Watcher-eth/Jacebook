import type { NextApiRequest, NextApiResponse } from "next";
import { searchCelebs, getAvatarUrlForSlug } from "@/lib/people";

type PersonSearchRow = { slug: string; name: string; avatarUrl?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = String(req.query.q || "").trim();
  const limit = Math.min(25, Math.max(1, Number(req.query.limit || 8)));

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");

  if (!q) return res.status(200).json({ people: [] as PersonSearchRow[] });

  const hits = await searchCelebs(q, limit);

  // avatars in parallel (small N)
  const avatarUrls = await Promise.all(hits.map((h) => getAvatarUrlForSlug(h.slug)));

  const people: PersonSearchRow[] = hits.map((h, i) => ({
    slug: h.slug,
    name: h.name,
    avatarUrl: avatarUrls[i] ?? undefined,
  }));

  return res.status(200).json({ people });
}