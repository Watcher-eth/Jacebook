// pages/api/people/with-people.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAllCelebrities, slugifyName } from "@/lib/people";

type Appearance = { file: string; page: number; confidence?: number };
type WithPerson = { name: string; slug: string };

function conf(a: Appearance) {
  return typeof a.confidence === "number" ? a.confidence : 0;
}

function chooseBestPage(appearances: Appearance[]) {
  if (!appearances.length) return 1;
  let best = appearances[0]!;
  for (const cur of appearances) {
    const cb = conf(best);
    const cc = conf(cur);
    if (cc > cb) best = cur;
    else if (cc === cb && (cur.page ?? 1e9) < (best.page ?? 1e9)) best = cur;
  }
  return best.page || 1;
}

function buildPagePeopleIndex(args: {
  allCelebs: ReturnType<typeof getAllCelebrities>;
  keysSet: Set<string>;
}) {
  const { allCelebs, keysSet } = args;
  const byFile = new Map<string, Map<number, Map<string, number>>>();

  for (const c of allCelebs) {
    const slug = slugifyName(c.name);
    for (const a of (c.appearances as any as Appearance[]) || []) {
      if (!a?.file || !a?.page) continue;
      if (!keysSet.has(a.file)) continue;

      let pages = byFile.get(a.file);
      if (!pages) {
        pages = new Map();
        byFile.set(a.file, pages);
      }

      let people = pages.get(a.page);
      if (!people) {
        people = new Map();
        pages.set(a.page, people);
      }

      const prev = people.get(slug) ?? 0;
      const next = conf(a);
      if (next > prev) people.set(slug, next);
    }
  }

  return byFile;
}

function coPeopleForPost(args: {
  byFile: Map<string, Map<number, Map<string, number>>>;
  file: string;
  page: number;
  ownerSlug: string;
  slugToName: Map<string, string>;
  minConfOther: number;
  pageWindow: number;
  maxPeople: number;
}): WithPerson[] {
  const { byFile, file, page, ownerSlug, slugToName, minConfOther, pageWindow, maxPeople } = args;

  const pages = byFile.get(file);
  if (!pages) return [];

  const agg = new Map<string, number>();

  for (let q = page - pageWindow; q <= page + pageWindow; q++) {
    const people = pages.get(q);
    if (!people) continue;

    for (const [otherSlug, otherConf] of people.entries()) {
      if (otherSlug === ownerSlug) continue;
      if (otherConf < minConfOther) continue;
      const prev = agg.get(otherSlug) ?? 0;
      if (otherConf > prev) agg.set(otherSlug, otherConf);
    }
  }

  return Array.from(agg.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxPeople)
    .map(([s]) => ({ slug: s, name: slugToName.get(s) ?? s }));
}

type CacheEntry<T> = { exp: number; v: T };
const cache = new Map<string, CacheEntry<Record<string, WithPerson[]>>>();
const inflight = new Map<string, Promise<Record<string, WithPerson[]>>>();

function now() {
  return Date.now();
}
function getCached(k: string) {
  const e = cache.get(k);
  if (e && e.exp > now()) return e.v;
  return null;
}
function setCached(k: string, v: Record<string, WithPerson[]>, ttlMs: number) {
  cache.set(k, { exp: now() + ttlMs, v });
  return v;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ownerSlug = String(req.query.slug || "").trim();
  const keysRaw = String(req.query.keys || "").trim();
  if (!ownerSlug) return res.status(400).json({ error: "missing slug" });
  if (!keysRaw) return res.status(400).json({ error: "missing keys" });

  const keys = keysRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!keys.length) return res.status(400).json({ error: "no keys" });

  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");

  const k = `with:${ownerSlug}:${keys.join("|")}`;
  const cached = getCached(k);
  if (cached) return res.status(200).json({ withByKey: cached });

  const p0 = inflight.get(k);
  if (p0) {
    const withByKey = await p0;
    return res.status(200).json({ withByKey });
  }

  const p = (async () => {
    const allCelebs = getAllCelebrities();

    const slugToName = new Map<string, string>();
    for (const c of allCelebs) slugToName.set(slugifyName(c.name), c.name);

    const keysSet = new Set(keys);
    const byFile = buildPagePeopleIndex({ allCelebs, keysSet });

    const withByKey: Record<string, WithPerson[]> = {};
    const owner = allCelebs.find((c) => slugifyName(c.name) === ownerSlug);
    const ownerApps = (owner?.appearances as any as Appearance[]) || [];
    const ownerHi = ownerApps.filter((a) => (a.confidence ?? 0) >= 99.7);

    const ownerByFile = new Map<string, Appearance[]>();
    for (const a of ownerHi) {
      const arr = ownerByFile.get(a.file) || [];
      arr.push(a);
      ownerByFile.set(a.file, arr);
    }

    for (const file of keys) {
      const apps = ownerByFile.get(file) || [];
      const page = chooseBestPage(apps);
      withByKey[file] = coPeopleForPost({
        byFile,
        file,
        page,
        ownerSlug,
        slugToName,
        minConfOther: 98.8,
        pageWindow: 1,
        maxPeople: 6,
      });
    }

    return setCached(k, withByKey, 30 * 60_000);
  })().finally(() => inflight.delete(k));

  inflight.set(k, p);
  const withByKey = await p;
  return res.status(200).json({ withByKey });
}