import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { TrendingUp, ChevronDown, Users, UserPlus } from "lucide-react"
import Link from "next/link"

export function NewsFeedRightSidebar() {
  return (
    <aside className="w-[300px] py-4 space-y-4 ">
      {/* Events Section */}
      <div className="bg-white py-3">
      <div className="px-3 bg-white pb-2" >
        <div className="flex items-center gap-1.5 mb-2">
          <img src="./icons/Gift.png" className="h-5 w-5 rounded flex items-center justify-center"/>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              <Link href="/ghislaine-maxwell" className="text-primary hover:underline cursor-pointer">Ghislaine Maxwell</Link> and 1 other
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <img src="./icons/Calendar.png" className="h-5 w-5 rounded flex items-center justify-center"/>
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
                <Link href="https://www.bbc.com/news/live/cwyk526vlnlt" className="font-semibold text-primary hover:underline cursor-pointer">Epstein victims and lawmakers</Link>{" "}
                <span className="text-muted-foreground">criticise number of files released and redactions</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm">
                <span className="text-muted-foreground">How</span>{" "}
                <Link href="/bill-clinton" className="font-semibold text-primary hover:underline cursor-pointer">Bill Clinton</Link>{" "}
                <span className="text-muted-foreground">became the focus of the Epstein files</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm">
                <span className="text-muted-foreground">Photo of</span>{" "}
                <Link href="/donald-trump" className="font-semibold text-primary hover:underline cursor-pointer">President Trump</Link>{" "}
                <span className="text-muted-foreground">and</span>{" "}
                <Link href="/donald-trump" className="font-semibold text-primary hover:underline cursor-pointer">First Lady Melania Trump</Link>{" "}
                <span className="text-muted-foreground">reuploaded by the DoJ</span>
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
          <Link href="/ted-waitt" className="flex items-center gap-2">
            <Avatar className="h-12 w-12 rounded-sm">
              <AvatarImage className="rounded-sm object-cover" src="https://jacebook-worker.jacebook.workers.dev/pdfs-as-jpegs/VOL00002/IMAGES/0001/EFTA00003383/page-001.jpg?v=20251221" />
              <AvatarFallback className="rounded-sm">BC</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary hover:underline cursor-pointer">Ted Waitt</p>
              <p className="text-xs text-muted-foreground">7 mutual friends</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 hover:scale-[1.01] hover:gray-400 text-xs text-gray-500 border-gray-300 bg-gray-50 font-semibold">
              <UserPlus className="h-3 w-3 mr-0 fill-gray-500" />
              Add Friend
            </Button>
          </Link>

          {/* Mike Rumble */}
          <Link href="/mick-jagger" className="flex  items-center gap-2">
            <Avatar className="h-12 w-12 rounded-sm">
              <AvatarImage className="rounded-sm object-cover" src="https://commons.wikimedia.org/wiki/Special:FilePath/Rolling_Stones_04.jpg" />
              <AvatarFallback className="rounded-sm">MJ</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary hover:underline cursor-pointer">Mick Jagger</p>
              <p className="text-xs text-muted-foreground">3 mutual friends</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 hover:scale-[1.01] hover:gray-400 text-xs border-gray-300 bg-gray-50 text-gray-500 font-semibold">
              <UserPlus className="h-3 w-3 mr-0 fill-gray-500 " />
              Add Friend
            </Button>
          </Link>

          {/* Julie Zhuo */}
          <Link href="/chris-tucker" className="flex items-center gap-2 ">
            <Avatar className="h-12 w-12 rounded-sm">
              <AvatarImage className="rounded-sm object-cover" src="https://commons.wikimedia.org/wiki/Special:FilePath/Chris_Tucker_by_Gage_Skidmore.jpg" />
              <AvatarFallback className="rounded-sm">JZ</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary hover:underline cursor-pointer">Chris Tucker</p>
              <p className="text-xs text-muted-foreground">2 mutual friends</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 hover:scale-[1.01] hover:gray-400 text-xs border-gray-300 bg-gray-50 text-gray-500 font-semibold ">
              <UserPlus className="h-3 w-3 mr-0 fill-gray-500 " />
              Add Friend
            </Button>
          </Link>
        </div>
      </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-3 px-3 ">
        <p className="text-xs text-muted-foreground">
          English (US) · DoJ Release · Credits · More <br />
          Jacebook © 2025
        </p>
      </div>
    </aside>
  )
}
