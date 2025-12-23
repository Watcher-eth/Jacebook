// src/lib/appearances.ts
export type Appearance = { file: string; page: number; confidence?: number };

export function conf(a: Appearance) {
  return typeof a.confidence === "number" ? a.confidence : 0;
}

export function chooseBestPage(appearances: Appearance[]) {
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

export function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}