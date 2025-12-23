// src/lib/people.ts
import { CELEBRITY_DATA, type Celebrity } from "@/lib/celebrityData";
import { pageJpegUrlFast } from "@/lib/workerClient";
import { conf } from "./appearances"

export function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Appearance = { file: string; page: number; confidence?: number };

function pickTopAppearance(appearances: Appearance[], minConf: number) {
  let best: Appearance | null = null;
  for (const a of appearances || []) {
    if (!a?.file || !a?.page) continue;
    if (conf(a) < minConf) continue;
    if (!best) best = a;
    else if (conf(a) > conf(best)) best = a;
    else if (conf(a) === conf(best) && (a.page ?? 1e9) < (best.page ?? 1e9)) best = a;
  }
  return best;
}

const CELEB_BY_SLUG = new Map<string, Celebrity>();
const SEARCH_INDEX: Array<{ slug: string; name: string; nameNorm: string }> = [];
const AVATAR_PICK = new Map<string, { file: string; page: number }>();

const DEFAULT_MIN_CONF = 99.7;

for (const c of CELEBRITY_DATA) {
  const slug = slugifyName(c.name);
  CELEB_BY_SLUG.set(slug, c);

  const name = c.name || "";
  SEARCH_INDEX.push({ slug, name, nameNorm: name.toLowerCase().trim() });

  const top = pickTopAppearance((c.appearances as any as Appearance[]) || [], DEFAULT_MIN_CONF);
  if (top) AVATAR_PICK.set(slug, { file: top.file, page: top.page });
}

export function getCelebrityBySlug(slug: string): Celebrity | null {
  return CELEB_BY_SLUG.get(slug) ?? null;
}

export function getAllCelebrities(): Celebrity[] {
  return CELEBRITY_DATA;
}

export function getAvatarUrlForSlug(slug: string) {
  const pick = AVATAR_PICK.get(slug);
  if (!pick) return null;
  return pageJpegUrlFast(pick.file, pick.page);
}

export function searchCelebs(q: string, limit = 8) {
  const query = (q || "").toLowerCase().trim();
  if (!query) return [];

  const scored: Array<{ slug: string; name: string; score: number }> = [];
  for (const it of SEARCH_INDEX) {
    const n = it.nameNorm;
    let score = 0;
    if (n === query) score = 100;
    else if (n.startsWith(query)) score = 80;
    else if (n.includes(query)) score = 50;
    if (score > 0) scored.push({ slug: it.slug, name: it.name, score });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit);
}
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

export function avatarPlaceholderDataUri(label: string, size = 90) {
    const key = `${size}::${label || ""}`;
    const hit = avatarPlaceholderCache.get(key);
    if (hit) {
      // touch (LRU-ish)
      avatarPlaceholderCache.delete(key);
      avatarPlaceholderCache.set(key, hit);
      return hit;
    }
  
    const text = (label || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]!.toUpperCase())
      .join("");
  
    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#262626"/>
        <stop offset="1" stop-color="#343434"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" rx="${Math.floor(size / 2)}" fill="url(#g)"/>
    <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
          font-family="ui-sans-serif, system-ui" font-size="${Math.floor(size * 0.38)}"
          fill="#F9F9F9">${text || "?"}</text>
  </svg>`.trim();
  
    const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    lruSet(avatarPlaceholderCache, key, uri, AVATAR_PLACEHOLDER_MAX);
    return uri;
  }