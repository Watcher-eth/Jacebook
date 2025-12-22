import type { NextApiRequest, NextApiResponse } from "next";
import { getCelebrityBySlug } from "@/lib/people";
import { fileUrl, parseEftaId, thumbnailKeyForPdf } from "@/lib/worker-client";
import { pickLikedBy } from "@/lib/likedBy"

type Appearance = { file: string; page: number; confidence?: number };

type PagePost = {
  key: string;
  url: string;
  timestamp: string;
  content: string;
  authorAvatar: string;
  imageUrl?: string;
  hqImageUrl?: string;
};

const MIN_CONF = 99.7;
const FIXED_TIMESTAMP = "Dec 19, 2025";

function conf(a: Appearance) {
  return typeof a.confidence === "number" ? a.confidence : 0;
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.slug || "");
  const cursor = Math.max(0, Number(req.query.cursor || 0));
  const limit = Math.min(50, Math.max(6, Number(req.query.limit || 12)));

  const celeb = getCelebrityBySlug(slug);
  if (!celeb) {
    res.status(404).json({ posts: [], nextCursor: null });
    return;
  }

  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");

  const hi = (celeb.appearances as Appearance[]).filter(
    (a) => !!a?.file && !!a?.page && (a.confidence ?? 0) >= MIN_CONF
  );

  // Group hi matches by file
  const hiByFile = new Map<string, Appearance[]>();
  for (const a of hi) {
    const arr = hiByFile.get(a.file);
    if (arr) arr.push(a);
    else hiByFile.set(a.file, [a]);
  }

  // Only include files that have at least one hi match
  const keysAll = unique(hi.map((a) => a.file));
  const docsKeysSorted = [...keysAll].sort((a, b) => parseEftaId(b) - parseEftaId(a));

  const slice = docsKeysSorted.slice(cursor, cursor + limit);

  const posts: PagePost[] = slice
    .map((key) => {
      const appearancesInFile = hiByFile.get(key) ?? [];
      if (!appearancesInFile.length) return null; // extra safety

      const previewPage = chooseBestPage(appearancesInFile);

      const pages = appearancesInFile.map((a) => a.page).sort((x, y) => x - y);
      const shown = pages.slice(0, 8);
      const pageHint = shown.length ? `Pages: ${shown.join(", ")}${pages.length > shown.length ? "…" : ""}` : "";

      const efta = key.match(/(EFTA\d+)\.pdf$/i)?.[1]?.toUpperCase() ?? key.split("/").pop() ?? key;

      const thumbUrl = fileUrl(thumbnailKeyForPdf(key));
      const hqUrl = pageJpegUrlFast(key, previewPage);

          const likedBySlugs = pickLikedBy(key, 3);
      
      const likedBy = likedBySlugs.map((slug) => {
        const c = getCelebrityBySlug(slug);
        return {
          slug,
          name: c?.name ?? slug,
        };
      });

      return {
        likedBy,
        key,
        url: fileUrl(key),
        timestamp: FIXED_TIMESTAMP,
        authorAvatar: "",
        content: `${efta}${pageHint ? ` • ${pageHint}` : ""} • Page ${previewPage}`,
        imageUrl: thumbUrl,
        hqImageUrl: hqUrl,
      };
    })
    .filter(Boolean) as PagePost[];

  const next = cursor + limit < docsKeysSorted.length ? String(cursor + limit) : null;
  res.status(200).json({ posts, nextCursor: next });
}