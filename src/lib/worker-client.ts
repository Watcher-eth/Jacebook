// src/lib/worker-client.ts
export type WorkerFile = { key: string; size: number; uploaded: string };

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL || "https://jacebook-worker.jacebook.workers.dev";

export function getWorkerUrl() {
  return WORKER_URL.replace(/\/+$/, "");
}

export function isImageKey(key: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(key);
}

export function isPdfKey(key: string) {
  return /\.pdf$/i.test(key);
}

const ASSET_V = process.env.NEXT_PUBLIC_ASSET_V || "20251221";

export function fileUrl(key: string) {
  const clean = key.replace(/^\/+/, "");
  return `${getWorkerUrl()}/${clean}?v=${ASSET_V}`;
}

export function thumbnailKeyForPdf(pdfKey: string) {
  return `thumbnails/${pdfKey.replace(/\.pdf$/i, ".jpg")}`;
}

export function thumbnailUrlForPdf(pdfKey: string) {
  return `${getWorkerUrl()}/${thumbnailKeyForPdf(pdfKey)}`;
}

export function thumbnailUrl(key: string) {
  if (isImageKey(key)) return fileUrl(key);
  if (isPdfKey(key)) return fileUrl(thumbnailKeyForPdf(key));
  return fileUrl(key);
}

type CacheEntry<T> = { exp: number; v: T };
const jsonCache = new Map<string, CacheEntry<any>>();
const inflight = new Map<string, Promise<any>>();

function now() {
  return Date.now();
}

function stableKey(url: string, body?: unknown) {
  return body ? `${url}::${JSON.stringify(body)}` : url;
}

async function fetchJsonCached<T>(args: {
  url: string;
  init?: RequestInit;
  bodyKey?: unknown;
  ttlMs: number;
}): Promise<T> {
  const k = stableKey(args.url, args.bodyKey);
  const hit = jsonCache.get(k);
  const t = now();
  if (hit && hit.exp > t) return hit.v as T;

  const inF = inflight.get(k);
  if (inF) return inF as Promise<T>;

  const p = (async () => {
    const res = await fetch(args.url, args.init);
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${args.url}`);
    const v = (await res.json()) as T;
    jsonCache.set(k, { exp: t + args.ttlMs, v });
    return v;
  })().finally(() => inflight.delete(k));

  inflight.set(k, p);
  return p;
}

export async function filesByKeys(keys: string[], opts?: { ttlMs?: number }) {
  if (!keys.length) return [];
  const url = `${getWorkerUrl()}/api/files-by-keys`;

  // important: keys order changes cache key; sort for stable caching
  const stableKeys = [...keys].sort();

  const ttlMs = opts?.ttlMs ?? 5 * 60_000; // 5 min
  const json = await fetchJsonCached<{ files: WorkerFile[] }>({
    url,
    ttlMs,
    bodyKey: stableKeys,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ keys: stableKeys }),
    },
  });

  return json.files;
}

export interface PdfManifestEntry {
  pages: number;
}
export type PdfManifest = Record<string, PdfManifestEntry>;

export async function fetchPdfManifest(opts?: { ttlMs?: number }): Promise<PdfManifest | null> {
  const url = `${getWorkerUrl()}/api/pdf-manifest`;
  const ttlMs = opts?.ttlMs ?? 30 * 60_000; 
  try {
    return await fetchJsonCached<PdfManifest>({ url, ttlMs });
  } catch {
    return null;
  }
}

function isString(x: any): x is string {
  return typeof x === "string";
}

export function resolvePageJpegKey(manifest: PdfManifest, pdfKey: string, page: number): string | null {
  if (!manifest) return null;
  const direct = (manifest as any)?.[pdfKey];
  if (!direct) return null;

  const n = (direct as any)?.pages;
  if (typeof n === "number" && n > 0) {
    if (page < 1 || page > n) return null;
    const base = pdfKey.replace(/\.pdf$/i, "");
    const p = String(page).padStart(3, "0");
    return `pdfs-as-jpegs/${base}/page-${p}.jpg`;
  }

  const a = (direct as any)?.[page];
  if (isString(a)) return a;

  const b = (direct as any)?.pages?.[page];
  if (isString(b)) return b;

  const c = (direct as any)?.pages?.[String(page)];
  if (isString(c)) return c;

  if (Array.isArray((direct as any)?.pages)) {
    const entry = (direct as any).pages[page - 1];
    if (isString(entry)) return entry;
    const key = (entry as any)?.key || (entry as any)?.jpg || (entry as any)?.path;
    if (isString(key)) return key;
  }

  if (Array.isArray((manifest as any)?.items)) {
    const item = (manifest as any).items.find(
      (x: any) => x?.pdfKey === pdfKey || x?.pdf === pdfKey || x?.key === pdfKey
    );

    if (item) {
      const pages = item.pages;
      if (Array.isArray(pages)) {
        const entry = pages[page - 1];
        if (isString(entry)) return entry;
        const key = (entry as any)?.key || (entry as any)?.jpg || (entry as any)?.path;
        if (isString(key)) return key;
      }

      const maybe = item?.pages?.[page] || item?.pages?.[String(page)];
      if (isString(maybe)) return maybe;
    }
  }

  return null;
}

export function pageJpegUrlOrThumb(manifest: PdfManifest | null, pdfKey: string, page: number) {
  const jpgKey = manifest ? resolvePageJpegKey(manifest, pdfKey, page) : null;
  if (jpgKey) return fileUrl(jpgKey);
  return thumbnailUrlForPdf(pdfKey);
}

export function parseEftaId(key: string) {
  const m = key.match(/EFTA(\d+)\.pdf$/i);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

export function pageJpegKeyFast(pdfKey: string, page: number) {
    const base = pdfKey.replace(/\.pdf$/i, "");
    const p = String(page).padStart(3, "0");
    return `pdfs-as-jpegs/${base}/page-${p}.jpg`;
  }
  
  export function pageJpegUrlFast(pdfKey: string, page: number) {
    return fileUrl(pageJpegKeyFast(pdfKey, page));
  }
  
  export function thumbUrlForPdf(pdfKey: string) {
    return fileUrl(thumbnailKeyForPdf(pdfKey));
  }