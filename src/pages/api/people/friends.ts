// pages/api/people/friends.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { q } from "@/lib/db";
import { getFriendsForPerson, getPersonById } from "@/lib/people";
import { photoThumbUrl } from "@/lib/photos-urls";
import { getAvatarPhotoIdMap } from "@/lib/avatars"

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
      weight: number;
    }>`
      SELECT
        p.id,
        p.name,
        p.anon_id,
        COALESCE(cnt.weight, 0)::int AS weight
      FROM people p
      LEFT JOIN (
        SELECT pf.person_id, COUNT(DISTINCT pf.photo_id)::int AS weight
        FROM photo_faces pf
        JOIN photos ph ON ph.id = pf.photo_id
        WHERE pf.person_id IS NOT NULL
          AND (ph.redacted IS NULL OR ph.redacted = false)
        GROUP BY pf.person_id
      ) cnt ON cnt.person_id = p.id
      WHERE p.id <> ${slug}
      ORDER BY COALESCE(cnt.weight, 0) DESC, COALESCE(p.name, p.id) ASC
      LIMIT ${limit}
    `;
    
    const avatarMap = await getAvatarPhotoIdMap(rows.map((r) => r.id));
    
    const friends: FriendEdge[] = rows.map((r) => {
      const pid = avatarMap.get(r.id);
      return {
        slug: r.id,
        name: r.name ?? (r.anon_id != null ? `Person ${r.anon_id}` : r.id),
        weight: r.weight,
        avatarUrl: pid ? photoThumbUrl(pid, 256) : undefined,
      };
    });
    
    return res.status(200).json({ friends });
  }

  // default: real graph edges
  const edges = await getFriendsForPerson({ personId: person.id, limit: 48, minConf: 98 });

  return res.status(200).json({ friends: edges });
}