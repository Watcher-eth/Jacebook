import type { NextApiRequest, NextApiResponse } from "next";
import { getAllCelebrities, slugifyName } from "@/lib/people";
import { fileUrl, parseEftaId, thumbnailKeyForPdf } from "@/lib/worker-client";
import { isBannedAuthorSlug } from "@/lib/consts";
import { fetchWikidataProfileByName } from "@/lib/wikidata";

type Appearance = { file: string; page: number; confidence?: number };
type WithPerson = { name: string; slug: string };

type FeedPost = {
  key: string; // pdf key
  url: string;
  timestamp: string;
  content: string;

  author: string;
  authorSlug: string;
  authorAvatar: string;

  imageUrl?: string;   // thumb
  hqImageUrl?: string; // HQ

  withPeople?: WithPerson[];
};

const MIN_CONF = 99.7;
const FIXED_TIMESTAMP = "Dec 19, 2025";
const LIMIT_DEFAULT = 12;

// WITH logic (matches your person-page style)
const WITH_MIN_CONF = 98.8;
const WITH_PAGE_WINDOW = 1;
const WITH_MAX = 6;

// ---- deterministic RNG (stable pagination mixing) ----
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---- tiny cache utils (server memory) ----
function now() {
  return Date.now();
}
type CacheEntry<T> = { exp: number; v: T };
function getCache<T>(m: Map<string, CacheEntry<T>>, k: string) {
  const e = m.get(k);
  if (e && e.exp > now()) return e.v;
  return null;
}
function setCache<T>(m: Map<string, CacheEntry<T>>, k: string, v: T, ttlMs: number) {
  m.set(k, { exp: now() + ttlMs, v });
  return v;
}
const inflight = new Map<string, Promise<any>>();
async function once<T>(key: string, fn: () => Promise<T>) {
  const p = inflight.get(key);
  if (p) return p as Promise<T>;
  const q = fn().finally(() => inflight.delete(key));
  inflight.set(key, q);
  return q;
}

// cache: name -> avatarUrl|null (24h)
const avatarCache = new Map<string, CacheEntry<string | null>>();

// NOTE: this assumes your wikidata layer returns `imageUrl`
// if it doesn't yet, it will just be "" and still cached.
async function getAvatarForName(name: string): Promise<string> {
  const k = name;
  const cached = getCache(avatarCache, k);
  if (cached !== null) return cached || "";

  const v = await once(`wd-avatar:${k}`, async () => {
    const wd = await fetchWikidataProfileByName(k).catch(() => null);
    const img = (wd as any)?.imageUrl;
    return setCache(avatarCache, k, typeof img === "string" ? img : null, 24 * 60 * 60_000);
  });

  return v || "";
}

// ---- appearance helpers ----
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

function pageJpegKeyFast(pdfKey: string, page: number) {
  const base = pdfKey.replace(/\.pdf$/i, "");
  const p = String(page).padStart(3, "0");
  return `pdfs-as-jpegs/${base}/page-${p}.jpg`;
}

function pageJpegUrlFast(pdfKey: string, page: number) {
  return fileUrl(pageJpegKeyFast(pdfKey, page));
}

type Item = { file: string; previewPage: number; pages: number[] };

