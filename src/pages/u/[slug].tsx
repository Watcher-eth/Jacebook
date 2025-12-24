// pages/people/[slug].tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import React from "react";

import { FacebookNavbar } from "@/components/layout/navbar";
import { BioSection } from "@/components/profile/bio";
import { CreatePost } from "@/components/profile/createPost";
import { FriendsSection } from "@/components/profile/friends";
import { ProfileHeader, ProfileTab } from "@/components/profile/header";
import { TimelineSection } from "@/components/profile/timeline";

import { getPersonById, getTopPhotosForPerson, getPostsForPerson } from "@/lib/people";
import { photoFullUrl, photoThumbUrl } from "@/lib/photos-urls";

import { LikedByPerson, NewsFeedPost } from "@/components/feed/post";
import { AboutSection } from "@/components/profile/aboutSection";
import { PhotoGrid } from "@/components/profile/photoGrid";
import { FriendGrid } from "@/components/profile/friendGrid";
import type { WikidataProfile } from "@/lib/wikidata";
import { useJson } from "@/components/hooks/useJson"
import { getAvatarPhotoIdMap } from "@/lib/avatars"

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

  years: string[];

  profileAvatarUrl: string;
  coverUrl: string;

  posts: PagePost[];
  nextCursor: string | null;

  wikidataName: string;
};

const SSR_POST_LIMIT = 12;


export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const slug = String(ctx.params?.slug || "").trim();
  if (!slug) return { notFound: true };

  ctx.res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");

  const person = await getPersonById(slug);
  if (!person) return { notFound: true };

  const avatarMap = await getAvatarPhotoIdMap([person.id]);
  const avatarPhotoId = avatarMap.get(person.id) ?? null;
  
  const profileAvatarUrl = avatarPhotoId ? photoThumbUrl(avatarPhotoId, 256) : "";
  
  // cover can still come from top photos (fine)
  const top2 = await getTopPhotosForPerson({ personId: person.id, limit: 2, minConf: 98 });
  const cover = top2[1]?.id ?? top2[0]?.id ?? null;
  const coverUrl = cover ? photoThumbUrl(cover, 1024) : profileAvatarUrl;

  const { rows, nextCursor } = await getPostsForPerson({
    personId: person.id,
    cursor: null,
    limit: SSR_POST_LIMIT,
    minConf: 98,
  });

  const posts: PagePost[] = rows.map((p) => ({
    key: p.id,
    url: photoFullUrl(p.id),
    timestamp: p.created_at ? new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
    authorAvatar: profileAvatarUrl,
    content: [p.source, p.release_batch, p.original_filename || p.id].filter(Boolean).join(" • "),
    imageUrl: photoThumbUrl(p.id, 512),
    hqImageUrl: photoFullUrl(p.id),
  }));

  return {
    props: {
      slug,
      name: person.name ?? slug,       // or `Person ${anon_id}` if you prefer
      count: 0,                         // optional: you can compute photo_count similarly
      years: ["Recent"],
      profileAvatarUrl,
      coverUrl,
      posts,
      nextCursor,
      wikidataName: person.name ?? slug,
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
  
  const friendsRes = useJson<{ friends: FriendEdge[] }>(
    `/api/people/friends?slug=${encodeURIComponent(slug)}`
  );

  const postKeys = React.useMemo(() => feedPosts.map((p) => p.key), [feedPosts]);
  const withRes = useJson<{ withByKey: Record<string, WithPerson[]> }>(
    postKeys.length
      ? `/api/people/withPeople?slug=${encodeURIComponent(slug)}&keys=${encodeURIComponent(postKeys.join(","))}`
      : null
  );

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
        avatarUrl={profileAvatarUrl}
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
              onShowAll={() => setTab("friends")}
            />
          </aside>

          <main className="space-y-4 min-w-xl">
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
                        authorAvatar={profileAvatarUrl}
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

          <aside className="hidden lg:block">
            <TimelineSection years={years} />
          </aside>
        </div>
      </div>
    </div>
  );
}