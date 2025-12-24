// pages/api/feed/posts.ts
import type { NextApiRequest, NextApiResponse } from "next";

import { isBannedAuthorSlug } from "@/lib/consts";
import { createTtlCache } from "@/lib/apiCache";
import { pickLikedBy } from "@/lib/likedBy";
import { q } from "@/lib/db";

type WithPerson = { name: string; slug: string };
type LikedByPerson = { name: string; slug: string };

type FeedPost = {
  key: string;
  url: string;
  timestamp: string;
  content: string;

  author: string;
  authorSlug: string;
  authorAvatar: string;

  imageUrl?: string;
  hqImageUrl?: string;

  withPeople?: WithPerson[];
  likedBy?: LikedByPerson[];
};

const LIMIT_DEFAULT = 12;
const FIXED_TIMESTAMP = "Dec 19, 2025";

const MIN_CONF_OWNER = 99;
const WITH_MIN_CONF = 98;
const WITH_MAX = 6;

const PHOTOS_CDN = process.env.NEXT_PUBLIC_PHOTOS_CDN || "https://assets.getkino.com";

function photoThumbUrl(id: string, width = 900) {
  return `${PHOTOS_CDN}/cdn-cgi/image/width=${width},quality=80,format=auto/photos-deboned/${id}`;
}
function photoFullUrl(id: string) {
  return `${PHOTOS_CDN}/photos/${id}`;
}

const nameCache = createTtlCache<Map<string, string>>();

async function getSlugToNameMap(): Promise<Map<string, string>> {
  const k = "people:slugToName:v1";
  const hit = nameCache.get(k);
  if (hit) return hit;

  return nameCache.once(k, async () => {
    const rows = await q<{ id: string; name: string | null; anon_id: number | null }>`
      SELECT id, name, anon_id
      FROM people
    `;
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.id, r.name ?? (r.anon_id != null ? `Person ${r.anon_id}` : r.id));
    }
    return nameCache.set(k, map, 30 * 60_000);
  });
}

async function getAuthorAvatarPhotoId(authorSlug: string): Promise<string | null> {
  const rows = await q<{ photo_id: string | null }>`
    WITH ranked AS (
      SELECT
        pf.photo_id,
        COUNT(*) AS n,
        AVG(COALESCE(pf.celebrity_confidence, pf.confidence, 0)) AS avg_conf,
        ROW_NUMBER() OVER (
          ORDER BY COUNT(*) DESC,
                   AVG(COALESCE(pf.celebrity_confidence, pf.confidence, 0)) DESC,
                   pf.photo_id ASC
        ) AS rn
      FROM photo_faces pf
      JOIN photos ph ON ph.id = pf.photo_id
      WHERE pf.person_id = ${authorSlug}
        AND COALESCE(pf.celebrity_confidence, pf.confidence, 0) >= ${MIN_CONF_OWNER}
        AND (ph.redacted IS NULL OR ph.redacted = false)
      GROUP BY pf.photo_id
    )
    SELECT photo_id
    FROM ranked
    WHERE rn = 1
    LIMIT 1
  `;
  return rows[0]?.photo_id ?? null;
}

