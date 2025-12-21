// pages/people/[slug].tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";

import { FacebookNavbar } from "@/components/layout/navbar";
import { BioSection } from "@/components/profile/bio";
import { CreatePost } from "@/components/profile/createPost";
import { FriendsSection } from "@/components/profile/friends";
import { ProfileHeader } from "@/components/profile/header";
import { TimelineSection } from "@/components/profile/timeline";

import { getCelebrityBySlug } from "@/lib/people";
import {
  filesByKeys,
  fileUrl,
  parseEftaId,
  type WorkerFile,
  fetchPdfManifest,
  thumbnailUrlForPdf,
  thumbnailKeyForPdf,
} from "@/lib/worker-client";

import { NewsFeedPost } from "@/components/feed/post";

type PageProps = {
  slug: string;
  name: string;
  count: number;
  years: string[];
  profileAvatarUrl: string;
  coverUrl: string;
  posts: Array<{
    key: string;
    url: string;
    timestamp: string;
    content: string;
    authorAvatar: string;
    imageUrl?: string;
  }>;
  debug?: {
    workerUrl: string;
    sample: Array<{ key: string; imageUrl?: string; profileAvatarUrl: string; coverUrl: string }>;
  };
};

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

function absWorkerUrl(workerUrl: string, u?: string | null) {
    if (!u) return undefined;
    const s = String(u).trim();
    if (!s) return undefined;
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    // handle "thumbnails/..." or "/thumbnails/..."
    if (s.startsWith("/")) return `${workerUrl}${s}`;
    return `${workerUrl}/${s}`;
  }

  type PdfManifest = Record<string, { thumbnailKey?: string; thumbKey?: string; thumb?: string; thumbnail?: string } | string>;

function thumbKeyFromManifest(manifest: PdfManifest | any, pdfKey: string) {
  if (!manifest) return null;

  // common shapes: { [pdfKey]: "thumbnails/..." } OR { [pdfKey]: { thumbnailKey: "..." } }
  const v = manifest[pdfKey];
  if (!v) return null;

  if (typeof v === "string") return v;
  if (typeof v === "object") return v.thumbnailKey || v.thumbKey || v.thumb || v.thumbnail || null;

  return null;
}

