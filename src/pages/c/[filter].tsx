// pages/community/[type].tsx
import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import { FacebookNavbar } from "@/components/layout/navbar";
import { NewsFeedSidebar } from "@/components/feed/sidebarLeft";
import { NewsFeedRightSidebar } from "@/components/feed/sidebarRight";
import { CreatePost } from "@/components/profile/createPost";
import { type CommunityPerson, CommunityPeopleGrid } from "@/components/feed/community";

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

function titleCase(s: string) {
  return s
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default function CommunityPage() {
  const router = useRouter();

  const type = typeof router.query.filter === "string" ? router.query.filter : "";
  
  const peopleRes = useJson<{ people: CommunityPerson[] }>(
    type ? `/api/people/c?community=${encodeURIComponent(type)}` : null
  );

  const title = type ? `${titleCase(type)} • Jacebook` : "Community • Jacebook";

  return (
    <div className="min-h-screen bg-background">
      <Head>
        <title>{title}</title>
        <meta
          name="description"
          content={type ? `Community page for ${type}` : "Community page"}
        />
      </Head>

      <FacebookNavbar />

      <div className="max-w-[1050px] mx-auto flex gap-3">
        <div className="hidden md:block">
          <NewsFeedSidebar />
        </div>

        <main className="flex-1 py-4 space-y-3 min-w-0 px-3 md:px-0">
          <CreatePost />

          {peopleRes.error ? (
            <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              Failed to load community: {peopleRes.error}
            </div>
          ) : (
            <CommunityPeopleGrid
              title={type ? titleCase(type) : "Community"}
              people={peopleRes.data?.people ?? []}
              loading={peopleRes.loading || !type}
            />
          )}
        </main>

        <div className="hidden lg:block">
          <NewsFeedRightSidebar />
        </div>
      </div>
    </div>
  );
}