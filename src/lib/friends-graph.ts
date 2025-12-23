// src/lib/friends-graph.ts
import type { Celebrity } from "@/lib/celebrity-data";
import { slugifyName } from "@/lib/people";
import { pageJpegUrlOrThumb, thumbnailKeyForPdf, fileUrl } from "@/lib/worker-client";

export type FriendEdge = {
  slug: string;
  name: string;
  weight: number; // number of co-occurring "events"
  avatarUrl?: string;
};

type Appearance = {
  file: string;
  page: number;
  confidence?: number;
};

function conf(a: Appearance) {
  return typeof a.confidence === "number" ? a.confidence : 0;
}

function chooseBestAppearance(aps: Appearance[], minConf: number): Appearance | null {
  const hi = (aps || []).filter((a) => a?.file && a?.page && conf(a) >= minConf);
  if (!hi.length) return null;

  return hi.reduce((best, cur) => {
    const cb = conf(best);
    const cc = conf(cur);
    if (cc > cb) return cur;
    if (cc === cb && cur.page < best.page) return cur;
    return best;
  }, hi[0]);
}

function avatarUrlForCeleb(args: { celeb: Celebrity; minConf: number; manifest: any | null }) {
  const best = chooseBestAppearance(args.celeb.appearances as any, args.minConf);
  if (!best) return undefined;

  if (args.manifest) {
    const u = pageJpegUrlOrThumb(args.manifest, best.file, best.page);
    try {
      const parsed = new URL(u);
      const path = parsed.pathname.replace(/^\//, "");
      return fileUrl(path);
    } catch {
      return u;
    }
  }

  return fileUrl(thumbnailKeyForPdf(best.file));
}

/**
 * Less-strict friends graph:
 * - edges are counted if owner and other appear in the same file within `pageWindow` pages.
 * - owner can have stricter threshold than other (minConfOwner vs minConfOther).
 */
export function buildFriendsForPerson(opts: {
  ownerSlug: string;
  allCelebs: Celebrity[];
  minConf: number;
  manifest?: any | null;
  minEdgeWeight?: number;
  limit?: number;
  minConfOwner?: number;
  minConfOther?: number;
  pageWindow?: number; // 0 = exact page, 1 = +/-1 page, etc.
}) {
  const {
    ownerSlug,
    allCelebs,
    minConf,
    manifest = null,
    minEdgeWeight = 2,
    limit = 24,
    minConfOwner = minConf,
    minConfOther = minConf,
    pageWindow = 0,
  } = opts;

  const slugToCeleb = new Map<string, Celebrity>();

  const byFile = new Map<string, Map<number, Map<string, number>>>();

  for (const c of allCelebs) {
    const slug = slugifyName(c.name);
    slugToCeleb.set(slug, c);

    for (const a of (c.appearances as any as Appearance[]) || []) {
      if (!a?.file || !a?.page) continue;

      const kFile = a.file;
      const kPage = a.page;
      const cval = conf(a);

      let pages = byFile.get(kFile);
      if (!pages) {
        pages = new Map();
        byFile.set(kFile, pages);
      }

      let people = pages.get(kPage);
      if (!people) {
        people = new Map();
        pages.set(kPage, people);
      }

      const prev = people.get(slug) ?? 0;
      if (cval > prev) people.set(slug, cval);
    }
  }

  const counts = new Map<string, number>();

  for (const [file, pages] of byFile.entries()) {
    const ownerPages: number[] = [];
    for (const [page, people] of pages.entries()) {
      const ownerConf = people.get(ownerSlug) ?? 0;
      if (ownerConf >= minConfOwner) ownerPages.push(page);
    }
    if (!ownerPages.length) continue;

    for (const p of ownerPages) {
      const start = p - pageWindow;
      const end = p + pageWindow;

      const seenOtherInEvent = new Set<string>();

      for (let q = start; q <= end; q++) {
        const people = pages.get(q);
        if (!people) continue;

        for (const [otherSlug, otherConf] of people.entries()) {
          if (otherSlug === ownerSlug) continue;
          if (otherConf < minConfOther) continue;
          seenOtherInEvent.add(otherSlug);
        }
      }

      for (const otherSlug of seenOtherInEvent) {
        counts.set(otherSlug, (counts.get(otherSlug) ?? 0) + 1);
      }
    }
  }

  const edges: FriendEdge[] = Array.from(counts.entries())
    .map(([slug, weight]) => {
      const celeb = slugToCeleb.get(slug);
      const name = celeb?.name ?? slug;

      const avatarUrl = celeb ? avatarUrlForCeleb({ celeb, minConf: minConfOther, manifest }) : undefined;

      return { slug, name, weight, avatarUrl };
    })
    .filter((e) => e.weight >= minEdgeWeight)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);

  return edges;
}