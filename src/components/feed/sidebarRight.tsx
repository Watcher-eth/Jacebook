import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { TrendingUp, ChevronDown, Users, UserPlus } from "lucide-react"

export function NewsFeedRightSidebar() {
  return (
    <aside className="w-[300px] py-4 space-y-4 ">
      {/* Events Section */}
      <div className="bg-white py-3">
      <div className="px-3 bg-white pb-2" >
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 bg-[#ed4956] rounded flex items-center justify-center text-white text-xs font-bold">
            <span>📅</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              <span className="text-primary hover:underline cursor-pointer">Alex Ristevski</span> and 1 other
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-[#ed4956] rounded flex items-center justify-center text-white text-xs font-bold">
          📅
          </div>
          <div>
            <p className="text-sm">
              <span className="font-semibold text-primary hover:underline cursor-pointer">2 events</span> this week
            </p>
          </div>
        </div>
      </div>

      {/* Trending Section */}
      <div className="border-t pt-3 bg-white">
        <div className="flex items-center justify-between px-3 mb-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">Trending</h3>
          <button className="text-xs text-primary hover:underline">Learn More</button>
        </div>
        <div className="space-y-2 px-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm">
                <span className="font-semibold text-primary hover:underline cursor-pointer">Paul Rudd:</span>{" "}
                <span className="text-muted-foreground">Lip Sync Battle with Paul Rudd</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm">
                <span className="font-semibold text-primary hover:underline cursor-pointer">Ben & Jerry's:</span>{" "}
                <span className="text-muted-foreground">Ben and Jerry's Announces Four New 'Core' Flavors</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm">
                <span className="font-semibold text-primary hover:underline cursor-pointer">Paco de Lucía:</span>{" "}
                <span className="text-muted-foreground">Renowned Spanish flamenco guitarist Paco de Lucia dies</span>
              </p>
            </div>
          </div>
          <button className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
            <ChevronDown className="h-4 w-4" />
            See More
          </button>
        </div>
      </div>

      {/* People You May Know */}
      <div className="border-t pt-3 bg-white">
        <div className="flex items-center justify-between px-3 mb-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">People You May Know</h3>
          <button className="text-xs text-primary hover:underline">See All</button>
        </div>
        <div className="space-y-3 px-3">
          {/* Greg Marra */}
          <div className="flex items-center gap-2">
            <Avatar className="h-12 w-12 rounded-sm">
              <AvatarImage src="/diverse-woman-smiling.png" />
              <AvatarFallback className="rounded-sm">GM</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary hover:underline cursor-pointer">Greg Marra</p>
              <p className="text-xs text-muted-foreground">12 mutual friends</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs text-gray-500 border-gray-300 bg-gray-50 font-semibold">
              <UserPlus className="h-3 w-3 mr-0 fill-gray-500" />
              Add Friend
            </Button>
          </div>

          {/* Mike Rumble */}
          <div className="flex items-center gap-2">
            <Avatar className="h-12 w-12 rounded-sm">
              <AvatarImage src="/man-with-sunglasses.png" />
              <AvatarFallback className="rounded-sm">MR</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary hover:underline cursor-pointer">Mike Rumble</p>
              <p className="text-xs text-muted-foreground">5 mutual friends</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs border-gray-300 bg-gray-50 text-gray-500 font-semibold">
              <UserPlus className="h-3 w-3 mr-0 fill-gray-500 " />
              Add Friend
            </Button>
          </div>

          {/* Julie Zhuo */}
          <div className="flex items-center gap-2 ">
            <Avatar className="h-12 w-12 rounded-sm">
              <AvatarImage src="/professional-woman-diverse.png rounded-sm" />
              <AvatarFallback className="rounded-sm">JZ</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary hover:underline cursor-pointer">Julie Zhuo</p>
              <p className="text-xs text-muted-foreground">8 mutual friends</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 bg-gray-50 border-gray-300 text-xs text-gray-500 font-semibold ">
              <UserPlus className="h-3 w-3 mr-0 fill-gray-500 " />
              Add Friend
            </Button>
          </div>
        </div>
      </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-3 px-3 ">
        <p className="text-xs text-muted-foreground">
          English (US) · Privacy · Terms · Cookies · More ·<br />
          Facebook © 2014
        </p>
      </div>
    </aside>
  )
}
