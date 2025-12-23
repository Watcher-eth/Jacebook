// pages/api/people/wikidata.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWikidataProfileByName, type WikidataProfile } from "@/lib/wikidata";
import { createTtlCache } from "@/lib/apiCache";

const wdCache = createTtlCache<WikidataProfile | null>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const name = String(req.query.name || "").trim();
  if (!name) return res.status(400).json({ error: "missing name" });

  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");

  const k = `wd:${name}`;
  const hit = wdCache.get(k);
  if (hit !== null) return res.status(200).json({ wikidata: hit });

  const v = await wdCache.once(k, async () => {
    const wd = await fetchWikidataProfileByName(name).catch(() => null);
    return wdCache.set(k, wd, 7 * 24 * 60 * 60_000);
  });

  return res.status(200).json({ wikidata: v });
}