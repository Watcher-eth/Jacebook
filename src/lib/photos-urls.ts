// src/lib/photo-urls.ts
const PHOTOS_CDN = process.env.NEXT_PUBLIC_PHOTOS_CDN || "https://assets.getkino.com";

export function photoThumbUrl(id: string, width?: number) {
  if (width) {
    return `${PHOTOS_CDN}/cdn-cgi/image/width=${width},quality=80,format=auto/photos-deboned/${id}`;
  }
  return `${PHOTOS_CDN}/photos-deboned/${id}`;
}

export function photoFullUrl(id: string) {
  return `${PHOTOS_CDN}/photos/${id}`;
}