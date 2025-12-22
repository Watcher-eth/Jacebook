export const WORKER_URL = (() => {
    const v = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!v) throw new Error("Missing NEXT_PUBLIC_WORKER_URL in .env.local");
    return v.replace(/\/$/, "");
  })();

  export const BANNED_AUTHOR_SLUGS = new Set<string>([
    "jeffrey-epstein",
  ]);
  
  export function isBannedAuthorSlug(slug: string) {
    return BANNED_AUTHOR_SLUGS.has(slug);
  }


  export const closeFriends = ["ghislaine-maxwell", "bill-clinton", "mick-jagger", "sarah-duchess-of-york", "les-wexner", "kevin-spacey", "david-copperfield", "peter-mandelson", "william-daniel-hillis"]
  