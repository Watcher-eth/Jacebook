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
import { fileUrl, parseEftaId, thumbnailKeyForPdf } from "@/lib/worker-client";

import { LikedByPerson, NewsFeedPost } from "@/components/feed/post";
import { AboutSection } from "@/components/profile/aboutSection";
import { PhotoGrid } from "@/components/profile/photoGrid";
import { FriendGrid } from "@/components/profile/friendGrid";
import type { WikidataProfile } from "@/lib/wikidata";

type WithPerson = { name: string; slug: string };

type PagePost = {
    key: string;
    url: string;
    timestamp: string;
    content: string;
    authorAvatar: string;
    imageUrl?: string;    
    hqImageUrl?: string; 
    withPeople?: WithPerson[];
    likedBy?: LikedByPerson[];
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

  // timestamps/years removed from SSR
  years: string[];

  profileAvatarUrl: string;
  coverUrl: string;

  posts: PagePost[];
  nextCursor: string | null;

  wikidataName: string;
};

type Appearance = { file: string; page: number; confidence?: number };

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

const MIN_CONF = 99.7;
// SSR fewer posts = faster TTFB + faster first paint (big deal)
const SSR_POST_LIMIT = 12;
// if they all have same date anyway
const FIXED_TIMESTAMP = "Dec 19, 2025";
const FIXED_YEARS = ["Recent"];

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

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const slug = String(ctx.params?.slug || "");
  const celeb = getCelebrityBySlug(slug);
  if (!celeb) return { notFound: true };

  // Let CDN cache HTML
  ctx.res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");

  const hi = (celeb.appearances as Appearance[]).filter((a) => (a.confidence ?? 0) >= MIN_CONF);

  // ✅ index once (kills N*M scans)
  const hiByFile = new Map<string, Appearance[]>();
  for (const a of hi) {
    const arr = hiByFile.get(a.file);
    if (arr) arr.push(a);
    else hiByFile.set(a.file, [a]);
  }

  const keysAll = unique(hi.map((a) => a.file));
  if (!keysAll.length) {
    return {
      props: {
        slug,
        name: celeb.name,
        count: celeb.count,
        years: FIXED_YEARS,
        profileAvatarUrl: "",
        coverUrl: "",
        posts: [],
        nextCursor: null,
        wikidataName: celeb.name,
      },
    };
  }

  // Avatar/Cover: no worker calls
  const top2 = pickTopAppearances(celeb.appearances as Appearance[], MIN_CONF, 2);
  const pfpA = top2[0] ?? null;
  const coverA = top2[1] ?? top2[0] ?? null;

  const fallbackThumb = fileUrl(thumbnailKeyForPdf(keysAll[0]!));
  const profileAvatarUrl = pfpA ? pageJpegUrlFast(pfpA.file, pfpA.page) : fallbackThumb;
  const coverUrl = coverA ? pageJpegUrlFast(coverA.file, coverA.page) : profileAvatarUrl;

  // Cheap sort proxy (no filesByKeys)
  const docsKeysSorted = [...keysAll].sort((a, b) => parseEftaId(b) - parseEftaId(a));
  const ssrKeys = docsKeysSorted.slice(0, SSR_POST_LIMIT);

  const posts: PagePost[] = ssrKeys
    .map((key) => {
      const appearancesInFile = hiByFile.get(key) ?? [];
      const previewPage = chooseBestPage(appearancesInFile);

      const pages = appearancesInFile.map((a) => a.page).sort((x, y) => x - y);
      const shown = pages.slice(0, 8);
      const pageHint = shown.length ? `Pages: ${shown.join(", ")}${pages.length > shown.length ? "…" : ""}` : "";

      const efta = key.match(/(EFTA\d+)\.pdf$/i)?.[1]?.toUpperCase() ?? key.split("/").pop() ?? key;

      const thumbUrl = fileUrl(thumbnailKeyForPdf(key));
const hqUrl = pageJpegUrlFast(key, previewPage);

      return {
        key,
        url: fileUrl(key),
        timestamp: FIXED_TIMESTAMP,
        authorAvatar: profileAvatarUrl,
        content: `${efta}${pageHint ? ` • ${pageHint}` : ""} • Page ${previewPage}`,
        imageUrl: thumbUrl,      
        hqImageUrl: hqUrl,   

      
      };
    })
    .reverse();

  const nextCursor = docsKeysSorted.length > SSR_POST_LIMIT ? String(SSR_POST_LIMIT) : null;

  return {
    props: {
      slug,
      name: celeb.name,
      count: celeb.count,
      years: FIXED_YEARS,
      profileAvatarUrl,
      coverUrl,
      posts,
      nextCursor,
      wikidataName: celeb.name,
    },
  };
};

