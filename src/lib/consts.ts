export const WORKER_URL = (() => {
    const v = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!v) throw new Error("Missing NEXT_PUBLIC_WORKER_URL in .env.local");
    return v.replace(/\/$/, "");
  })();

  export const BANNED_AUTHOR_SLUGS = new Set<string>([
    "jeffrey-epstein", "albert-einstein", "marilyn-monroe", "emily-elizabeth-dickinson", "william-butler-yeats"
  ]);
  
  export function isBannedAuthorSlug(slug: string) {
    return BANNED_AUTHOR_SLUGS.has(slug);
  }


  export const closeFriends = ["ghislaine-maxwell", "bill-clinton", "mick-jagger", "sarah-duchess-of-york", "les-wexner", "kevin-spacey", "david-copperfield", "peter-mandelson", "william-daniel-hillis", "brett-ratner", "peter-mandelson"]
  

  export const communities = {
    politicians: ["bill-clinton", "donald-trump", "an-bal-acevedo-vil", "peter-mandelson"],
    celebrities: [
      "michael-jackson",
      "chris-tucker",
      "mick-jagger",
      "les-wexner",
      "kevin-spacey",
      "david-copperfield",
      "diana-ross", 
      "walter-cronkite",
      "sarah-duchess-of-york",
    ],
    business: [
      "les-wexner",
      "richard-branson",
      "david-copperfield",
      "arne-glimcher", 
      "william-daniel-hillis",
      "ronald-burkle",
      "henry-jarecki",
      "ted-waitt",
      "salar-kamangar",
      "brett-ratner",
    ],
    science: [
      "john-brockman",
      "joseph-e-ledoux", 
      "freeman-dyson",
      "robert-trivers",
      "benoit-mandelbrot",
      "gerald-edelman"
    ],
    // add more...
  } as const;
  
  export type CommunityKey = keyof typeof communities;
  
  export function getCommunitySlugs(k: string | null | undefined): string[] {
    if (!k) return [];
    const key = k as CommunityKey;
    return (communities as any)[key] ? [...(communities as any)[key]] : [];
  }