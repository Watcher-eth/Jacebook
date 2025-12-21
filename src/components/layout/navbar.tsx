import { Search, Users, MessageCircle, Bell, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PeopleSearchPopover } from "./SearchPopover"

export function FacebookNavbar() {
  return (
    <nav className="bg-primary text-primary-foreground shadow-sm border-b border-primary/20 sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-4">
        <div className="flex items-center justify-between h-11">
          <div className="flex items-center flex-1"></div>
          <div className="flex items-center flex-1">
            <svg className="w-7 h-7 bg-white rounded-md" viewBox="0 0 36 36" fill="currentColor">
              <path d="M20.181 35.87C29.094 34.791 36 27.202 36 18c0-9.941-8.059-18-18-18S0 8.059 0 18c0 8.442 5.811 15.526 13.652 17.471L14 34h5.5l.681 1.87Z" />
              <path
                fill="#3b5998"
                d="M13.651 35.471v-11.97H9.936V18h3.715v-2.37c0-6.127 2.772-8.964 8.784-8.964 1.138 0 3.103.223 3.91.446v4.983c-.425-.043-1.167-.065-2.081-.065-2.952 0-4.09 1.116-4.09 4.025V18h5.883l-1.008 5.5h-4.867v12.76a18.104 18.104 0 0 1-6.53-1.789Z"
              />
            </svg>

            <PeopleSearchPopover />

          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="hidden md:flex items-center gap-1.5 text-sm font-medium">
              <Avatar className="h-5 w-5">
                <AvatarImage className="object-cover" src="https://jacebook-worker.jacebook.workers.dev/thumbnails/VOL00002/IMAGES/0001/EFTA00003324.jpg?v=20251221" />
                <AvatarFallback className="text-xs">J</AvatarFallback>
              </Avatar>
              <span className="text-sm">Jeffrey</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 hover:bg-primary-foreground/10">
              Home
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 "
              >
                <Users className="h-4 w-4 text-primary-foreground/40 hover:text-primary-foreground/25" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 "
              >
                <MessageCircle className="h-4 w-4 text-primary-foreground/40 hover:text-primary-foreground/25" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 "
              >
                <Bell className="h-4 w-4 text-primary-foreground/40 hover:text-primary-foreground/25" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 "
              >
                <Menu className="h-4 w-4 text-primary-foreground/40 hover:text-primary-foreground/25" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
