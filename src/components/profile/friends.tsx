import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const friends = [
  { name: "Ashley Ross", initials: "AR" },
  { name: "Vaughn Wallace", initials: "VW" },
  { name: "Alexandra Sifferlin", initials: "AS" },
  { name: "Charlotte Alter", initials: "CA" },
  { name: "Laura Stampler", initials: "LS" },
  { name: "Kelly Conniff", initials: "KC" },
  { name: "Amy Lombard", initials: "AL" },
  { name: "Sam Frizell", initials: "SF" },
  { name: "Nick Carbone", initials: "NC" },
]

export function FriendsSection() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-foreground">
          FRIENDS
          <span className="text-muted-foreground font-normal text-sm ml-2">· 803 (9 Mutual)</span>
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {friends.map((friend) => (
          <div key={friend.name} className="relative group cursor-pointer">
            <Avatar className="h-[90px] w-full rounded-md">
              <AvatarImage className="rounded-md" src={`/.jpg?height=90&width=90&query=${friend.name}`} />
              <AvatarFallback className="rounded-md">{friend.initials}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-sm">
              <p className="text-white text-xs font-semibold leading-tight">{friend.name}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
