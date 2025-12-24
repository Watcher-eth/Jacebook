import React from "react";
import { FacebookNavbar } from "@/components/layout/navbar";
import { NewsFeedSidebar } from "@/components/feed/sidebarLeft";
import { NewsFeedRightSidebar } from "@/components/feed/sidebarRight";
import { CreatePost } from "@/components/profile/createPost";
import { LikedByPerson, NewsFeedPost } from "@/components/feed/post";
import { useJson } from "@/components/hooks/useJson"

type WithPerson = { name: string; slug: string };

type FeedPost = {
  key: string;
  url: string;
  timestamp: string;
  content: string;
  author: string;
  authorSlug: string;
  authorAvatar: string;
  imageUrl?: string;
  hqImageUrl?: string;
  likedBy?: LikedByPerson[];
  withPeople?: WithPerson[]; 
};

export default function NewsFeedPage() {
  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [cursor, setCursor] = React.useState<string | null>("0");
  const [loadingMore, setLoadingMore] = React.useState(false);
  const loadRef = React.useRef<HTMLDivElement | null>(null);

  const first = useJson<{ posts: FeedPost[]; nextCursor: string | null }>(
    posts.length === 0 ? `/api/feed/posts?cursor=0&limit=12` : null
  );

  React.useEffect(() => {
    if (!first.data) return;
    setPosts(first.data.posts || []);
    setCursor(first.data.nextCursor);
  }, [first.data]);

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
          const r = await fetch(`/api/feed/posts?cursor=${encodeURIComponent(cursor)}&limit=12`, {
            headers: { Accept: "application/json" },
          });
          if (!r.ok) throw new Error(String(r.status));
          const j = (await r.json()) as { posts: FeedPost[]; nextCursor: string | null };

          setPosts((prev) => {
            const seen = new Set(prev.map((p) => `${p.authorSlug}::${p.key}`));
            const more = (j.posts || []).filter((p) => !seen.has(`${p.authorSlug}::${p.key}`));
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
  }, [cursor, loadingMore]);

  return (
    <div className="min-h-screen bg-background">
    <FacebookNavbar />

    <div className="max-w-[1050px] mx-auto flex gap-3">
      <div className="hidden md:block">
        <NewsFeedSidebar />
      </div>

      <main className="flex-1 py-4 space-y-3 min-w-0 px-3 md:px-0">
        <CreatePost />

        {posts.map((p, i) => (
          <div key={`${p.authorSlug}::${p.key}`}>
            <NewsFeedPost
              likedBy={p.likedBy ?? []}
              withPeople={p.withPeople ?? []}
              author={p.author}
              authorAvatar={p.authorAvatar || "/placeholder.svg"}
              timestamp={p.timestamp}
              content={p.content}
              imageUrl={p.imageUrl}
              hqImageUrl={p.hqImageUrl}
              priorityImage={i === 0}
            />
          </div>
        ))}

        <div ref={loadRef} className="h-10" />
        {loadingMore ? (
          <div className="text-center text-sm text-muted-foreground py-4">Loading more…</div>
        ) : null}
      </main>

      <div className="hidden lg:block">
        <NewsFeedRightSidebar />
      </div>
    </div>
  </div>
  );
}