// pages/api/people/posts.ts
import { getPersonById, getPostsForPerson, type PhotoPostRow } from "@/lib/people";
import { photoFullUrl, photoThumbUrl } from "@/lib/photos-urls";
import type { NextApiRequest, NextApiResponse } from "next";

type PagePost = {
  key: string;
  url: string;
  timestamp: string;
  content: string;
  authorAvatar: string;
  imageUrl?: string;
  hqImageUrl?: string;
};

function labelFor(row: PhotoPostRow) {
  const parts = [
    row.source,
    row.release_batch ? row.release_batch : null,
    row.original_filename || row.id,
  ].filter(Boolean);
  return parts.join(" • ");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.slug || "").trim();
  const cursor = req.query.cursor ? String(req.query.cursor) : null;
  const limit = Math.min(50, Math.max(6, Number(req.query.limit || 12)));

  const person = await getPersonById(slug);
  if (!person) return res.status(404).json({ posts: [], nextCursor: null });

  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");

  const { rows, nextCursor } = await getPostsForPerson({
    personId: person.id,
    cursor,
    limit,
    minConf: 98,
  });

  const posts: PagePost[] = rows.map((p) => ({
    key: p.id,
    url: photoFullUrl(p.id),
    timestamp: p.created_at
      ? new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    content: labelFor(p),
    authorAvatar: "",
    imageUrl: photoThumbUrl(p.id, 512),
    hqImageUrl: photoFullUrl(p.id),
  }));

  return res.status(200).json({ posts, nextCursor });
}