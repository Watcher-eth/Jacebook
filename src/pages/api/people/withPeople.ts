// pages/api/people/withPeople.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createTtlCache } from "@/lib/apiCache";
import { q } from "@/lib/db";

type WithPerson = { name: string; slug: string };

const cache = createTtlCache<Record<string, WithPerson[]>>();

// match your other endpoints’ thresholds
const MIN_CONF_OWNER = 99;
const MIN_CONF_OTHER = 98;
const WITH_MAX = 6;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ownerSlug = String(req.query.slug || "").trim();
  const keysRaw = String(req.query.keys || "").trim();

  if (!ownerSlug) return res.status(400).json({ error: "missing slug" });
  if (!keysRaw) return res.status(400).json({ error: "missing keys" });

  const keys = keysRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!keys.length) return res.status(400).json({ error: "no keys" });

  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");

  // cache key is stable for same params
  const ck = `withv2:${ownerSlug}:${keys.join("|")}`;
  const hit = cache.get(ck);
  if (hit) return res.status(200).json({ withByKey: hit });

  const withByKey = await cache.once(ck, async () => {
    const rows = await q<{
      photo_id: string;
      slug: string;
      name: string | null;
      anon_id: number | null;
      c: number;
      rn: number;
    }>`
      WITH owner_ok AS (
        -- only include photos where the owner is actually present at high confidence
        SELECT pf.photo_id
        FROM photo_faces pf
        JOIN photos ph ON ph.id = pf.photo_id
        WHERE pf.person_id = ${ownerSlug}
          AND COALESCE(pf.celebrity_confidence, pf.confidence, 0) >= ${MIN_CONF_OWNER}
          AND pf.photo_id = ANY(${keys}::text[])
          AND (ph.redacted IS NULL OR ph.redacted = false)
        GROUP BY pf.photo_id
      ),
      others AS (
        SELECT
          pf.photo_id,
          p.id AS slug,
          p.name,
          p.anon_id,
          MAX(COALESCE(pf.celebrity_confidence, pf.confidence, 0)) AS c
        FROM owner_ok ok
        JOIN photo_faces pf ON pf.photo_id = ok.photo_id
        JOIN people p ON p.id = pf.person_id
        WHERE pf.person_id IS NOT NULL
          AND pf.person_id <> ${ownerSlug}
          AND COALESCE(pf.celebrity_confidence, pf.confidence, 0) >= ${MIN_CONF_OTHER}
        GROUP BY pf.photo_id, p.id, p.name, p.anon_id
      ),
      ranked AS (
        SELECT
          o.*,
          ROW_NUMBER() OVER (
            PARTITION BY o.photo_id
            ORDER BY o.c DESC, o.slug ASC
          ) AS rn
        FROM others o
      )
      SELECT photo_id, slug, name, anon_id, c, rn
      FROM ranked
      WHERE rn <= ${WITH_MAX}
      ORDER BY photo_id ASC, rn ASC
    `;

    const out: Record<string, WithPerson[]> = {};
    for (const k of keys) out[k] = [];

    for (const r of rows) {
      const display =
        r.name ?? (r.anon_id != null ? `Person ${r.anon_id}` : r.slug);
      out[r.photo_id]!.push({ slug: r.slug, name: display });
    }

    return cache.set(ck, out, 30 * 60_000);
  });

  return res.status(200).json({ withByKey });
}