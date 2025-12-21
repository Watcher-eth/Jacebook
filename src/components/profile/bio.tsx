import { Music, Users, Briefcase } from "lucide-react"
import { Card } from "@/components/ui/card"

export function BioSection() {
  return (
    <div className="space-y-3">
      {/* Recent Activity */}
      <Card className="p-4">
        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            <Music className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <span className="text-foreground">Listened to </span>
              <span className="font-semibold text-primary">You & I</span>
              <span className="text-foreground"> by </span>
              <span className="font-semibold text-primary">Local Natives</span>
              <div className="text-muted-foreground text-xs mt-0.5">on Monday on Spotify</div>
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

          <div className="flex gap-3">
            <Users className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <span className="text-foreground">9 mutual friends including </span>
              <span className="font-semibold text-primary">Tanner Curtis</span>
              <span className="text-foreground"> and </span>
              <span className="font-semibold text-primary">Denver Nicks</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <span className="text-foreground">Deputy Tech Editor at </span>
              <span className="font-semibold text-primary">TIME</span>
              <div className="text-muted-foreground mt-0.5">
                Past: <span className="font-semibold text-primary">Mashable</span> and{" "}
                <span className="font-semibold text-primary">City of Rochester, Communications Bureau</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
