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
    <div className="space-y-3">
      <Card className="p-4">
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <span className="text-foreground">Born: </span>
              <span className="font-semibold text-primary">
                {wikidata?.dob?.replaceAll("-", "/") ?? "Unknown"}
              </span>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <Heart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground">{rel}</span>
          </div>

          <div className="flex gap-3 items-start">
            <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="text-foreground">
              {jobs.length ? (
                <>
                  <span className="font-semibold text-primary">{jobs.slice(0, 4).join(", ")}</span>
                  {jobs.length > 4 ? <span className="text-muted-foreground">, …</span> : null}
                </>
              ) : (
                "Occupation unknown"
              )}
            </div>
          </div>

          {(twitterUrl || igUrl || ytUrl || s?.wikipedia || s?.wikidata || wikidata?.officialWebsite) && (
            <div className="flex gap-2 items-center pt-1">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-3">
                {twitterUrl && (
                  <SocialLink href={twitterUrl} label="Twitter">
                    <Twitter className="h-4 w-4" />
                    <span className="font-semibold text-primary mt-0.5">{s?.twitter}</span>
                  </SocialLink>
                )}
                {igUrl && (
                  <SocialLink href={igUrl} label="Instagram">
                    <Instagram className="h-4 w-4" />
                    <span className="font-semibold text-primary mt-0.5">{s?.instagram}</span>
                  </SocialLink>
                )}
                {ytUrl && (
                  <SocialLink href={ytUrl} label="YouTube">
                    <Youtube className="h-4 w-4" />
                    <span className="font-semibold text-primary mt-0.5">YouTube</span>
                  </SocialLink>
                )}
                {wikidata?.officialWebsite && (
                  <SocialLink href={wikidata.officialWebsite} label="Website">
                    <span className="font-semibold text-primary mt-0.5">Website</span>
                  </SocialLink>
                )}
                {s?.wikipedia && (
                  <SocialLink href={s.wikipedia} label="Wikipedia">
                    <span className="font-semibold text-primary mt-0.5">Wikipedia</span>
                  </SocialLink>
                )}
             
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}