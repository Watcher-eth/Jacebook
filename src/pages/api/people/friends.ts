// pages/api/people/friends.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { q } from "@/lib/db";
import { getFriendsForPerson, getPersonById } from "@/lib/people";
import { photoThumbUrl } from "@/lib/photos-urls";

type FriendEdge = { slug: string; name: string; weight: number; avatarUrl?: string };

const EPSTEIN_SLUG = "jeffrey-epstein";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.slug || "").trim();
  if (!slug) return res.status(400).json({ error: "missing slug" });

  const person = await getPersonById(slug);
  if (!person) return res.status(404).json({ friends: [] as FriendEdge[] });

  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");

  // Epstein is "friends" with everyone in DB (except himself)
  if (slug === EPSTEIN_SLUG) {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 200)));

    const rows = await q<{
      id: string;
      name: string | null;
      anon_id: number | null;
      avatar_photo_id: string | null;
    }>`
      WITH ranked AS (
        SELECT
          pf.person_id,
          pf.photo_id,
          ROW_NUMBER() OVER (
            PARTITION BY pf.person_id
            ORDER BY COUNT(*) DESC,
                     AVG(COALESCE(pf.celebrity_confidence, pf.confidence, 0)) DESC,
                     pf.photo_id ASC
          ) AS rn
        FROM photo_faces pf
        JOIN photos ph ON ph.id = pf.photo_id
        WHERE pf.person_id IS NOT NULL
          AND (ph.redacted IS NULL OR ph.redacted = false)
        GROUP BY pf.person_id, pf.photo_id
      )
      SELECT
        p.id,
        p.name,
        p.anon_id,
        r.photo_id AS avatar_photo_id
      FROM people p
      LEFT JOIN ranked r ON r.person_id = p.id AND r.rn = 1
      WHERE p.id <> ${slug}
      ORDER BY COALESCE(p.name, p.id) ASC
      LIMIT ${limit}
    `;

    const friends: FriendEdge[] = rows.map((r) => ({
      slug: r.id,
      name: r.name ?? (r.anon_id != null ? `Person ${r.anon_id}` : r.id),
      weight: 9999,
      avatarUrl: r.avatar_photo_id ? photoThumbUrl(r.avatar_photo_id, 256) : undefined,
    }));

    return res.status(200).json({ friends });
  }

  // default: real graph edges
  const edges = await getFriendsForPerson({ personId: person.id, limit: 48, minConf: 98 });

  return res.status(200).json({ friends: edges });
}