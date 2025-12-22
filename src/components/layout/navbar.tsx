import { Users, MessageCircle, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PeopleSearchPopover } from "./SearchPopover";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function FacebookNavbar() {
  const router = useRouter();

  return (
    <nav className="bg-primary text-primary-foreground shadow-sm border-b border-primary/20 sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-3 md:px-4">
        <div className="flex items-center justify-between h-11">
          <img
            onClick={() => router.push("/")}
            className="h-9 rounded-md mr-2 hover:scale-101 active:scale-99 cursor-pointer"
            src="../textLogo.png"
            alt="Jacebook"
          />

          <div className="flex-1 flex items-center justify-center px-2">
            <PeopleSearchPopover />
          </div>

          <div className="flex items-center gap-2 justify-end">
            {/* On mobile: show only Jeffrey */}
            <Link
              href="/u/jeffrey-epstein"
              className="flex items-center gap-1.5 text-sm font-medium hover:bg-primary-foreground/5 hover:text-white rounded-md px-1.5 py-1"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage
                  className="object-cover"
                  src="https://commons.wikimedia.org/wiki/Special:FilePath/Epstein_2013_mugshot.jpg"
                />
                <AvatarFallback className="text-xs">J</AvatarFallback>
              </Avatar>

              {/* Hide name on mobile, show on md+ */}
              <span className="hidden md:inline text-sm">Jeffrey</span>
            </Link>

            {/* Hide Home + icons on mobile */}
            <Button
              onClick={() => router.push("/")}
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex h-7 text-xs px-2 hover:bg-primary-foreground/10 hover:text-white"
            >
              Home
            </Button>

            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary-foreground/10 hover:text-white">
                <Users className="h-4 w-4 text-primary-foreground/40 hover:text-primary-foreground/25" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary-foreground/10 hover:text-white">
                <MessageCircle className="h-4 w-4 text-primary-foreground/40 hover:text-primary-foreground/25" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary-foreground/10 hover:text-white">
                <Bell className="h-4 w-4 text-primary-foreground/40 hover:text-primary-foreground/25" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary-foreground/10 hover:text-white">
                <Menu className="h-4 w-4 text-primary-foreground/40 hover:text-primary-foreground/25" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}