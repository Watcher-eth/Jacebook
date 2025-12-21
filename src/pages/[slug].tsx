// pages/people/[slug].tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import React from "react";

import { FacebookNavbar } from "@/components/layout/navbar";
import { BioSection } from "@/components/profile/bio";
import { CreatePost } from "@/components/profile/createPost";
import { FriendsSection } from "@/components/profile/friends";
import { ProfileHeader, ProfileTab } from "@/components/profile/header";
import { TimelineSection } from "@/components/profile/timeline";

import { getCelebrityBySlug } from "@/lib/people";
import {
  filesByKeys,
  fileUrl,
  parseEftaId,
  type WorkerFile,
  thumbnailKeyForPdf,
} from "@/lib/worker-client";

import { NewsFeedPost } from "@/components/feed/post";
import { fetchWikidataProfileByName, type WikidataProfile } from "@/lib/wikidata";
import { AboutSection } from "@/components/profile/aboutSection";
import { PhotoGrid } from "@/components/profile/photoGrid";
import { FriendGrid } from "@/components/profile/friendGrid";

type WithPerson = { name: string; slug: string };

type PagePost = {
  key: string;
  url: string;
  timestamp: string;
  content: string;
  authorAvatar: string;
  imageUrl?: string;
  withPeople?: WithPerson[]; // hydrated client-side
};

type FriendEdge = {
  slug: string;
  name: string;
  weight: number;
  avatarUrl?: string;
};

type PageProps = {
  slug: string;
  name: string;
  count: number;
  years: string[];
  wikidata?: WikidataProfile | null;

  profileAvatarUrl: string;
  coverUrl: string;

  // friends moved off SSR
  posts: PagePost[];
  nextCursor: string | null;
};

type Appearance = { file: string; page: number; confidence?: number };

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

const wikidataCache = new Map<string, CacheEntry<WikidataProfile | null>>();
const inflight = new Map<string, Promise<any>>();

