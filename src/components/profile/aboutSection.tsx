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
    <div className="flex flex-col gap-4 p-4 rounded-md bg-white border shadow-xs">
      <div className="text-xl font-bold">About</div>

      {wikidata?.bio ? <div className="text-sm -mt-2">{wikidata.bio}</div> : null}

      {(wikidata?.nationality || wikidata?.gender) && (
        <div className="text-sm text-muted-foreground">
          {wikidata?.nationality ? <span>{wikidata.nationality}</span> : null}
          {wikidata?.nationality && wikidata?.gender ? <span> · </span> : null}
          {wikidata?.gender ? <span>{wikidata.gender}</span> : null}
        </div>
      )}

      <BioSection wikidata={wikidata} loading={false} />
    </div>
  );
}