// ---- WITH people index, restricted to returned files only (fast-ish) ----
function buildPagePeopleIndex(args: {
  allCelebs: ReturnType<typeof getAllCelebrities>;
  keysSet: Set<string>;
}) {
  const { allCelebs, keysSet } = args;

  // file -> page -> Map<slug, maxConf>
  const byFile = new Map<string, Map<number, Map<string, number>>>();

  for (const c of allCelebs) {
    const slug = slugifyName(c.name);
    // optional: don't show banned people in "with"
    if (isBannedAuthorSlug(slug)) continue;

    for (const a of ((c.appearances as any as Appearance[]) || [])) {
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
  const cursor = Math.max(0, Number(req.query.cursor || 0));
  const limit = Math.min(50, Math.max(6, Number(req.query.limit || LIMIT_DEFAULT)));

  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");

  const all = getAllCelebrities();

  // slug -> name
  const slugToName = new Map<string, string>();
  for (const c of all) slugToName.set(slugifyName(c.name), c.name);

  // Build per-author queues
  const queues = new Map<string, { author: string; items: Item[] }>();

  for (const c of all) {
    const authorSlug = slugifyName(c.name);
    if (isBannedAuthorSlug(authorSlug)) continue;

    const apps = (c.appearances as Appearance[]) || [];
    const hi = apps.filter((a) => !!a?.file && !!a?.page && (a.confidence ?? 0) >= MIN_CONF);
    if (!hi.length) continue;

    const byFile = new Map<string, Appearance[]>();
    for (const a of hi) {
      const arr = byFile.get(a.file);
      if (arr) arr.push(a);
      else byFile.set(a.file, [a]);
    }

    const items: Item[] = [];
    for (const [file, arr] of byFile.entries()) {
      const previewPage = chooseBestPage(arr);
      const pages = arr.map((x) => x.page).sort((m, n) => m - n);
      items.push({ file, previewPage, pages });
    }

    items.sort((a, b) => parseEftaId(b.file) - parseEftaId(a.file));

    queues.set(authorSlug, { author: c.name, items });
  }

  const authors = Array.from(queues.keys());
  if (!authors.length) {
    res.status(200).json({ posts: [], nextCursor: null });
    return;
  }

  const seedFn = xmur3(`feed:v1:${cursor}`);
  const rand = mulberry32(seedFn());

  const idx = new Map<string, number>();
  for (const s of authors) idx.set(s, 0);

  function nextAuthorRound(): string | null {
    const round = shuffleInPlace([...authors], rand);
    for (const s of round) {
      const q = queues.get(s)!;
      const i = idx.get(s)!;
      if (i < q.items.length) return s;
    }
    return null;
  }

  // burn cursor
  let produced = 0;
  while (produced < cursor) {
    const s = nextAuthorRound();
    if (!s) break;
    idx.set(s, (idx.get(s) || 0) + 1);
    produced++;
  }

  // produce page (without withPeople/avatars yet)
  const out: FeedPost[] = [];

  while (out.length < limit) {
    const s = nextAuthorRound();
    if (!s) break;

    const q = queues.get(s)!;
    const i = idx.get(s)!;
    const it = q.items[i];
    idx.set(s, i + 1);

    const shown = it.pages.slice(0, 8);
    const pageHint = shown.length ? `Pages: ${shown.join(", ")}${it.pages.length > shown.length ? "…" : ""}` : "";
    const efta = it.file.match(/(EFTA\d+)\.pdf$/i)?.[1]?.toUpperCase() ?? it.file.split("/").pop() ?? it.file;

    out.push({
      key: it.file,
      url: fileUrl(it.file),
      timestamp: FIXED_TIMESTAMP,
      content: `${efta}${pageHint ? ` • ${pageHint}` : ""} • Page ${it.previewPage}`,
      author: q.author,
      authorSlug: s,
      authorAvatar: "",

      imageUrl: fileUrl(thumbnailKeyForPdf(it.file)),
      hqImageUrl: pageJpegUrlFast(it.file, it.previewPage),
    });
  }

  // avatars: only once per unique author in this page (cached)
  const uniqAuthorNames = Array.from(new Set(out.map((p) => p.author)));
  const avatarPairs = await Promise.all(
    uniqAuthorNames.map(async (name) => [name, await getAvatarForName(name)] as const)
  );
  const avatarByName = new Map<string, string>(avatarPairs);

  // withPeople: build restricted index for returned files only
  const keysSet = new Set(out.map((p) => p.key));
  const byFile = buildPagePeopleIndex({ allCelebs: all, keysSet });

  // finalize
  const posts = out.map((p) => {
    const previewPage = Number((p.content.match(/Page (\d+)/)?.[1] ?? "1")) || 1;

    const withPeople = coPeopleForPost({
      byFile,
      file: p.key,
      page: previewPage,
      ownerSlug: p.authorSlug,
      slugToName,
      minConfOther: WITH_MIN_CONF,
      pageWindow: WITH_PAGE_WINDOW,
      maxPeople: WITH_MAX,
    });

    return {
      ...p,
      authorAvatar: avatarByName.get(p.author) ?? "",
      withPeople,
    };
  });

  const nextCursor = posts.length === 0 ? null : String(cursor + posts.length);
  res.status(200).json({ posts, nextCursor });
}