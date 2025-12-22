import type { WikidataProfile } from "@/lib/wikidata";
import { BioSection } from "./bio";

export function AboutSection({
  wikidata,
  loading,
}: {
  wikidata: WikidataProfile | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4 rounded-md bg-white border shadow-xs">
        <div className="h-6 w-24 bg-black/5 rounded" />
        <div className="h-4 w-full bg-black/5 rounded" />
        <div className="h-4 w-5/6 bg-black/5 rounded" />
        <div className="h-4 w-2/3 bg-black/5 rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 rounded-md bg-white border shadow-xs">
        <h2 className="font-bold text-foreground mb-1.5">About</h2>

      {wikidata?.bio ? <div className="text-sm -mt-2">{wikidata.bio}</div> : null}

      {(wikidata?.nationality || wikidata?.gender) && (
        <div className="text-sm text-muted-foreground my-1">
          {wikidata?.nationality ? <span>{wikidata.nationality}</span> : null}
          {wikidata?.nationality && wikidata?.gender ? <span> · </span> : null}
          {wikidata?.gender ? <span>{wikidata.gender.charAt(0).toUpperCase() + wikidata.gender.slice(1)}</span> : null}
          {typeof wikidata?.age === "number" ? ` · ${wikidata.age} Years old` : ""}
        </div>
      )}

        <div className="space-y-3  gap-1">
          <div className="flex gap-2 items-center">
            <img className="h-4 w-4 text-muted-foreground flex-shrink-0" src="../icons/calendar.png"/>
              <span className="text-foreground -mr-0.5">Born:</span>
              <span className="text-primary text-sm">
                {wikidata?.dob?.replaceAll("-", "/") ?? "Unknown"}
              </span>
            </div>
          </div>


          <div className="flex gap-2 items-center">
            <img className="h-4 w-4 text-muted-foreground flex-shrink-0" src="../icons/Heart.png" />
            <span className="text-foreground">{wikidata?.relationship}</span>
          </div>

          <div className="flex gap-2 items-center">
            <img className="h-4 w-4 text-muted-foreground flex-shrink-0" src="../icons/Globe.png" />
            <span className="text-foreground">Nationality: {wikidata?.nationality}</span>
          </div>
        
          <div className="flex gap-2 items-center">
            <img className="h-4.5 w-5 text-muted-foreground " src="../icons/work.png" />
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
      </div>
  );
}