function ensureThumbPath(s: string | null) {
  if (!s) return null;
  const t = String(s).trim();
  if (!t) return null;
  // if someone accidentally stored full URL in manifest, strip to path
  if (t.startsWith("http://") || t.startsWith("https://")) {
    try {
      const u = new URL(t);
      return u.pathname.replace(/^\//, "");
    } catch {
      return t;
    }
  }
  return t.replace(/^\//, "");
}

function resolveThumbKey(pdfKey: string, manifest: any) {
  const fromManifest = ensureThumbPath(thumbKeyFromManifest(manifest, pdfKey));
  if (fromManifest) return fromManifest;

  // fallback: your existing heuristic
  const k = ensureThumbPath(thumbnailKeyForPdf(pdfKey));
  return k;
}

function resolveThumbUrl(workerUrl: string, pdfKey: string, manifest: any) {
    const k = resolveThumbKey(pdfKey, manifest);
    if (!k) return undefined;
    if (!k.startsWith("thumbnails/")) return undefined;
    return fileUrl(k); // <-- instead of `${workerUrl}/${k}`
  }


  export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
    const slug = String(ctx.params?.slug || "");
    const celeb = getCelebrityBySlug(slug);
    if (!celeb) return { notFound: true };
  
    const DEBUG = process.env.NODE_ENV === "development";
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || "https://jacebook-worker.jacebook.workers.dev";
  
    const MIN_CONF = 99.5;
  
    // 1) High-confidence appearances only
    const hi = celeb.appearances.filter((a: any) => (a.confidence ?? 0) >= MIN_CONF);
  
    // 2) Only files that have at least one high-confidence hit
    const keys = unique(hi.map((a) => a.file));
    if (!keys.length) {
      return {
        props: {
          slug,
          name: celeb.name,
          count: celeb.count,
          years: ["Recent"],
          profileAvatarUrl: "",
          coverUrl: "",
          posts: [],
          debug: DEBUG ? { workerUrl, sample: [] } : undefined,
        },
      };
    }
  
    // 3) Fetch PDF meta + manifest
    const [meta, manifest] = await Promise.all([filesByKeys(keys), fetchPdfManifest()]);
  
    const metaByKey = new Map<string, WorkerFile>();
    for (const m of meta) metaByKey.set(m.key, m);
  
    // 4) Build docs
    const docs = keys
      .map((key) => {
        const m = metaByKey.get(key);
        const appearancesInFile = hi.filter((a) => a.file === key);
  
        const minPage = appearancesInFile.length
          ? appearancesInFile.reduce((acc, a) => Math.min(acc, a.page), Number.POSITIVE_INFINITY)
          : 1;
  
        return {
          key,
          uploaded: m?.uploaded ?? null,
          url: fileUrl(key),
          efta: key.match(/(EFTA\d+)\.pdf$/i)?.[1]?.toUpperCase() ?? key.split("/").pop() ?? key,
          appearancesInFile,
          previewPage: Number.isFinite(minPage) ? minPage : 1,
        };
      })
      .sort((a, b) => {
        const ta = a.uploaded ? new Date(a.uploaded).getTime() : 0;
        const tb = b.uploaded ? new Date(b.uploaded).getTime() : 0;
        if (ta !== tb) return tb - ta;
        return parseEftaId(b.key) - parseEftaId(a.key);
      });
  
    // 5) Years
    const yearSet = new Set<string>();
    for (const d of docs) {
      if (!d.uploaded) continue;
      const y = yearFromIso(d.uploaded);
      if (y) yearSet.add(y);
    }
    const years = ["Recent", ...Array.from(yearSet).sort((a, b) => Number(b) - Number(a))];
  
    const rawPosts = docs.map((d) => {
        const pages = d.appearancesInFile.map((a) => a.page).sort((x, y) => x - y);
        const shown = pages.slice(0, 8);
        const pageHint = shown.length
          ? `Pages: ${shown.join(", ")}${pages.length > shown.length ? "…" : ""}`
          : "";
      
        const imageUrl = resolveThumbUrl(workerUrl, d.key, manifest);
      
        return {
          key: d.key,
          url: d.url,
          timestamp: d.uploaded ? formatTimestamp(d.uploaded) : "Unknown date",
          authorAvatar: "",
          content: `${d.efta}${pageHint ? ` • ${pageHint}` : ""}`,
          imageUrl, // will be undefined if we can’t resolve a valid /thumbnails/... path
        };
      }).reverse();
  
    // 8) Profile/cover from first post with imageUrl, else fallback (ABS)
    const firstImg = rawPosts.find((p) => !!p.imageUrl)?.imageUrl || absWorkerUrl(workerUrl, thumbnailUrlForPdf(keys[0])) || "";
    const profileAvatarUrl = firstImg;
    const coverUrl = firstImg;
    for (const p of rawPosts) p.authorAvatar = profileAvatarUrl;
  
    // Debug
    async function headOk(url: string) {
      try {
        const r = await fetch(url, { method: "HEAD" });
        return {
          ok: r.ok,
          status: r.status,
          len: r.headers.get("content-length"),
          ct: r.headers.get("content-type"),
        };
      } catch (e) {
        return { ok: false, status: 0, len: null, ct: null, err: String(e) };
      }
    }
  
    if (DEBUG) {
      const sample = rawPosts.slice(0, 5).map((p) => p.imageUrl).filter(Boolean) as string[];
      const checks = await Promise.all(sample.map(async (u) => ({ url: u, ...(await headOk(u)) })));
      console.log("[people] slug:", slug);
      console.log("[people] worker:", workerUrl);
      console.log("[people] sample image checks:", checks);
    }
  
    return {
      props: {
        slug,
        name: celeb.name,
        count: celeb.count,
        years,
        profileAvatarUrl,
        coverUrl,
        posts: rawPosts,
      },
    };
  };

export default function PersonPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { name, years, posts, count, profileAvatarUrl, coverUrl } = props;

  return (
    <div className="min-h-screen bg-background font-sans">
      <Head>
        <title>{`${name} • Jacebook`}</title>
        <meta name="description" content={`Documents where ${name} appears (${count} total appearances)`} />
      </Head>
      <FacebookNavbar />

      <ProfileHeader name={name} verified={true} coverUrl={coverUrl} avatarUrl={profileAvatarUrl} />

      <div className="max-w-[1050px] mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr_250px] gap-4">
          <aside className="space-y-4">
            <BioSection />
            <FriendsSection />
          </aside>

          <main className="space-y-4">
            <CreatePost />

            {posts.map((p) => (
              <div key={p.key}>
                <NewsFeedPost
                  author={name}
                  authorAvatar={p.authorAvatar}
                  timestamp={p.timestamp}
                  content={p.content}
                  imageUrl={p.imageUrl}
                />
                <div className="mt-2">
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                    Open PDF
                  </a>
                </div>
              </div>
            ))}
          </main>

          <aside className="hidden lg:block">
            <TimelineSection years={years} />
          </aside>
        </div>
      </div>
    </div>
  );
}