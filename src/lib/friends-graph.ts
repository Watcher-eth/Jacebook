// src/lib/friends-graph.ts
import { q, sql } from "@/lib/db";

export type FriendEdge = {
  slug: string;
  name: string;
  weight: number;
  avatarUrl?: string;
};

export type CelebrityAppearance = { file: string; page: number; confidence: number };
export type Celebrity = { name: string; count: number; appearances: CelebrityAppearance[] };

const PHOTOS_CDN = process.env.NEXT_PUBLIC_PHOTOS_CDN || "https://assets.getkino.com";

function photoThumbUrl(id: string, width = 256) {
  return `${PHOTOS_CDN}/cdn-cgi/image/width=${width},quality=80,format=auto/photos-deboned/${id}`;
}

export function buildFriendsForPerson(opts: {
  ownerSlug: string;
  allCelebs: Celebrity[]; // signature compat (unused)
  minConf: number;
  manifest?: any | null; // signature compat (unused)
  minEdgeWeight?: number;
  limit?: number;
  minConfOwner?: number;
  minConfOther?: number;
  pageWindow?: number; // signature compat (unused)
}) {
  return buildFriendsForPersonDb(opts);
}

async function buildFriendsForPersonDb(opts: {
  ownerSlug: string;
  minConf: number;
  minEdgeWeight?: number;
  limit?: number;
  minConfOwner?: number;
  minConfOther?: number;
}) {
  const {
    ownerSlug,
    minConf,
    minEdgeWeight = 2,
    limit = 24,
    minConfOwner = minConf,
    minConfOther = minConf,
  } = opts;

  const lim = Math.min(100, Math.max(1, limit));

  const rows = await q<{
    slug: string;
    name: string | null;
    weight: number;
    avatar_photo_id: string | null;
  }>`
    WITH my_photos AS (
      SELECT DISTINCT pf.photo_id
      FROM photo_faces pf
      WHERE pf.person_id = ${ownerSlug}
        AND COALESCE(pf.celebrity_confidence, pf.confidence, 0) >= ${minConfOwner}
    ),
    edges AS (
      SELECT
        pf.person_id AS other_id,
        COUNT(DISTINCT pf.photo_id)::int AS weight
      FROM photo_faces pf
      JOIN my_photos mp ON mp.photo_id = pf.photo_id
      WHERE pf.person_id IS NOT NULL
        AND pf.person_id <> ${ownerSlug}
        AND COALESCE(pf.celebrity_confidence, pf.confidence, 0) >= ${minConfOther}
      GROUP BY pf.person_id
      HAVING COUNT(DISTINCT pf.photo_id) >= ${minEdgeWeight}
      ORDER BY weight DESC, pf.person_id ASC
      LIMIT ${lim}
    ),
    avatar_rank AS (
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
      e.other_id AS slug,
      COALESCE(p.name, e.other_id) AS name,
      e.weight,
      ar.photo_id AS avatar_photo_id
    FROM edges e
    LEFT JOIN people p ON p.id = e.other_id
    LEFT JOIN avatar_rank ar ON ar.person_id = e.other_id AND ar.rn = 1
    ORDER BY e.weight DESC, e.other_id ASC
  `;

  return rows
    .map((r) => ({
      slug: r.slug,
      name: r.name ?? r.slug,
      weight: r.weight,
      avatarUrl: r.avatar_photo_id ? photoThumbUrl(r.avatar_photo_id, 256) : undefined,
    })) satisfies FriendEdge[];
}