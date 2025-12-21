import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronDown, MessageSquare, Calendar, TreePine, Plus } from "lucide-react"

export function NewsFeedSidebar() {
  return (
    <aside className="w-[180px] py-4 space-y-0.5">
      {/* Profile Section */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 pt-2 hover:bg-muted/50 rounded cursor-pointer">
        <Avatar className="h-10 w-10">
          <AvatarImage src="/professional-person-portrait.png" />
          <AvatarFallback>AC</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">Andy Chung</p>
          <p className="text-xs text-muted-foreground">Edit Profile</p>
        </div>
      </div>

      {/* News Feed */}
      <button className="flex items-center gap-0.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <div className="h-6 w-6 flex items-center justify-center">
          <div className="h-5 w-5 bg-primary rounded flex items-center justify-center">
            <svg className="h-3 w-3 text-primary-foreground" fill="currentColor" viewBox="0 0 16 16">
              <rect x="2" y="2" width="5" height="5" />
              <rect x="9" y="2" width="5" height="5" />
              <rect x="2" y="9" width="5" height="5" />
              <rect x="9" y="9" width="5" height="5" />
            </svg>
          </div>
        </div>
        <span className="text-sm font-semibold text-foreground">News Feed</span>
        <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
      </button>

      {/* Messages */}
      <button className="flex items-center gap-0.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <div className="h-6 w-6 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground">Messages</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">1</span>
      </button>

      {/* Events */}
      <button className="flex items-center gap-0.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <div className="h-6 w-6 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground">Events</span>
      </button>

      {/* Groups Header */}
      <div className="pt-3 pb-1">
        <p className="text-xs font-bold text-muted-foreground uppercase px-2">Groups</p>
      </div>

      {/* Lunch Crew */}
      <button className="flex items-center gap-0.5 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <div className="h-6 w-6 flex items-center justify-center">
          <div className="h-5 w-5 rounded overflow-hidden">
            <img src="/colorful-food.png" alt="" className="h-full w-full object-cover" />
          </div>
        </div>
        <span className="text-sm font-medium text-foreground">Lunch Crew</span>
      </button>

      {/* Science 101 */}
      <button className="flex items-center gap-3 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <div className="h-6 w-6 flex items-center justify-center">
          <div className="h-5 w-5 rounded overflow-hidden">
            <img src="/science-atoms.jpg" alt="" className="h-full w-full object-cover" />
          </div>
        </div>
        <span className="text-sm font-medium text-foreground">Science 101</span>
      </button>

      {/* Mystic Camping */}
      <button className="flex items-center gap-3 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <div className="h-6 w-6 flex items-center justify-center">
          <TreePine className="h-5 w-5 text-green-600" />
        </div>
        <span className="text-sm font-medium text-foreground">Mystic Camping</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">2</span>
      </button>

      {/* Create Group */}
      <button className="flex items-center gap-3 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <div className="h-6 w-6 flex items-center justify-center">
          <Plus className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground">Create Group...</span>
      </button>

      {/* Friends Header */}
      <div className="pt-3 pb-1">
        <p className="text-xs font-bold text-muted-foreground uppercase px-2">Friends</p>
      </div>

      {/* Close Friends */}
      <button className="flex items-center gap-3 px-2 py-1.5 w-full hover:bg-muted/50 rounded group">
        <div className="h-6 w-6 flex items-center justify-center">
          <div className="h-5 w-5 rounded overflow-hidden">
            <img src="/star-icon.png" alt="" className="h-full w-full object-cover" />
          </div>
        </div>
        <span className="text-sm font-medium text-foreground">Close Friends</span>
      </button>
    </aside>
  )
}
