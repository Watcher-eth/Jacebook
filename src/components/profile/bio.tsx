import { Music, Users, Briefcase, Heart, Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"
import { WikidataProfile } from "@/lib/wikidata"

export function BioSection({ wikidata }: { wikidata: WikidataProfile | null }) {
  console.log(wikidata)
  return (
    <div className="space-y-3">
      {/* Recent Activity */}
      <Card className="p-4">
        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <span className="text-foreground">Born: </span>
              <span className="font-semibold text-primary">{wikidata?.dob}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Users className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <span className="text-foreground">Became friends with </span>
              <span className="font-semibold text-primary">Seamus Kirst</span>
              <span className="text-foreground"> and 1 other person</span>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <Heart className="h-4 w-4  -mt-0.5  text-muted-foreground " />
            <span className="text-foreground">{wikidata?.relationship !== "Unknown" ? wikidata?.relationship : "Single"}</span>
          </div>

          <div className="flex gap-3 items-center">
            <Briefcase className="h-4 w-4  -mt-0.5  text-muted-foreground " />
            <span className="text-foreground">{wikidata?.occupation?.charAt(0).toUpperCase() + (wikidata?.occupation?.slice(1) || "")}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
