// src/lib/people.ts
import { q, sql } from "@/lib/db";
import { getAvatarPhotoIdMap } from "@/lib/avatars";

export type FriendEdge = {
  slug: string;
  name: string;
  weight: number;
  avatarUrl?: string;
};

// old “Celebrity” compatibility shape
export type CelebrityAppearance = { file: string; page: number; confidence: number };
export type Celebrity = { name: string; count: number; appearances: CelebrityAppearance[] };

export type DbPerson = {
  id: string; // slug
  name: string | null;
  anon_id: number | null;
};

export type PersonWithAvatar = {
  id: string;
  name: string | null;
  anon_id: number | null;
  photo_count: number;
  avatar_photo_id: string | null;
};

export type PhotoPostRow = {
  id: string;
  original_filename: string;
  source: string;
  release_batch: string | null;
  source_url: string | null;
  created_at: string | null;
  width: number | null;
  height: number | null;
};

function faceConfExpr() {
  return sql`COALESCE(pf.celebrity_confidence, pf.confidence, 0)`;
}

export function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PHOTOS_CDN = process.env.NEXT_PUBLIC_PHOTOS_CDN || "https://assets.getkino.com";
function photoThumbUrl(id: string, width = 256) {
  return `${PHOTOS_CDN}/cdn-cgi/image/width=${width},quality=80,format=auto/photos-deboned/${id}`;
}


