// src/lib/worker-client.ts
export type WorkerFile = { key: string; size: number; uploaded: string };

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL || "https://jacebook-worker.jacebook.workers.dev";

export function getWorkerUrl() {
  return WORKER_URL.replace(/\/+$/, "");
}


// src/lib/worker-client.ts
export function isImageKey(key: string) {
    return /\.(jpe?g|png|webp|gif)$/i.test(key);
  }
  
  export function isPdfKey(key: string) {
    return /\.pdf$/i.test(key);
  }
  
  const ASSET_V = process.env.NEXT_PUBLIC_ASSET_V || "20251221"; // bump when needed

  export function fileUrl(key: string) {
    const clean = key.replace(/^\/+/, "");
    return `${getWorkerUrl()}/${clean}?v=${ASSET_V}`;
  }
  
  export function thumbnailKeyForPdf(pdfKey: string) {
    return `thumbnails/${pdfKey.replace(/\.pdf$/i, ".jpg")}`;
  }
  
  export function thumbnailUrl(key: string) {
    // If it's already an image key, serve it directly (no thumbnails/ prefix)
    if (isImageKey(key)) return fileUrl(key);
  
    // If it's a PDF key, use the derived thumbnail key
    if (isPdfKey(key)) return fileUrl(thumbnailKeyForPdf(key));
  
    // Otherwise just serve direct
    return fileUrl(key);
  }


export function thumbnailUrlForPdf(pdfKey: string) {
  return `${getWorkerUrl()}/${thumbnailKeyForPdf(pdfKey)}`;
}

export async function filesByKeys(keys: string[]) {
  if (!keys.length) return [];
  const res = await fetch(`${getWorkerUrl()}/api/files-by-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error(`Worker /api/files-by-keys failed: ${res.status}`);
  const json = (await res.json()) as { files: WorkerFile[] };
  return json.files;
}

// ---- manifest (optional) ----

export type PdfManifest = any;

export async function fetchPdfManifest(): Promise<PdfManifest | null> {
  const res = await fetch(`${getWorkerUrl()}/api/pdf-manifest`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

function isString(x: any): x is string {
  return typeof x === "string";
}

/**
 * Best-effort resolver for common manifest shapes.
 * Returns an R2 key (NOT full URL) or null.
 */
export function resolvePageJpegKey(manifest: PdfManifest, pdfKey: string, page: number): string | null {
  if (!manifest) return null;

  // Shape A: manifest[pdfKey][page] or manifest[pdfKey].pages[page]
  const direct = manifest?.[pdfKey];
  if (direct) {
    const a = direct?.[page];
    if (isString(a)) return a;
    const b = direct?.pages?.[page];
    if (isString(b)) return b;
    const c = direct?.pages?.[String(page)];
    if (isString(c)) return c;

    // Shape B: manifest[pdfKey].pages is array of strings or objects
    if (Array.isArray(direct?.pages)) {
      const entry = direct.pages[page - 1];
      if (isString(entry)) return entry;
      const key = entry?.key || entry?.jpg || entry?.path;
      if (isString(key)) return key;
    }
  }

  // Shape C: manifest.items = [{ pdfKey, pages: [...] }]
  if (Array.isArray(manifest?.items)) {
    const item = manifest.items.find((x: any) => x?.pdfKey === pdfKey || x?.pdf === pdfKey || x?.key === pdfKey);
    if (item) {
      const pages = item.pages;
      if (Array.isArray(pages)) {
        const entry = pages[page - 1];
        if (isString(entry)) return entry;
        const key = entry?.key || entry?.jpg || entry?.path;
        if (isString(key)) return key;
      }
      const maybe = item?.pages?.[page] || item?.pages?.[String(page)];
      if (isString(maybe)) return maybe;
    }
  }

  return null;
}

export function pageJpegUrlOrThumb(manifest: PdfManifest | null, pdfKey: string, page: number) {
  const jpgKey = resolvePageJpegKey(manifest, pdfKey, page);
  if (jpgKey) return `${getWorkerUrl()}/${jpgKey}`;
  return thumbnailUrlForPdf(pdfKey);
}

export function parseEftaId(key: string) {
  const m = key.match(/EFTA(\d+)\.pdf$/i);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}