async function once<T>(key: string, fn: () => Promise<T>) {
  const p = inflight.get(key);
  if (p) return p as Promise<T>;
  const q = fn().finally(() => inflight.delete(key));
  inflight.set(key, q);
  return q;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function yearFromIso(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return String(d.getFullYear());
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function conf(a: Appearance) {
  return typeof a.confidence === "number" ? a.confidence : 0;
}

function pickTopAppearances(appearances: Appearance[], minConf: number, n: number) {
  const hi = (appearances || []).filter((a) => a?.file && a?.page && conf(a) >= minConf);
  hi.sort((a, b) => {
    const dc = conf(b) - conf(a);
    if (dc !== 0) return dc;
    return (a.page ?? 999999) - (b.page ?? 999999);
  });

  const out: Appearance[] = [];
  const seen = new Set<string>();
  for (const a of hi) {
    const k = `${a.file}::${a.page}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
    if (out.length >= n) break;
  }
  return out;
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

const SSR_POST_LIMIT = 30;
const MIN_CONF = 99.7;

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const slug = String(ctx.params?.slug || "");
  const celeb = getCelebrityBySlug(slug);

  if (!celeb) return { notFound: true };

  // Let CDN cache the HTML.
  ctx.res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");

  const hi = (celeb.appearances as Appearance[]).filter((a) => (a.confidence ?? 0) >= MIN_CONF);
  const keysAll = unique(hi.map((a) => a.file));

  if (!keysAll.length) {
    return {
      props: {
        slug,
        name: celeb.name,
        count: celeb.count,
        years: ["Recent"],
        profileAvatarUrl: "",
        coverUrl: "",
        posts: [],
        nextCursor: null,
        wikidata: null,
      },
    };
  }

  // ---- Avatar/Cover (no worker calls) ----
  const top2 = pickTopAppearances(celeb.appearances as Appearance[], MIN_CONF, 2);
  const pfpA = top2[0] ?? null;
  const coverA = top2[1] ?? top2[0] ?? null;

  const fallbackThumb = fileUrl(thumbnailKeyForPdf(keysAll[0]!));
  const profileAvatarUrl = pfpA ? pageJpegUrlFast(pfpA.file, pfpA.page) : fallbackThumb;
  const coverUrl = coverA ? pageJpegUrlFast(coverA.file, coverA.page) : profileAvatarUrl;

  // Sort cheap (proxy) before hitting worker
  const docsKeysSorted = [...keysAll].sort((a, b) => parseEftaId(b) - parseEftaId(a));
  const ssrKeys = docsKeysSorted.slice(0, SSR_POST_LIMIT);

  // Only meta for SSR window
  const meta = await filesByKeys(ssrKeys, { ttlMs: 10 * 60_000 });
  const metaByKey = new Map<string, WorkerFile>();
  for (const m of meta) metaByKey.set(m.key, m);

  // years only from SSR window (fast)
  const yearSet = new Set<string>();
  for (const m of meta) {
    const y = yearFromIso(m.uploaded);
    if (y) yearSet.add(y);
  }
  const years = ["Recent", ...Array.from(yearSet).sort((a, b) => Number(b) - Number(a))];

  const posts: PagePost[] = ssrKeys
    .map((key) => {
      const m = metaByKey.get(key);

      const appearancesInFile = hi.filter((a) => a.file === key);
      const previewPage = chooseBestPage(appearancesInFile);

      const pages = appearancesInFile.map((a) => a.page).sort((x, y) => x - y);
      const shown = pages.slice(0, 8);
      const pageHint = shown.length ? `Pages: ${shown.join(", ")}${pages.length > shown.length ? "…" : ""}` : "";

      const efta = key.match(/(EFTA\d+)\.pdf$/i)?.[1]?.toUpperCase() ?? key.split("/").pop() ?? key;

      return {
        key,
        url: fileUrl(key),
        timestamp: m?.uploaded ? formatTimestamp(m.uploaded) : "Unknown date",
        authorAvatar: profileAvatarUrl,
        content: `${efta}${pageHint ? ` • ${pageHint}` : ""} • Page ${previewPage}`,
        imageUrl: pageJpegUrlFast(key, previewPage),
        // withPeople hydrated later
      };
    })
    .reverse();

  const nextCursor = docsKeysSorted.length > SSR_POST_LIMIT ? String(SSR_POST_LIMIT) : null;

  // Wikidata: keep SSR for now (cached). If still slow, move off SSR later too.
  const wikidata = await (async () => {
    const k = celeb.name;
    const cached = getCache(wikidataCache, k);
    if (cached !== null) return cached;

    return once(`wikidata:${k}`, async () => {
      const v = await fetchWikidataProfileByName(k).catch(() => null);
      return setCache(wikidataCache, k, v, 24 * 60_000);
    });
  })();

  return {
    props: {
      slug,
      name: celeb.name,
      count: celeb.count,
      years,
      profileAvatarUrl,
      coverUrl,
      posts,
      nextCursor,
      wikidata,
    },
  };
};

function useJson<T>(url: string | null) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(!!url);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url, { headers: { Accept: "application/json" } })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

export default function PersonPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { name, years, posts, count, profileAvatarUrl, coverUrl, slug } = props;
  const [tab, setTab] = React.useState<ProfileTab>("timeline");

  // Friends: fetched client-side (server cached)
  const friendsRes = useJson<{ friends: FriendEdge[] }>(`/api/people/friends?slug=${encodeURIComponent(slug)}`);

  // WITH people: fetched client-side in one batch for SSR posts
  const postKeys = React.useMemo(() => posts.map((p) => p.key), [posts]);
  const withRes = useJson<{ withByKey: Record<string, WithPerson[]> }>(
    postKeys.length ? `/api/people/with-people?slug=${encodeURIComponent(slug)}&keys=${encodeURIComponent(postKeys.join(","))}` : null
  );

  const postsHydrated = React.useMemo(() => {
    const map = withRes.data?.withByKey;
    if (!map) return posts;
    return posts.map((p) => ({ ...p, withPeople: map[p.key] || p.withPeople }));
  }, [posts, withRes.data]);

  const photos = React.useMemo(() => {
    return postsHydrated
      .filter((p) => !!p.imageUrl)
      .map((p) => ({
        key: p.key,
        imageUrl: p.imageUrl!,
        href: p.url,
        label: p.content,
      }));
  }, [postsHydrated]);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Head>
        <title>{`${name} • Jacebook`}</title>
        <meta name="description" content={`Documents where ${name} appears (${count} total appearances)`} />
      </Head>

      <FacebookNavbar />

      <ProfileHeader
        name={name}
        verified={true}
        coverUrl={coverUrl}
        avatarUrl={profileAvatarUrl}
        activeTab={tab}
        onTabChange={setTab}
      />

      <div className="max-w-[1050px] mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr_250px] gap-4">
          <aside className="space-y-4">
            <BioSection wikidata={props.wikidata!} />

            <FriendsSection
              friends={friendsRes.data?.friends ?? []}
              loading={friendsRes.loading}
            />
          </aside>

          <main className="space-y-4 min-w-[30vw]">
            {tab === "timeline" && (
              <>
                <CreatePost />

                {postsHydrated.map((p, i) => (
                  <div key={p.key}>
                    <NewsFeedPost
                      author={name}
                      authorAvatar={p.authorAvatar}
                      timestamp={p.timestamp}
                      content={p.content}
                      imageUrl={p.imageUrl}
                      withPeople={p.withPeople}
                      priorityImage={i === 0}
                    />
                  </div>
                ))}

                {props.nextCursor ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Showing {postsHydrated.length} posts • load more coming next
                  </div>
                ) : null}
              </>
            )}

            {tab === "about" && (
              <div className="space-y-4">
                <AboutSection wikidata={props.wikidata!} />
              </div>
            )}

            {tab === "friends" && (
              <FriendGrid friends={friendsRes.data?.friends ?? []} />
            )}

            {tab === "photos" && <PhotoGrid photos={photos} />}
          </main>

          <aside className="hidden lg:block">
            <TimelineSection years={years} />
          </aside>
        </div>
      </div>
    </div>
  );
}