type AuthorRow = { id: string; name: string | null; photo_count: number };
type PhotoRow = {
  id: string;
  original_filename: string;
  source: string;
  release_batch: string | null;
  source_url: string | null;
};
type WithRow = { id: string; name: string | null; anon_id: number | null; c: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cursor = Math.max(0, Number(req.query.cursor || 0));
  const limit = Math.min(50, Math.max(6, Number(req.query.limit || LIMIT_DEFAULT)));

  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");

  const people = await q<AuthorRow>`
    SELECT
      p.id,
      p.name,
      COUNT(DISTINCT pf.photo_id)::int AS photo_count
    FROM people p
    JOIN photo_faces pf ON pf.person_id = p.id
    JOIN photos ph ON ph.id = pf.photo_id
    WHERE (ph.redacted IS NULL OR ph.redacted = false)
      AND COALESCE(pf.celebrity_confidence, pf.confidence, 0) >= ${MIN_CONF_OWNER}
    GROUP BY p.id
    HAVING COUNT(DISTINCT pf.photo_id) > 0
    ORDER BY COUNT(DISTINCT pf.photo_id) DESC, p.id ASC
    LIMIT 400
  `;

  const authors = people
    .map((p) => ({ slug: p.id, name: p.name ?? p.id }))
    .filter((p) => !isBannedAuthorSlug(p.slug));

  if (!authors.length) {
    res.status(200).json({ posts: [], nextCursor: null });
    return;
  }

  const slugToName = await getSlugToNameMap();

  const avatarPairs = await Promise.all(
    authors.map(async (a) => {
      const pid = await getAuthorAvatarPhotoId(a.slug);
      return [a.slug, pid ? photoThumbUrl(pid, 256) : ""] as const;
    })
  );
  const avatarBySlug = new Map<string, string>(avatarPairs);

  async function getAuthorPhotoAt(authorSlug: string, k: number) {
    const rows = await q<PhotoRow>`
      SELECT ph.id, ph.original_filename, ph.source, ph.release_batch, ph.source_url
      FROM photos ph
      JOIN photo_faces pf ON pf.photo_id = ph.id
      WHERE (ph.redacted IS NULL OR ph.redacted = false)
        AND pf.person_id = ${authorSlug}
        AND COALESCE(pf.celebrity_confidence, pf.confidence, 0) >= ${MIN_CONF_OWNER}
      GROUP BY ph.id, ph.original_filename, ph.source, ph.release_batch, ph.source_url
      ORDER BY ph.id ASC
      OFFSET ${Math.max(0, k)}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  const out: FeedPost[] = [];
  let produced = 0;

  const perAuthorIdx = new Map<string, number>();
  for (const a of authors) perAuthorIdx.set(a.slug, 0);

  while (produced < cursor) {
    const a = authors[produced % authors.length]!;
    perAuthorIdx.set(a.slug, (perAuthorIdx.get(a.slug) || 0) + 1);
    produced++;
  }

  while (out.length < limit) {
    const a = authors[produced % authors.length]!;
    const k = perAuthorIdx.get(a.slug) || 0;

    const ph = await getAuthorPhotoAt(a.slug, k);
    perAuthorIdx.set(a.slug, k + 1);
    produced++;

    if (!ph) continue;

    const withRows = await q<WithRow>`
      SELECT
        p.id,
        p.name,
        p.anon_id,
        MAX(COALESCE(pf.celebrity_confidence, pf.confidence, 0)) AS c
      FROM photo_faces pf
      JOIN people p ON p.id = pf.person_id
      WHERE pf.photo_id = ${ph.id}
        AND pf.person_id IS NOT NULL
        AND pf.person_id <> ${a.slug}
        AND COALESCE(pf.celebrity_confidence, pf.confidence, 0) >= ${WITH_MIN_CONF}
      GROUP BY p.id, p.name, p.anon_id
      ORDER BY c DESC, p.id ASC
      LIMIT ${WITH_MAX}
    `;

    const withPeople: WithPerson[] = withRows.map((r) => ({
      slug: r.id,
      name: r.name ?? (r.anon_id != null ? `Person ${r.anon_id}` : r.id),
    }));

    const likedBySlugs = pickLikedBy(ph.id, 3);
    const likedBy: LikedByPerson[] = likedBySlugs.map((s) => ({
      slug: s,
      name: slugToName.get(s) ?? s,
    }));

    out.push({
      key: ph.id,
      url: photoFullUrl(ph.id),
      timestamp: FIXED_TIMESTAMP,
      content: ph.original_filename || ph.id,

      author: slugToName.get(a.slug) ?? a.name,
      authorSlug: a.slug,
      authorAvatar: avatarBySlug.get(a.slug) ?? "",

      imageUrl: photoThumbUrl(ph.id, 900),
      hqImageUrl: photoFullUrl(ph.id),

      withPeople,
      likedBy,
    });
  }

  const nextCursor = out.length === 0 ? null : String(cursor + out.length);
  res.status(200).json({ posts: out, nextCursor });
}