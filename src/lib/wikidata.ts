// src/lib/wikidata.ts
export type WikidataProfile = {
    qid: string;
    name: string;
    bio?: string;
  
    dob?: string;      // ISO YYYY-MM-DD (best-effort)
    age?: number;
  
    occupation?: string;
    relationship?: string; // e.g. "Married (spouse: ...)" or "Single/Unknown"
  };
  
  const WD_API = "https://www.wikidata.org/w/api.php";
  const WP_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";
  
  function clamp<T>(arr: T[], n: number) {
    return arr.length <= n ? arr : arr.slice(0, n);
  }
  
  function asText(x: any): string | undefined {
    if (typeof x === "string" && x.trim()) return x.trim();
    return undefined;
  }
  
  function wdUrl(params: Record<string, string>) {
    const u = new URL(WD_API);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    // origin=* helps in browsers; SSR doesn't need it, but harmless.
    u.searchParams.set("origin", "*");
    return u.toString();
  }
  
  async function fetchJson<T>(url: string): Promise<T> {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      // Next.js (pages router) SSR: this prevents caching surprises while iterating
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return r.json() as Promise<T>;
  }
  
  type WbSearchEntitiesResp = {
    search: Array<{
      id: string;          // Q...
      label?: string;
      description?: string;
      match?: any;
    }>;
  };
  
  async function wdSearchBestQid(name: string): Promise<{ qid: string; label?: string; description?: string } | null> {
    const url = wdUrl({
      action: "wbsearchentities",
      format: "json",
      language: "en",
      uselang: "en",
      type: "item",
      search: name,
      limit: "5",
    });
  
    const data = await fetchJson<WbSearchEntitiesResp>(url);
    const best = data.search?.[0];
    if (!best?.id) return null;
    return { qid: best.id, label: best.label, description: best.description };
  }
  
  // --- wbgetentities (claims) ---
  
  type WbGetEntitiesResp = {
    entities: Record<
      string,
      {
        id: string;
        labels?: Record<string, { value: string }>;
        descriptions?: Record<string, { value: string }>;
        claims?: Record<string, any[]>;
        sitelinks?: Record<string, { title: string }>;
      }
    >;
  };
  
  function pickEnLabel(e: any) {
    return e?.labels?.en?.value || e?.labels?.en?.value;
  }
  
  function pickEnDescription(e: any) {
    return e?.descriptions?.en?.value;
  }
  
  function firstClaim(claims: any[] | undefined) {
    return Array.isArray(claims) && claims.length ? claims[0] : null;
  }
  
  function allClaims(claims: any[] | undefined) {
    return Array.isArray(claims) ? claims : [];
  }
  
  // P569: time value looks like "+1955-01-01T00:00:00Z"
  function parseWdTimeValue(v: any): string | undefined {
    const t = v?.time;
    if (typeof t !== "string") return undefined;
    const m = t.match(/^[+-]?(\d{4,})-(\d{2})-(\d{2})T/);
    if (!m) return undefined;
    const year = m[1].padStart(4, "0");
    return `${year}-${m[2]}-${m[3]}`;
  }
  
  function calcAge(dobIso: string): number | undefined {
    const d = new Date(dobIso);
    if (Number.isNaN(d.getTime())) return undefined;
    const now = new Date();
    let age = now.getUTCFullYear() - d.getUTCFullYear();
    const m = now.getUTCMonth() - d.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
    return age;
  }
  
  async function wdLabelForQids(qids: string[]): Promise<Map<string, string>> {
    const uniq = Array.from(new Set(qids)).filter(Boolean);
    const out = new Map<string, string>();
    if (!uniq.length) return out;
  
    const url = wdUrl({
      action: "wbgetentities",
      format: "json",
      languages: "en",
      props: "labels",
      ids: uniq.join("|"),
    });
  
    const data = await fetchJson<WbGetEntitiesResp>(url);
    for (const [id, ent] of Object.entries(data.entities || {})) {
      const label = ent?.labels?.en?.value;
      if (label) out.set(id, label);
    }
    return out;
  }
  
  async function wikipediaSummary(title: string): Promise<string | undefined> {
    const url = `${WP_SUMMARY}/${encodeURIComponent(title)}`;
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!r.ok) return undefined;
      const j = (await r.json()) as any;
      return asText(j?.extract);
    } catch {
      return undefined;
    }
  }
  
  export async function fetchWikidataProfileByName(name: string): Promise<WikidataProfile | null> {
    const hit = await wdSearchBestQid(name);
    if (!hit) return null;
  
    const url = wdUrl({
      action: "wbgetentities",
      format: "json",
      ids: hit.qid,
      languages: "en",
      props: "labels|descriptions|claims|sitelinks",
    });
  
    const data = await fetchJson<WbGetEntitiesResp>(url);
    const ent = data.entities?.[hit.qid];
    if (!ent) return null;
  
    const label = pickEnLabel(ent) || hit.label || name;
    const desc = pickEnDescription(ent) || hit.description;
  
    // --- DOB (P569) ---
    const dobClaim = firstClaim(ent.claims?.P569);
    const dobIso = parseWdTimeValue(dobClaim?.mainsnak?.datavalue?.value);
    const age = dobIso ? calcAge(dobIso) : undefined;
  
    // --- Occupation (P106) ---
    const occClaims = allClaims(ent.claims?.P106);
    const occQids = clamp(
      occClaims
        .map((c) => c?.mainsnak?.datavalue?.value?.id)
        .filter((x: any) => typeof x === "string"),
      1
    );
  
    // --- Spouse (P26) ---
    const spouseClaims = allClaims(ent.claims?.P26);
    const spouseQids = clamp(
      spouseClaims
        .map((c) => c?.mainsnak?.datavalue?.value?.id)
        .filter((x: any) => typeof x === "string"),
      1
    );
  
    const labels = await wdLabelForQids([...occQids, ...spouseQids]);
  
    const occupation = occQids[0] ? labels.get(occQids[0]) : undefined;
  
    let relationship: string | undefined;
    if (spouseQids[0]) {
      relationship = `Married (spouse: ${labels.get(spouseQids[0]) ?? spouseQids[0]})`;
    } else {
      relationship = "Unknown";
    }
  
    // Prefer Wikipedia summary if available, else fall back to Wikidata description.
    const wikiTitle = ent.sitelinks?.enwiki?.title;
    const bio = (wikiTitle ? await wikipediaSummary(wikiTitle) : undefined) || desc;
  
    return {
      qid: hit.qid,
      name: label,
      bio,
      dob: dobIso,
      age,
      occupation,
      relationship,
    };
  }