export default function PersonPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { name, years, posts, count, profileAvatarUrl, coverUrl, slug, wikidataName } = props;
  const [tab, setTab] = React.useState<ProfileTab>("timeline");
  const [feedPosts, setFeedPosts] = React.useState<PagePost[]>(props.posts);
  const [cursor, setCursor] = React.useState<string | null>(props.nextCursor);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const loadRef = React.useRef<HTMLDivElement | null>(null);
  
  // Friends: client-side (server cached)
  const friendsRes = useJson<{ friends: FriendEdge[] }>(
    `/api/people/friends?slug=${encodeURIComponent(slug)}`
  );

  // WITH people: client-side batch (server cached)
  const postKeys = React.useMemo(() => feedPosts.map((p) => p.key), [feedPosts]);
  const withRes = useJson<{ withByKey: Record<string, WithPerson[]> }>(
    postKeys.length
      ? `/api/people/with-people?slug=${encodeURIComponent(slug)}&keys=${encodeURIComponent(postKeys.join(","))}`
      : null
  );

  // Wikidata: off SSR (server cached)
  const wdRes = useJson<{ wikidata: WikidataProfile | null }>(
    `/api/people/wikidata?name=${encodeURIComponent(wikidataName)}`
  );

  React.useEffect(() => {
    setFeedPosts(props.posts);
    setCursor(props.nextCursor);
  }, [props.posts, props.nextCursor, slug]);
  
  React.useEffect(() => {
    const el = loadRef.current;
    if (!el || !cursor || loadingMore) return;
  
    const io = new IntersectionObserver(
      async (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
        io.disconnect();
  
        setLoadingMore(true);
        try {
          const r = await fetch(
            `/api/people/posts?slug=${encodeURIComponent(slug)}&cursor=${encodeURIComponent(cursor)}&limit=12`,
            { headers: { Accept: "application/json" } }
          );
          if (!r.ok) throw new Error(String(r.status));
          const j = (await r.json()) as { posts: PagePost[]; nextCursor: string | null };
  
          setFeedPosts((prev) => {
            const seen = new Set(prev.map((p) => p.key));
            const more = (j.posts || []).filter((p) => !seen.has(p.key));
            return [...prev, ...more];
          });
          setCursor(j.nextCursor);
        } finally {
          setLoadingMore(false);
        }
      },
      { root: null, rootMargin: "1200px 0px", threshold: 0.01 }
    );
  
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, slug, loadingMore]);


const postsHydrated = React.useMemo(() => {
  const map = withRes.data?.withByKey;
  if (!map) return feedPosts;
  return feedPosts.map((p) => ({ ...p, likedBy: p.likedBy, withPeople: map[p.key] || p.withPeople }));
}, [feedPosts, withRes.data]);

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
 
      <FacebookNavbar />

      <ProfileHeader
        name={name}
        verified={true}
        coverUrl={coverUrl}
        avatarUrl={wdRes?.data?.wikidata?.imageUrl ?? profileAvatarUrl}
        activeTab={tab}
        onTabChange={setTab}
        friendsCount={friendsRes.data?.friends?.length ?? 0}
      />
      <div className="max-w-[1050px] mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr_250px] gap-4">
          {/* LEFT SIDEBAR:
              - Desktop: always show (lg+)
              - Mobile: only show on timeline tab
          */}
          <aside className={tab === "timeline" ? "space-y-4" : "hidden lg:block space-y-4"}>
            <BioSection wikidata={wdRes.data?.wikidata ?? null} loading={wdRes.loading} />
            <FriendsSection
              friends={friendsRes.data?.friends ?? []}
              loading={friendsRes.loading}
              name={slug}
            />
          </aside>

          <main className="space-y-4 min-w-0">
            {tab === "timeline" && (
              <>
                {/* CreatePost only on timeline (mobile + desktop) */}
                {name === "Jeffrey Epstein" ? <CreatePost /> : null}

                {postsHydrated?.length > 0 ? (
                  postsHydrated.map((p, i) => (
                    <div key={p.key}>
                      <NewsFeedPost
                        likedBy={p.likedBy ?? []}
                        author={name}
                        authorAvatar={wdRes.data?.wikidata?.imageUrl || props.profileAvatarUrl}
                        timestamp={p.timestamp}
                        content={p.content}
                        imageUrl={p.imageUrl}
                        hqImageUrl={p.hqImageUrl}
                        withPeople={p.withPeople}
                        priorityImage={i === 0}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center text-lg text-muted-foreground py-4">
                    No posts found
                  </div>
                )}

                <div ref={loadRef} className="h-10" />

                {loadingMore ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Loading more…
                  </div>
                ) : null}

                {props.nextCursor ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Showing {postsHydrated.length} posts • load more coming next
                  </div>
                ) : null}
              </>
            )}

            {tab === "about" && (
              <div className="space-y-4">
                <AboutSection wikidata={wdRes.data?.wikidata ?? null} loading={wdRes.loading} />
              </div>
            )}

            {tab === "friends" && <FriendGrid friends={friendsRes.data?.friends ?? []} />}
            {tab === "photos" && <PhotoGrid photos={photos} />}
          </main>

          {/* RIGHT SIDEBAR stays desktop-only */}
          <aside className="hidden lg:block">
            <TimelineSection years={years} />
          </aside>
        </div>
      </div>
    </div>
  );
}