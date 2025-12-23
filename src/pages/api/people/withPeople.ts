// pages/api/people/withPeople.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAllCelebrities, slugifyName } from "@/lib/people";
import { chooseBestPage, conf } from "@/lib/appearances";
import { createTtlCache } from "@/lib/apiCache";

type Appearance = { file: string; page: number; confidence?: number };
type WithPerson = { name: string; slug: string };

const cache = createTtlCache<Record<string, WithPerson[]>>();

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ownerSlug = String(req.query.slug || "").trim();
  const keysRaw = String(req.query.keys || "").trim();
  if (!ownerSlug) return res.status(400).json({ error: "missing slug" });
  if (!keysRaw) return res.status(400).json({ error: "missing keys" });

  const keys = keysRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!keys.length) return res.status(400).json({ error: "no keys" });

  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");

  const k = `with:${ownerSlug}:${keys.join("|")}`;

  const hit = cache.get(k);
  if (hit) return res.status(200).json({ withByKey: hit });

  const withByKey = await cache.once(k, async () => {
    const allCelebs = getAllCelebrities();

    const slugToName = new Map<string, string>();
    for (const c of allCelebs) slugToName.set(slugifyName(c.name), c.name);

    const keysSet = new Set(keys);
    const byFile = buildPagePeopleIndex({ allCelebs, keysSet });

    const out: Record<string, WithPerson[]> = {};
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
      out[file] = coPeopleForPost({
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

    return cache.set(k, out, 30 * 60_000);
  });

  return res.status(200).json({ withByKey });
}