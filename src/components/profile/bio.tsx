import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { WikidataProfile } from "@/lib/wikidata";
import { Calendar, Heart, Briefcase, Globe, Twitter, Instagram, Youtube } from "lucide-react";

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
      {children}
      <span className="sr-only">{label}</span>
    </a>
  );
}

export function BioSection({
  wikidata,
  loading,
}: {
  wikidata: WikidataProfile | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Card className="p-4">
          <div className="space-y-3">
            <div className="h-4 w-40 bg-black/5 rounded" />
            <div className="h-4 w-56 bg-black/5 rounded" />
            <div className="h-4 w-48 bg-black/5 rounded" />
            <div className="h-4 w-32 bg-black/5 rounded" />
          </div>
        </Card>
      </div>
    );
  }

  const jobs = wikidata?.occupations?.filter(Boolean).map((job) => job.charAt(0).toUpperCase() + job.slice(1)) ?? [];
  const rel = wikidata?.relationship && wikidata.relationship !== "Unknown" ? wikidata.relationship : "Single";

  const s = wikidata?.socials;
  const twitterUrl =
    s?.twitter?.startsWith("http") ? s.twitter : s?.twitter ? `https://x.com/${s.twitter.replace(/^@/, "")}` : null;
  const igUrl =
    s?.instagram?.startsWith("http") ? s.instagram : s?.instagram ? `https://instagram.com/${s.instagram.replace(/^@/, "")}` : null;
  const ytUrl =
    s?.youtube?.startsWith("http") ? s.youtube : s?.youtube ? `https://www.youtube.com/channel/${s.youtube}` : null;

  return (
    <div className="space-y-1.5">
      <Card className="p-4">



          <div className="flex gap-2 items-center">
            <img className="h-4 w-4 text-muted-foreground flex-shrink-0" src="../icons/Heart.png" />
            <span className="text-foreground">{wikidata?.relationship}</span>
          </div>

          <div className="flex gap-2 items-center">
            <img className="h-4 w-4 text-muted-foreground flex-shrink-0" src="../icons/Globe.png" />
            <span className="text-foreground">Nationality: {wikidata?.nationality}</span>
          </div>
        
          <div className="flex gap-1.5 items-start">
            <img className="h-4.5 w-5 text-muted-foreground mt-1" src="../icons/work.png" />
            <div className="text-foreground">
              {wikidata?.occupations?.length ? (
                <>
                  <span className="font-semibold text-primary">{wikidata.occupations.slice(0, 4).map((job) => job.charAt(0).toUpperCase() + job.slice(1)).join(", ")}</span>
                  {wikidata.occupations.length > 4 ? <span className="text-muted-foreground">, …</span> : null}
                </>
              ) : (
                "Occupation unknown"
              )}
            </div>
          </div>

          {(wikidata?.socials?.twitter || wikidata?.socials?.instagram || wikidata?.socials?.youtube || wikidata?.socials?.wikipedia || wikidata?.socials?.wikidata || wikidata?.officialWebsite) && (
            <div className="flex gap-2 items-center -mt-1">
              <img className="h-4 w-4 text-muted-foreground" src="../icons/Feed.png" />
              <div className="flex flex-wrap gap-2">
               
                {wikidata?.officialWebsite && (
                  <a href={wikidata.officialWebsite} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary mt-0.5">Website</a>
                )}
                {wikidata?.socials?.twitter && (
                  <a href={wikidata.socials.twitter} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary mt-0.5">Twitter</a>
                )}
                {wikidata?.socials?.instagram && (
                  <a href={wikidata.socials.instagram} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary mt-0.5">Instagram</a>
                )}
                {wikidata?.socials?.youtube && (
                  <a href={wikidata.socials.youtube} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary mt-0.5">YouTube</a>
                )}
                {wikidata?.socials?.wikipedia && (
                  <a href={wikidata.socials.wikipedia} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary mt-0.5">Wikipedia</a>
                )}
             
              </div>
            </div>
          )}
      </Card>
    </div>
  );
}