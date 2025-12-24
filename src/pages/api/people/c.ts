// pages/api/people/c.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getCelebrityBySlug } from "@/lib/people";
import { fetchWikidataProfileByName } from "@/lib/wikidata";
import { getCommunitySlugs } from "@/lib/consts";
import { createTtlCache } from "@/lib/apiCache";

type PersonCard = { slug: string; name: string; imageUrl: string };

const personCache = createTtlCache<PersonCard>();

async function hydratePerson(slug: string): Promise<PersonCard> {
  const k = `person:${slug}`;

  const hit = personCache.get(k);
  if (hit) return hit;

  return personCache.once(k, async () => {
    const celeb = await getCelebrityBySlug(slug);
    const name = celeb?.name ?? slug;

    const wd = await fetchWikidataProfileByName(name).catch(() => null);
    const imageUrl = typeof (wd as any)?.imageUrl === "string" ? (wd as any).imageUrl : "";

    const v: PersonCard = {
      slug,
      name: typeof (wd as any)?.name === "string" ? (wd as any).name : name,
      imageUrl,
    };

    return personCache.set(k, v, 24 * 60 * 60_000);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const community = String(req.query.community || "");
  const slugs = getCommunitySlugs(community);

  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");

  if (!slugs.length) return res.status(200).json({ people: [] as PersonCard[] });

  const uniq = Array.from(new Set(slugs));
  const people = await Promise.all(uniq.map((s) => hydratePerson(s)));

  return res.status(200).json({ people });
}