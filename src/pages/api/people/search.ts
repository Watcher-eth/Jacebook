import type { NextApiRequest, NextApiResponse } from "next";
import { searchCelebs, getAvatarUrlForSlug } from "@/lib/people";
import { getAvatarPhotoIdMap } from "@/lib/avatars"
import { photoThumbUrl } from "@/lib/photos-urls"

type PersonSearchRow = { slug: string; name: string; avatarUrl?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = String(req.query.q || "").trim();
  const limit = Math.min(25, Math.max(1, Number(req.query.limit || 8)));

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");

  if (!q) return res.status(200).json({ people: [] as PersonSearchRow[] });

  const hits = await searchCelebs(q, limit);

  const avatarMap = await getAvatarPhotoIdMap(hits.map((h) => h.slug));

  const people: PersonSearchRow[] = hits.map((h) => {
    const pid = avatarMap.get(h.slug);
    return {
      slug: h.slug,
      name: h.name,
      avatarUrl: pid ? photoThumbUrl(pid, 256) : undefined,
    };
  });

  return res.status(200).json({ people });
}