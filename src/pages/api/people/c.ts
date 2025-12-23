import type { NextApiRequest, NextApiResponse } from "next";
import { getCelebrityBySlug } from "@/lib/people";
import { fetchWikidataProfileByName } from "@/lib/wikidata";
import { getCommunitySlugs } from "@/lib/consts";

type PersonCard = {
  slug: string;
  name: string;
  imageUrl: string;
};

type CacheEntry<T> = { exp: number; v: T };
const cache = new Map<string, CacheEntry<PersonCard>>();
const inflight = new Map<string, Promise<PersonCard>>();

function now() {
  return Date.now();
}
function getCache(k: string) {
  const e = cache.get(k);
  if (e && e.exp > now()) return e.v;
  return null;
}
function setCache(k: string, v: PersonCard, ttlMs: number) {
  cache.set(k, { exp: now() + ttlMs, v });
  return v;
}
async function once<T>(key: string, fn: () => Promise<T>) {
  const p = inflight.get(key);
  if (p) return p as Promise<T>;
  const q = fn().finally(() => inflight.delete(key));
  inflight.set(key, q as any);
  return q;
}

async function hydratePerson(slug: string): Promise<PersonCard> {
  const cached = getCache(slug);
  if (cached) return cached;

  return once(`person:${slug}`, async () => {
    const celeb = getCelebrityBySlug(slug);
    const name = celeb?.name ?? slug;

    const wd = await fetchWikidataProfileByName(name).catch(() => null);
    const imageUrl = typeof (wd as any)?.imageUrl === "string" ? (wd as any).imageUrl : "";

    return setCache(
      slug,
      { slug, name: typeof wd?.name === "string" ? wd.name : name, imageUrl },
      24 * 60 * 60_000
    );
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const community = String(req.query.community || "");
  const slugs = getCommunitySlugs(community);

  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");

  if (!slugs.length) {
    res.status(200).json({ people: [] as PersonCard[] });
    return;
  }

  const uniq = Array.from(new Set(slugs));

  const people = await Promise.all(uniq.map((s) => hydratePerson(s)));

  res.status(200).json({ people });
}