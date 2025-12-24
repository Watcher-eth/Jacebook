// src/lib/avatars.ts
import { q } from "@/lib/db";
import { createTtlCache } from "@/lib/apiCache";

const avatarCache = createTtlCache<Map<string, string | null>>();
const MIN_AVATAR_CONF = 98;

function keyFor(slugs: string[]) {
  const uniq = Array.from(new Set(slugs.filter(Boolean))).sort();
  return `avatars:v2:${uniq.join(",")}`;
}

export async function getAvatarPhotoIdMap(slugs: string[]) {
  const uniq = Array.from(new Set(slugs.filter(Boolean)));
  if (uniq.length === 0) return new Map<string, string | null>();

  const k = keyFor(uniq);
  const hit = avatarCache.get(k);
  if (hit) return hit;

  return avatarCache.once(k, async () => {
    const rows = (await q`
      WITH best_faces AS (
        SELECT
          pf.person_id,
          pf.photo_id,
          ROW_NUMBER() OVER (
            PARTITION BY pf.person_id
            ORDER BY
              (pf.bbox_width * pf.bbox_height) DESC,
              COALESCE(pf.celebrity_confidence, pf.confidence, 0) DESC,
              pf.photo_id ASC
          ) AS rn
        FROM photo_faces pf
        JOIN photos ph ON ph.id = pf.photo_id
        WHERE pf.person_id = ANY(${uniq})
          AND (ph.redacted IS NULL OR ph.redacted = false)
          AND ph.content_type LIKE 'image/%'
          AND COALESCE(pf.celebrity_confidence, pf.confidence, 0) >= ${MIN_AVATAR_CONF}
          AND ph.original_filename !~* '(pdf|scan|document|form)'
      )
      SELECT person_id, photo_id
      FROM best_faces
      WHERE rn = 1
    `) as Array<{ person_id: string; photo_id: string }>;

    const m = new Map<string, string | null>();
    for (const s of uniq) m.set(s, null);
    for (const r of rows) m.set(r.person_id, r.photo_id);

    return avatarCache.set(k, m, 7 * 24 * 60 * 60_000);
  });
}