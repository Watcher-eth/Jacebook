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

import { getCelebrityBySlug, getAllCelebrities, slugifyName } from "@/lib/people";
import {
  filesByKeys,
  fileUrl,
  parseEftaId,
  type WorkerFile,
  thumbnailKeyForPdf,
} from "@/lib/worker-client";

import { NewsFeedPost } from "@/components/feed/post";
import { buildFriendsForPerson, type FriendEdge } from "@/lib/friends-graph";
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
  withPeople?: WithPerson[];
};

type PageProps = {
  slug: string;
  name: string;
  count: number;
  years: string[];
  wikidata?: WikidataProfile | null;

  profileAvatarUrl: string;
  coverUrl: string;

  friends: FriendEdge[];

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

const friendsCache = new Map<string, CacheEntry<FriendEdge[]>>();
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

function buildPagePeopleIndex(args: {
  allCelebs: ReturnType<typeof getAllCelebrities>;
  keysSet: Set<string>;
}) {
  const { allCelebs, keysSet } = args;
  const byFile = new Map<string, Map<number, Map<string, number>>>();

  for (const c of allCelebs) {
    const slug = slugifyName(c.name);
    for (const a of (c.appearances as any as Appearance[]) || []) {
      if (!a?.file || !a?.page) continue;
      if (!keysSet.has(a.file)) continue;

      let pages = byFile.get(a.file);
      if (!pages) {
        pages = new Map();
        byFile.set(a.file, pages);
      }

      let people = pages.get(a.page);
      if (!people) {
        people = new Map();
        pages.set(a.page, people);
      }

      const prev = people.get(slug) ?? 0;
      const next = conf(a);
      if (next > prev) people.set(slug, next);
    }
  }

  return byFile;
}

function coPeopleForPost(args: {
  byFile: Map<string, Map<number, Map<string, number>>>;
  file: string;
  page: number;
  ownerSlug: string;
  slugToName: Map<string, string>;
  minConfOther: number;
  pageWindow: number;
  maxPeople: number;
}): WithPerson[] {
  const { byFile, file, page, ownerSlug, slugToName, minConfOther, pageWindow, maxPeople } = args;

  const pages = byFile.get(file);
  if (!pages) return [];

  const agg = new Map<string, number>();

  for (let q = page - pageWindow; q <= page + pageWindow; q++) {
    const people = pages.get(q);
    if (!people) continue;

    for (const [otherSlug, otherConf] of people.entries()) {
      if (otherSlug === ownerSlug) continue;
      if (otherConf < minConfOther) continue;
      const prev = agg.get(otherSlug) ?? 0;
      if (otherConf > prev) agg.set(otherSlug, otherConf);
    }
  }

  return Array.from(agg.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxPeople)
    .map(([s]) => ({ slug: s, name: slugToName.get(s) ?? s }));
}

const SSR_POST_LIMIT = 30; // lower = faster SSR + less image work
const MIN_CONF = 99.7;

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const slug = String(ctx.params?.slug || "");
  const celeb = getCelebrityBySlug(slug);

  if (!celeb) return { notFound: true };

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
        friends: [],
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

  // ---- Sort docs cheaply BEFORE hitting worker ----
  // Sorting by uploaded requires worker meta; EFTA id is a good proxy and free.
  const docsKeysSorted = [...keysAll].sort((a, b) => parseEftaId(b) - parseEftaId(a));

  // SSR only first window; fetch meta ONLY for those
  const ssrKeys = docsKeysSorted.slice(0, SSR_POST_LIMIT);

  const meta = await filesByKeys(ssrKeys, { ttlMs: 10 * 60_000 });
  const metaByKey = new Map<string, WorkerFile>();
  for (const m of meta) metaByKey.set(m.key, m);

  // years: for now only from SSR window (fast). You can lazy-load full years later.
  const yearSet = new Set<string>();
  for (const m of meta) {
    const y = yearFromIso(m.uploaded);
    if (y) yearSet.add(y);
  }
  const years = ["Recent", ...Array.from(yearSet).sort((a, b) => Number(b) - Number(a))];

  // ---- friends graph: memoize aggressively ----
  const friends = await (async () => {
    const cached = getCache(friendsCache, slug);
    if (cached) return cached;

    return once(`friends:${slug}`, async () => {
      const allCelebs = getAllCelebrities();
      const v = buildFriendsForPerson({
        ownerSlug: slug,
        allCelebs,
        minConf: MIN_CONF,
        manifest: null,
        minConfOwner: 99.3,
        minConfOther: 99.0,
        pageWindow: 1,
        minEdgeWeight: 1,
        limit: 48,
      });
      return setCache(friendsCache, slug, v, 30 * 60_000); // 30 min
    });
  })();

  // ---- "WITH people" index only for SSR keys ----
  const allCelebs = getAllCelebrities();
  const keysSet = new Set(ssrKeys);

  const slugToName = new Map<string, string>();
  for (const c of allCelebs) slugToName.set(slugifyName(c.name), c.name);

  const byFile = buildPagePeopleIndex({ allCelebs, keysSet });

  const WITH_MIN_CONF = 98.8;
  const WITH_PAGE_WINDOW = 1;

  const posts: PagePost[] = ssrKeys
    .map((key) => {
      const m = metaByKey.get(key);

      const appearancesInFile = hi.filter((a) => a.file === key);
      const previewPage = chooseBestPage(appearancesInFile);

      const pages = appearancesInFile.map((a) => a.page).sort((x, y) => x - y);
      const shown = pages.slice(0, 8);
      const pageHint = shown.length ? `Pages: ${shown.join(", ")}${pages.length > shown.length ? "…" : ""}` : "";

      const efta = key.match(/(EFTA\d+)\.pdf$/i)?.[1]?.toUpperCase() ?? key.split("/").pop() ?? key;

      const imageUrl = pageJpegUrlFast(key, previewPage);

      const withPeople = coPeopleForPost({
        byFile,
        file: key,
        page: previewPage,
        ownerSlug: slug,
        slugToName,
        minConfOther: WITH_MIN_CONF,
        pageWindow: WITH_PAGE_WINDOW,
        maxPeople: 6,
      });

      return {
        key,
        url: fileUrl(key),
        timestamp: m?.uploaded ? formatTimestamp(m.uploaded) : "Unknown date",
        authorAvatar: profileAvatarUrl,
        content: `${efta}${pageHint ? ` • ${pageHint}` : ""} • Page ${previewPage}`,
        imageUrl,
        withPeople,
      };
    })
    .reverse();

  const nextCursor = docsKeysSorted.length > SSR_POST_LIMIT ? String(SSR_POST_LIMIT) : null;

  // ---- Wikidata: memoize + tolerate failure ----
  const wikidata = await (async () => {
    const k = celeb.name;
    const cached = getCache(wikidataCache, k);
    if (cached !== null) return cached;

    return once(`wikidata:${k}`, async () => {
      const v = await fetchWikidataProfileByName(k).catch(() => null);
      return setCache(wikidataCache, k, v, 24 * 60_000); // 24 min
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
      friends,
      posts,
      nextCursor,
      wikidata,
    },
  };
};

export default function PersonPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { name, years, posts, count, profileAvatarUrl, coverUrl, friends } = props;
  const [tab, setTab] = React.useState<ProfileTab>("timeline");

  const photos = React.useMemo(() => {
    return posts
      .filter((p) => !!p.imageUrl)
      .map((p) => ({
        key: p.key,
        imageUrl: p.imageUrl!,
        href: p.url,
        label: p.content,
      }));
  }, [posts]);

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
            <FriendsSection friends={friends} />
          </aside>

          <main className="space-y-4 min-w-[30vw]">
            {tab === "timeline" && (
              <>
                <CreatePost />

                {posts.map((p) => (
                  <div key={p.key}>
                    <NewsFeedPost
                      author={name}
                      authorAvatar={p.authorAvatar}
                      timestamp={p.timestamp}
                      content={p.content}
                      imageUrl={p.imageUrl}
                      withPeople={p.withPeople}
                    />
                  </div>
                ))}

                {props.nextCursor ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Showing {posts.length} posts • load more coming next
                  </div>
                ) : null}
              </>
            )}

            {tab === "about" && (
              <div className="space-y-4">
                <AboutSection wikidata={props.wikidata!} />
              </div>
            )}

            {tab === "friends" && <FriendGrid friends={friends} />}

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