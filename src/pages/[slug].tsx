// pages/people/[slug].tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";

import { FacebookNavbar } from "@/components/layout/navbar";
import { BioSection } from "@/components/profile/bio";
import { CreatePost } from "@/components/profile/createPost";
import { FriendsSection } from "@/components/profile/friends";
import { ProfileHeader } from "@/components/profile/header";
import { TimelineSection } from "@/components/profile/timeline";

import { getCelebrityBySlug, getAllCelebrities, slugifyName } from "@/lib/people";
import {
  filesByKeys,
  fileUrl,
  parseEftaId,
  type WorkerFile,
  fetchPdfManifest,
  thumbnailUrlForPdf,
  thumbnailKeyForPdf,
  pageJpegUrlOrThumb,
} from "@/lib/worker-client";

import { NewsFeedPost } from "@/components/feed/post";
import { buildFriendsForPerson, type FriendEdge } from "@/lib/friends-graph";

type WithPerson = { name: string; slug: string };

type PageProps = {
  slug: string;
  name: string;
  count: number;
  years: string[];
  profileAvatarUrl: string;
  coverUrl: string;
  friends: FriendEdge[];
  posts: Array<{
    key: string;
    url: string;
    timestamp: string;
    content: string;
    authorAvatar: string;
    imageUrl?: string;
    withPeople?: WithPerson[];
  }>;
  debug?: {
    workerUrl: string;
    sample: Array<{ key: string; imageUrl?: string; profileAvatarUrl: string; coverUrl: string }>;
  };
};

type Appearance = {
  file: string;
  page: number;
  confidence?: number;
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
  if (s.startsWith("/")) return `${workerUrl}${s}`;
  return `${workerUrl}/${s}`;
}

type PdfManifest = Record<
  string,
  { thumbnailKey?: string; thumbKey?: string; thumb?: string; thumbnail?: string } | string
>;

function thumbKeyFromManifest(manifest: PdfManifest | any, pdfKey: string) {
  if (!manifest) return null;
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
  return ensureThumbPath(thumbnailKeyForPdf(pdfKey));
}

