// src/lib/people.ts
import { CELEBRITY_DATA, type Celebrity } from "@/lib/celebrity-data";

export function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCelebrityBySlug(slug: string): Celebrity | null {
  return CELEBRITY_DATA.find((c) => slugifyName(c.name) === slug) ?? null;
}

/**
 * For friend-graph + cross-person operations.
 * Always prefer this over importing CELEBRITY_DATA directly elsewhere.
 */
export function getAllCelebrities(): Celebrity[] {
  return CELEBRITY_DATA;
}

// lib/avatarPlaceholder.ts
export function avatarPlaceholderDataUri(label: string, size = 90) {
    const text = (label || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]!.toUpperCase())
      .join("");
  
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#262626"/>
          <stop offset="1" stop-color="#343434"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx="${Math.floor(size / 2)}" fill="url(#g)"/>
      <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
            font-family="ui-sans-serif, system-ui" font-size="${Math.floor(size * 0.38)}"
            fill="#F9F9F9">${text || "?"}</text>
    </svg>`.trim();
  
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }