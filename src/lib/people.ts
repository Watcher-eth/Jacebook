// src/lib/people.ts
import { CELEBRITY_DATA, type Celebrity } from "@/lib/celebrity-data";
import { fileUrl } from "@/lib/worker-client";

export function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Appearance = { file: string; page: number; confidence?: number };

function conf(a: Appearance) {
  return typeof a.confidence === "number" ? a.confidence : 0;
}

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

// FAST: no manifest needed
function pageJpegKeyFast(pdfKey: string, page: number) {
  const base = pdfKey.replace(/\.pdf$/i, "");
  const p = String(page).padStart(3, "0");
  return `pdfs-as-jpegs/${base}/page-${p}.jpg`;
}
function pageJpegUrlFast(pdfKey: string, page: number) {
  return fileUrl(pageJpegKeyFast(pdfKey, page));
}

// ----- precomputed indexes (module init) -----

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

// For navbar / search results (instant, no manifest)
export function getAvatarUrlForSlug(slug: string) {
  const pick = AVATAR_PICK.get(slug);
  if (!pick) return null;
  return pageJpegUrlFast(pick.file, pick.page);
}

// Useful for fast search popover without touching huge objects
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