function resolveThumbUrl(workerUrl: string, pdfKey: string, manifest: any) {
  const k = resolveThumbKey(pdfKey, manifest);
  if (!k) return undefined;
  if (!k.startsWith("thumbnails/")) return undefined;
  return fileUrl(k);
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

function imageUrlForAppearance(args: { manifest: any | null; workerUrl: string; a: Appearance }) {
  const { manifest, workerUrl, a } = args;

  if (manifest) return pageJpegUrlOrThumb(manifest, a.file, a.page);
  return resolveThumbUrl(workerUrl, a.file, manifest) || fileUrl(thumbnailKeyForPdf(a.file));
}

function chooseBestPage(appearances: Appearance[]) {
  if (!appearances.length) return 1;
  const best = appearances.reduce((best, cur) => {
    const cb = conf(best);
    const cc = conf(cur);
    if (cc > cb) return cur;
    if (cc === cb && cur.page < best.page) return cur;
    return best;
  }, appearances[0]);
  return best.page || 1;
}

// ---- co-occur helper (same file, pageWindow +/-) ----
function buildPagePeopleIndex(args: {
  allCelebs: ReturnType<typeof getAllCelebrities>;
  keysSet: Set<string>;
}) {
  const { allCelebs, keysSet } = args;

  // file -> page -> Map<slug, maxConf>
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

  const agg = new Map<string, number>(); // otherSlug -> score (max conf or sum)

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

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const slug = String(ctx.params?.slug || "");
  const celeb = getCelebrityBySlug(slug);
  if (!celeb) return { notFound: true };

  const DEBUG = process.env.NODE_ENV === "development";
  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || "https://jacebook-worker.jacebook.workers.dev";

  // Strict for THIS person page feed
  const MIN_CONF = 99.7;

  const hi = (celeb.appearances as Appearance[]).filter((a) => (a.confidence ?? 0) >= MIN_CONF);
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
        friends: [],
        posts: [],
        debug: DEBUG ? { workerUrl, sample: [] } : undefined,
      },
    };
  }

  const [meta, manifest] = await Promise.all([filesByKeys(keys), fetchPdfManifest()]);

  const metaByKey = new Map<string, WorkerFile>();
  for (const m of meta) metaByKey.set(m.key, m);

  const top2 = pickTopAppearances(celeb.appearances as Appearance[], MIN_CONF, 2);
  const pfpA = top2[0] ?? null;
  const coverA = top2[1] ?? top2[0] ?? null;

  const profileAvatarUrl = pfpA
    ? imageUrlForAppearance({ manifest, workerUrl, a: pfpA })
    : absWorkerUrl(workerUrl, thumbnailUrlForPdf(keys[0])) || "";

  const coverUrl = coverA ? imageUrlForAppearance({ manifest, workerUrl, a: coverA }) : profileAvatarUrl;

  const docs = keys
    .map((key) => {
      const m = metaByKey.get(key);
      const appearancesInFile = hi.filter((a) => a.file === key);
      const previewPage = chooseBestPage(appearancesInFile);

      return {
        key,
        uploaded: m?.uploaded ?? null,
        url: fileUrl(key),
        efta: key.match(/(EFTA\d+)\.pdf$/i)?.[1]?.toUpperCase() ?? key.split("/").pop() ?? key,
        appearancesInFile,
        previewPage,
      };
    })
    .sort((a, b) => {
      const ta = a.uploaded ? new Date(a.uploaded).getTime() : 0;
      const tb = b.uploaded ? new Date(b.uploaded).getTime() : 0;
      if (ta !== tb) return tb - ta;
      return parseEftaId(b.key) - parseEftaId(a.key);
    });

  const yearSet = new Set<string>();
  for (const d of docs) {
    if (!d.uploaded) continue;
    const y = yearFromIso(d.uploaded);
    if (y) yearSet.add(y);
  }
  const years = ["Recent", ...Array.from(yearSet).sort((a, b) => Number(b) - Number(a))];

  // ---- Friends graph ----
  const allCelebs = getAllCelebrities();
  const friends = buildFriendsForPerson({
    ownerSlug: slug,
    allCelebs,
    minConf: MIN_CONF,
    manifest,
    minConfOwner: 99.3,
    minConfOther: 99.0,
    pageWindow: 1,
    minEdgeWeight: 1,
    limit: 48,
  });

  // ---- Build "WITH <NAME>" for each post ----
  const keysSet = new Set(keys);
  const slugToName = new Map<string, string>();
  for (const c of allCelebs) slugToName.set(slugifyName(c.name), c.name);

  const byFile = buildPagePeopleIndex({ allCelebs, keysSet });

  const WITH_MIN_CONF = 98.8;
  const WITH_PAGE_WINDOW = 1;

  const rawPosts = docs
    .map((d) => {
      const pages = d.appearancesInFile.map((a) => a.page).sort((x, y) => x - y);
      const shown = pages.slice(0, 8);
      const pageHint = shown.length ? `Pages: ${shown.join(", ")}${pages.length > shown.length ? "…" : ""}` : "";

      const imageUrl = manifest
        ? pageJpegUrlOrThumb(manifest, d.key, d.previewPage)
        : fileUrl(thumbnailKeyForPdf(d.key));

      const withPeople = coPeopleForPost({
        byFile,
        file: d.key,
        page: d.previewPage,
        ownerSlug: slug,
        slugToName,
        minConfOther: WITH_MIN_CONF,
        pageWindow: WITH_PAGE_WINDOW,
        maxPeople: 6,
      });

      return {
        key: d.key,
        url: d.url,
        timestamp: d.uploaded ? formatTimestamp(d.uploaded) : "Unknown date",
        authorAvatar: profileAvatarUrl,
        content: `${d.efta}${pageHint ? ` • ${pageHint}` : ""} • Page ${d.previewPage}`,
        imageUrl,
        withPeople,
      };
    })
    .reverse();

  return {
    props: {
      slug,
      name: celeb.name,
      count: celeb.count,
      years,
      profileAvatarUrl,
      coverUrl,
      friends,
      posts: rawPosts,
    },
  };
};

export default function PersonPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { name, years, posts, count, profileAvatarUrl, coverUrl, friends } = props;

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
            <FriendsSection friends={friends} />
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
                  withPeople={p.withPeople}
                />
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