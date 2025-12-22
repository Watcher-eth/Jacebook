import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { communities } from "@/lib/consts"
import { ChevronDown, MessageSquare, Calendar, TreePine, Plus } from "lucide-react"
import Link from "next/link"

export function NewsFeedSidebar() {
  return (
    <aside className="w-[180px] py-4 space-y-0.5">
      {/* Profile Section */}
      <Link href="/u/jeffrey-epstein" className="flex items-center gap-0.5 px-2 py-1.5 pt-2 hover:bg-muted/50 rounded cursor-pointer">
        <Avatar className="h-10 w-10">
          <AvatarImage className="object-cover" src="https://commons.wikimedia.org/wiki/Special:FilePath/Epstein_2013_mugshot.jpg" />
          <AvatarFallback>AC</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 ml-1">
          <p className="font-semibold text-sm text-foreground">Jeffrey Epstein</p>
          <p className="text-xs text-muted-foreground">Edit Profile</p>
        </div>
      </Link>

      {/* News Feed */}
      <Link href="/" className="flex items-center hover:scale-101 gap-1.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
          <img src="../icons/Feed.png" className="h-4.5 w-4.5 rounded flex items-center justify-center"/>
        <span className="text-sm font-semibold text-foreground">News Feed</span>
        <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
      </Link>

      {/* Messages */}
      <Link href="https://www.jmail.world" className ="flex items-center hover:scale-101 gap-1.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <img src="../icons/Messages.png" className="h-4.5 w-4.5  rounded flex items-center justify-center"/>
        <span className="text-sm font-medium text-foreground">Messages</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">1</span>
      </Link>

      {/* Events */}
      <button className="flex items-center hover:scale-101 gap-1.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <img src="../icons/Calendar.png" className="h-4.5 w-4.5  rounded flex items-center justify-center"/>
        <span className="text-sm font-medium text-foreground">Events</span>
      </button>

      {/* Groups Header */}
      <div className="pt-3 pb-1">
        <p className="text-xs font-bold text-muted-foreground uppercase px-2">Groups</p>
      </div>

      {/* Lunch Crew */}
      <Link href="https://www.jmail.world/flights" className="flex items-center hover:scale-101 gap-1.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <img src="../icons/Globe.png" className="h-4.5 w-4.5  rounded flex items-center justify-center"/>
        <span className="text-sm font-medium text-foreground">Vacations</span>
      </Link>
     
      {/* Politicians */}
      <Link href="/c/politicians" className="flex items-center hover:scale-101 gap-1.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <img src="../icons/USA.png" className="h-4.5 w-4.5  rounded flex items-center justify-center"/>
        <span className="text-sm font-medium text-foreground">Politicians</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">{communities.politicians?.length}</span>
      </Link>

      {/* Celebs */}
      <Link href="/c/celebrities" className="flex items-center hover:scale-101 gap-1.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <img src="../icons/Film.png" className="h-4.5 w-4.5  rounded flex items-center justify-center"/>
        <span className="text-sm font-medium text-foreground">Celebrities</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">{communities.celebrities?.length}</span>
      </Link>

       {/* Business */}
       <Link href="/c/business" className="flex items-center hover:scale-101 gap-1.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <img src="../icons/Work.png" className="h-4.5 w-4.5  rounded flex items-center justify-center"/>
        <span className="text-sm font-medium text-foreground">Business</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">{communities.business?.length}</span>
      </Link>

      <Link href="/c/science" className="flex items-center hover:scale-101 gap-1.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <img src="../icons/science.png" className="h-4.5 w-4.5  rounded flex items-center justify-center"/>
        <span className="text-sm font-medium text-foreground">Science</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">{communities.science?.length}</span>
      </Link>

      {/* Create Group */}
      <button className="flex items-center hover:scale-101 gap-1.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <img src="../icons/FriendsPlus.png" className="h-4.5 w-4.5  rounded flex items-center justify-center"/>
        <span className="text-sm font-medium text-foreground">Create Group...</span>
      </button>

      {/* Friends Header */}
      <div className="pt-3 pb-1">
        <p className="text-xs font-bold text-muted-foreground uppercase px-2">Friends</p>
      </div>

      {/* Close Friends */}
      <button className="flex items-center hover:scale-101 gap-1.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <div className="h-6 w-6 flex items-center justify-center">
            <img src="../icons/Photos.png" alt="" className="h-full h-4.5 w-4.5  w-full object-cover" />
        </div>
        <span className="text-sm font-medium text-foreground">Close Friends</span>
      </button>
    </aside>
  )
}