export async function getPersonById(id: string): Promise<DbPerson | null> {
  const rows = await q<DbPerson>`
    SELECT id, name, anon_id
    FROM people
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getPeopleWithAvatars(limit = 100): Promise<PersonWithAvatar[]> {
  const rows = await q<PersonWithAvatar>`
    WITH counts AS (
      SELECT
        pe.id,
        pe.name,
        pe.anon_id,
        COUNT(DISTINCT pf.photo_id)::int AS photo_count
      FROM people pe
      LEFT JOIN photo_faces pf ON pf.person_id = pe.id
      GROUP BY pe.id, pe.name, pe.anon_id
    ),
    ranked AS (
      SELECT
        pf.person_id,
        pf.photo_id,
        ROW_NUMBER() OVER (
          PARTITION BY pf.person_id
          ORDER BY COUNT(*) DESC, AVG(${faceConfExpr()}) DESC, pf.photo_id ASC
        ) AS rn
      FROM photo_faces pf
      JOIN photos ph ON ph.id = pf.photo_id
      WHERE pf.person_id IS NOT NULL
        AND (ph.redacted IS NULL OR ph.redacted = false)
      GROUP BY pf.person_id, pf.photo_id
    )
    SELECT
      c.id,
      c.name,
      c.anon_id,
      c.photo_count,
      r.photo_id AS avatar_photo_id
    FROM counts c
    LEFT JOIN ranked r ON r.person_id = c.id AND r.rn = 1
    WHERE c.photo_count > 0
    ORDER BY c.photo_count DESC, c.id ASC
    LIMIT ${limit}
  `;
  return rows;
}

// =========================
// Photos / posts
// =========================

export async function getTopPhotosForPerson(args: {
  personId: string;
  limit: number;
  minConf?: number;
}): Promise<PhotoPostRow[]> {
  const minConf = args.minConf ?? 99;

  const rows = await q<PhotoPostRow>`
    WITH ranked AS (
      SELECT
        ph.id,
        ph.original_filename,
        ph.source,
        ph.release_batch,
        ph.source_url,
        ph.created_at,
        ph.width,
        ph.height,
        MAX(${faceConfExpr()}) AS best_face_conf
      FROM photo_faces pf
      JOIN photos ph ON ph.id = pf.photo_id
      WHERE pf.person_id = ${args.personId}
        AND (ph.redacted IS NULL OR ph.redacted = false)
      GROUP BY ph.id, ph.original_filename, ph.source, ph.release_batch, ph.source_url, ph.created_at, ph.width, ph.height
    )
    SELECT
      id, original_filename, source, release_batch, source_url, created_at, width, height
    FROM ranked
    WHERE best_face_conf >= ${minConf}
    ORDER BY best_face_conf DESC, id DESC
    LIMIT ${args.limit}
  `;

  return rows;
}

export async function getPostsForPerson(args: {
  personId: string;
  cursor?: string | null;
  limit: number;
  minConf?: number;
}): Promise<{ rows: PhotoPostRow[]; nextCursor: string | null }> {
  const minConf = args.minConf ?? 98;
  const limit = Math.min(50, Math.max(6, args.limit));
  const cursor = args.cursor ?? null;

  const rows = await q<PhotoPostRow>`
    WITH ranked AS (
      SELECT
        ph.id,
        ph.original_filename,
        ph.source,
        ph.release_batch,
        ph.source_url,
        ph.created_at,
        ph.width,
        ph.height,
        MAX(${faceConfExpr()}) AS best_face_conf
      FROM photo_faces pf
      JOIN photos ph ON ph.id = pf.photo_id
      WHERE pf.person_id = ${args.personId}
        AND (ph.redacted IS NULL OR ph.redacted = false)
      GROUP BY ph.id, ph.original_filename, ph.source, ph.release_batch, ph.source_url, ph.created_at, ph.width, ph.height
    )
    SELECT
      id, original_filename, source, release_batch, source_url, created_at, width, height
    FROM ranked
    WHERE best_face_conf >= ${minConf}
      AND (${cursor}::text IS NULL OR id < ${cursor})
    ORDER BY id DESC
    LIMIT ${limit + 1}
  `;

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;

  return { rows: page, nextCursor };
}

export async function getWithPeopleByPhotoIds(photoIds: string[], ownerPersonId: string) {
  if (!photoIds.length) return {};

  const rows = await q<{ photo_id: string; person_id: string; name: string | null }>`
    SELECT DISTINCT
      pf.photo_id,
      pf.person_id,
      pe.name
    FROM photo_faces pf
    JOIN people pe ON pe.id = pf.person_id
    WHERE pf.photo_id = ANY(${photoIds}::text[])
      AND pf.person_id IS NOT NULL
      AND pf.person_id <> ${ownerPersonId}
    ORDER BY pf.photo_id, pf.person_id
  `;

  const out: Record<string, Array<{ slug: string; name: string }>> = {};
  for (const r of rows) {
    if (!out[r.photo_id]) out[r.photo_id] = [];
    out[r.photo_id].push({ slug: r.person_id, name: r.name ?? r.person_id });
  }
  return out;
}

// =========================
// Friends
// =========================


export async function getFriendsForPerson(args: {
  personId: string;
  limit?: number;
  minConf?: number;
}): Promise<FriendEdge[]> {
  const limit = Math.min(100, Math.max(1, args.limit ?? 48));
  const minConf = args.minConf ?? 98;

  const rows = await q<{
    slug: string;
    name: string | null;
    weight: number;
  }>`
    WITH my_photos AS (
      SELECT DISTINCT pf.photo_id
      FROM photo_faces pf
      WHERE pf.person_id = ${args.personId}
        AND ${faceConfExpr()} >= ${minConf}
    ),
    edges AS (
      SELECT
        pf.person_id AS other_id,
        COUNT(DISTINCT pf.photo_id)::int AS weight
      FROM photo_faces pf
      JOIN my_photos mp ON mp.photo_id = pf.photo_id
      WHERE pf.person_id IS NOT NULL
        AND pf.person_id <> ${args.personId}
        AND ${faceConfExpr()} >= ${minConf}
      GROUP BY pf.person_id
      ORDER BY weight DESC, pf.person_id ASC
      LIMIT ${limit}
    )
    SELECT
      e.other_id AS slug,
      pe.name,
      e.weight
    FROM edges e
    JOIN people pe ON pe.id = e.other_id
    ORDER BY e.weight DESC, e.other_id ASC
  `;

  const slugs = rows.map((r) => r.slug);
  const avatarMap = await getAvatarPhotoIdMap(slugs);

  return rows.map((r) => {
    const pid = avatarMap.get(r.slug);
    return {
      slug: r.slug,
      name: r.name ?? r.slug,
      weight: r.weight,
      avatarUrl: pid ? photoThumbUrl(pid, 256) : undefined,
    };
  });
}

// =========================
// Old “celebrity” API compatibility
// (so you don’t touch call sites yet)
// =========================

export async function getCelebrityBySlug(slug: string): Promise<Celebrity | null> {
  const p = await getPersonById(slug);
  if (!p) return null;

  const rows = await q<{ photo_count: number }>`
    SELECT COUNT(DISTINCT pf.photo_id)::int AS photo_count
    FROM photo_faces pf
    WHERE pf.person_id = ${slug}
  `;

  return {
    name: p.name ?? p.id,
    count: rows[0]?.photo_count ?? 0,
    appearances: [],
  };
}

export async function getAllCelebrities(): Promise<Celebrity[]> {
  const rows = await q<{ id: string; name: string | null; photo_count: number }>`
    SELECT
      p.id,
      p.name,
      COUNT(DISTINCT pf.photo_id)::int AS photo_count
    FROM people p
    LEFT JOIN photo_faces pf ON pf.person_id = p.id
    GROUP BY p.id, p.name
    HAVING COUNT(DISTINCT pf.photo_id) > 0
    ORDER BY COUNT(DISTINCT pf.photo_id) DESC, p.id ASC
  `;

  return rows.map((r) => ({
    name: r.name ?? r.id,
    count: r.photo_count ?? 0,
    appearances: [],
  }));
}

export async function getAvatarUrlForSlug(slug: string): Promise<string | null> {
  const s = String(slug || "").trim();
  if (!s) return null;

  const rows = await q<{ avatar_photo_id: string | null }>`
    WITH ranked AS (
      SELECT
        pf.photo_id,
        ROW_NUMBER() OVER (
          ORDER BY COUNT(*) DESC, AVG(${faceConfExpr()}) DESC, pf.photo_id ASC
        ) AS rn
      FROM photo_faces pf
      JOIN photos ph ON ph.id = pf.photo_id
      WHERE pf.person_id = ${s}
        AND (ph.redacted IS NULL OR ph.redacted = false)
      GROUP BY pf.photo_id
    )
    SELECT photo_id AS avatar_photo_id
    FROM ranked
    WHERE rn = 1
    LIMIT 1
  `;

  const id = rows[0]?.avatar_photo_id ?? null;
  return id ? photoThumbUrl(id, 256) : null;
}

export async function searchCelebs(
  qstr: string,
  limit = 8
): Promise<Array<{ slug: string; name: string; score: number }>> {
  const query = String(qstr || "").trim();
  if (!query) return [];

  const like = `%${query}%`;
  const lim = Math.max(1, Math.min(25, limit));

  const rows = await q<{ id: string; name: string | null }>`
    SELECT id, name
    FROM people
    WHERE (name ILIKE ${like}) OR (id ILIKE ${like})
    ORDER BY
      CASE
        WHEN LOWER(name) = LOWER(${query}) THEN 0
        WHEN LOWER(name) LIKE LOWER(${query}) || '%' THEN 1
        WHEN LOWER(id) = LOWER(${query}) THEN 2
        WHEN LOWER(id) LIKE LOWER(${query}) || '%' THEN 3
        ELSE 4
      END,
      COALESCE(name, id) ASC
    LIMIT ${lim}
  `;

  return rows.map((r) => {
    const name = r.name ?? r.id;
    const nn = name.toLowerCase();
    const qq = query.toLowerCase();
    let score = 30;
    if (nn === qq) score = 100;
    else if (nn.startsWith(qq)) score = 80;
    else if (nn.includes(qq)) score = 50;
    return { slug: r.id, name, score };
  });
}

// =========================
// Placeholder avatars (unchanged)
// =========================

const AVATAR_PLACEHOLDER_MAX = 512;
const avatarPlaceholderCache = new Map<string, string>();

function lruSet(map: Map<string, string>, k: string, v: string, max: number) {
  if (map.has(k)) map.delete(k);
  map.set(k, v);
  while (map.size > max) {
    const oldest = map.keys().next().value as string | undefined;
    if (!oldest) break;
    map.delete(oldest);
  }
}
