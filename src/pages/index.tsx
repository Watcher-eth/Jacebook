import React from "react";
import { FacebookNavbar } from "@/components/layout/navbar";
import { NewsFeedSidebar } from "@/components/feed/sidebarLeft";
import { NewsFeedRightSidebar } from "@/components/feed/sidebarRight";
import { CreatePost } from "@/components/profile/createPost";
import { LikedByPerson, NewsFeedPost } from "@/components/feed/post";

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
      .then((j) => !cancelled && setData(j))
      .catch((e) => !cancelled && setError(e?.message ?? "error"))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

export default function NewsFeedPage() {
  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [cursor, setCursor] = React.useState<string | null>("0");
  const [loadingMore, setLoadingMore] = React.useState(false);
  const loadRef = React.useRef<HTMLDivElement | null>(null);

  // first fetch
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
        <NewsFeedSidebar />

        <main className="flex-1 py-4 space-y-3">
          <CreatePost />

          {posts.map((p, i) => (
            <div key={`${p.authorSlug}::${p.key}`}>
              <NewsFeedPost
                likedBy={p.likedBy ?? []}
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
          {loadingMore ? <div className="text-center text-sm text-muted-foreground py-4">Loading more…</div> : null}
        </main>

        <NewsFeedRightSidebar />
      </div>
    </div>
  );
}