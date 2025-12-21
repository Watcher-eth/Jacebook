// src/lib/wikidata.ts
export type WikidataProfile = {
    qid: string;
    name: string;
  
    bio?: string;
  
    dob?: string; // YYYY-MM-DD
    age?: number;
  
    occupations?: string[]; // multiple
    nationality?: string;
    gender?: string;
  
    // relationship summary (best-effort, tries to avoid stale spouse data)
    relationship?: string;
  
    // public-facing "profile-ish" extras
    imageUrl?: string; // commons -> direct file url
    officialWebsite?: string;
  
    socials?: Partial<{
      twitter: string; // @handle or url
      instagram: string;
      tiktok: string;
      youtube: string; // channel id or url
      facebook: string;
      imdb: string;
      wikidata: string; // QID link
      wikipedia: string; // page link if found
    }>;
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
    u.searchParams.set("origin", "*");
    return u.toString();
  }
  
  async function fetchJson<T>(url: string): Promise<T> {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return r.json() as Promise<T>;
  }
  
  type WbSearchEntitiesResp = {
    search: Array<{ id: string; label?: string; description?: string }>;
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
  
  type WbGetEntitiesResp = {
    entities: Record<
      string,
      {
        id: string;
        labels?: Record<string, { value: string }>;
        descriptions?: Record<string, { value: string }>;
        claims?: Record<string, any[]>;
        sitelinks?: Record<string, { title: string; url?: string }>;
      }
    >;
  };
  
  function pickEnLabel(e: any) {
    return e?.labels?.en?.value;
  }
  function pickEnDescription(e: any) {
    return e?.descriptions?.en?.value;
  }
  
  function allClaims(claims: any[] | undefined) {
    return Array.isArray(claims) ? claims : [];
  }
  
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
  
  async function wikipediaSummary(title: string): Promise<{ extract?: string; pageUrl?: string } | null> {
    const url = `${WP_SUMMARY}/${encodeURIComponent(title)}`;
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) return null;
      const j = (await r.json()) as any;
      return {
        extract: asText(j?.extract),
        pageUrl: asText(j?.content_urls?.desktop?.page) || asText(j?.content_urls?.mobile?.page),
      };
    } catch {
      return null;
    }
  }
  
  function commonsFileToUrl(file: string): string | undefined {
    const f = asText(file);
    if (!f) return undefined;
    // Basic direct file URL; good enough for avatars. (Commons also has special thumbnail APIs.)
    const name = f.replace(/^File:/i, "").replace(/\s+/g, "_");
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}`;
  }
  
  function claimString(claims: any[] | undefined): string | undefined {
    const c = allClaims(claims)[0];
    const v = c?.mainsnak?.datavalue?.value;
    if (typeof v === "string") return v;
    return undefined;
  }
  
  function claimEntityId(c: any): string | undefined {
    const id = c?.mainsnak?.datavalue?.value?.id;
    return typeof id === "string" ? id : undefined;
  }
  
  function claimQualifierTime(c: any, pid: string): string | undefined {
    const q = c?.qualifiers?.[pid];
    const first = Array.isArray(q) ? q[0] : null;
    const t = first?.datavalue?.value;
    return parseWdTimeValue(t);
  }
  
  function pickMostRelevantRelationship(args: {
    spouseClaims: any[];
    partnerClaims: any[];
  }): { kind: "spouse" | "partner"; qid: string; start?: string; end?: string } | null {
    // Prefer entries with no end date (ongoing) and most recent start date.
    function rank(c: any) {
      const start = claimQualifierTime(c, "P580"); // start time
      const end = claimQualifierTime(c, "P582"); // end time
      const ongoing = end ? 0 : 1;
      // sort by ongoing desc, then start desc (lex works on YYYY-MM-DD)
      return { ongoing, start: start || "0000-00-00", end };
    }
  
    const spouse = allClaims(args.spouseClaims)
      .map((c) => {
        const qid = claimEntityId(c);
        if (!qid) return null;
        const r = rank(c);
        return { kind: "spouse" as const, qid, start: r.start, end: r.end, ongoing: r.ongoing };
      })
      .filter(Boolean) as any[];
  
    const partner = allClaims(args.partnerClaims)
      .map((c) => {
        const qid = claimEntityId(c);
        if (!qid) return null;
        const r = rank(c);
        return { kind: "partner" as const, qid, start: r.start, end: r.end, ongoing: r.ongoing };
      })
      .filter(Boolean) as any[];
  
    const all = [...spouse, ...partner];
    if (!all.length) return null;
  
    all.sort((a, b) => {
      if (a.ongoing !== b.ongoing) return b.ongoing - a.ongoing;
      if (a.start !== b.start) return String(b.start).localeCompare(String(a.start));
      return a.kind === "spouse" ? -1 : 1;
    });
  
    const best = all[0]!;
    return { kind: best.kind, qid: best.qid, start: best.start, end: best.end };
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
  
    // core IDs/links
    const wikiTitle = ent.sitelinks?.enwiki?.title;
    const wikidataLink = `https://www.wikidata.org/wiki/${hit.qid}`;
  
    // DOB (P569)
    const dobClaim = allClaims(ent.claims?.P569)[0];
    const dobIso = parseWdTimeValue(dobClaim?.mainsnak?.datavalue?.value);
    const age = dobIso ? calcAge(dobIso) : undefined;
  
    // Occupation (P106) - allow multiple, not just 1
    const occClaims = allClaims(ent.claims?.P106);
    const occQids = clamp(
      occClaims.map(claimEntityId).filter((x): x is string => !!x),
      4
    );
  
    // Nationality (P27)
    const natQid = claimEntityId(allClaims(ent.claims?.P27)[0]);
  
    // Gender (P21)
    const genderQid = claimEntityId(allClaims(ent.claims?.P21)[0]);
  
    // Relationship: spouse (P26), partner (P451)
    const spouseClaims = allClaims(ent.claims?.P26);
    const partnerClaims = allClaims(ent.claims?.P451);
    const relBest = pickMostRelevantRelationship({ spouseClaims, partnerClaims });
  
    const relQids = [
      ...occQids,
      ...(natQid ? [natQid] : []),
      ...(genderQid ? [genderQid] : []),
      ...(relBest?.qid ? [relBest.qid] : []),
    ];
  
    const labels = await wdLabelForQids(relQids);
  
    const occupations = occQids.map((q) => labels.get(q) || q).filter(Boolean);
  
    const nationality = natQid ? labels.get(natQid) || natQid : undefined;
    const gender = genderQid ? labels.get(genderQid) || genderQid : undefined;
  
    let relationship: string | undefined;
    if (relBest?.qid) {
      const who = labels.get(relBest.qid) || relBest.qid;
      const range =
        relBest.start && relBest.start !== "0000-00-00"
          ? relBest.end && relBest.end !== "0000-00-00"
            ? ` (${relBest.start}–${relBest.end})`
            : ` (since ${relBest.start})`
          : "";
      relationship = relBest.kind === "spouse" ? `Married (spouse: ${who})${range}` : `Partner: ${who}${range}`;
    } else {
      relationship = "Unknown";
    }
  
    // Image (P18) commons filename
    const imageFile = claimString(ent.claims?.P18);
    const imageUrl = imageFile ? commonsFileToUrl(imageFile) : undefined;
  
    // Official website (P856)
    const officialWebsite = claimString(ent.claims?.P856);
  
    // Socials / IDs
    const twitter = claimString(ent.claims?.P2002);   // Twitter username
    const instagram = claimString(ent.claims?.P2003); // Instagram username
    const tiktok = claimString(ent.claims?.P7085);    // TikTok username
    const youtube = claimString(ent.claims?.P2397);   // YouTube channel ID
    const facebook = claimString(ent.claims?.P2013);  // Facebook username
    const imdb = claimString(ent.claims?.P345);       // IMDb ID
  
    const socials: WikidataProfile["socials"] = {
      wikidata: wikidataLink,
      ...(wikiTitle ? { wikipedia: undefined } : null),
      ...(twitter ? { twitter: twitter.startsWith("@") ? twitter : `@${twitter}` } : null),
      ...(instagram ? { instagram: instagram.startsWith("@") ? instagram : `@${instagram}` } : null),
      ...(tiktok ? { tiktok: tiktok.startsWith("@") ? tiktok : `@${tiktok}` } : null),
      ...(youtube ? { youtube } : null),
      ...(facebook ? { facebook } : null),
      ...(imdb ? { imdb: `https://www.imdb.com/name/${imdb}/` } : null),
    };
  
    // Wikipedia extract is usually better bio; also gives us a canonical page URL
    const wp = wikiTitle ? await wikipediaSummary(wikiTitle) : null;
    if (wp?.pageUrl) socials.wikipedia = wp.pageUrl;
  
    const bio = wp?.extract || desc;
  
    return {
      qid: hit.qid,
      name: label,
      bio,
      dob: dobIso,
      age,
      occupations: occupations.length ? occupations : undefined,
      nationality,
      gender,
      relationship,
      imageUrl,
      officialWebsite,
      socials,
    };
  }