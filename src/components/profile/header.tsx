// src/components/profile/header.tsx
import { Check, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type ProfileTab = "timeline" | "about" | "friends" | "photos";

export function ProfileHeader(props: {
  name: string;
  coverUrl?: string;
  avatarUrl?: string;
  verified?: boolean;

  activeTab?: ProfileTab;
  onTabChange?: (tab: ProfileTab) => void;
}) {
  const { name } = props;
  const coverUrl = props.coverUrl ?? "/medical-illustration-showing-human-spine-and-skele.jpg";
  const avatarUrl = props.avatarUrl ?? "/professional-black-and-white-portrait-man-in-suit.jpg";
  const verified = props.verified ?? true;

  const activeTab = props.activeTab ?? "timeline";
  const onTabChange = props.onTabChange ?? (() => {});

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const tabBtn = (tab: ProfileTab, label: React.ReactNode) => {
    const active = activeTab === tab;
    return (
      <Button
        key={tab}
        type="button"
        variant="ghost"
        onClick={() => onTabChange(tab)}
        className={[
          "rounded-none hover:bg-muted",
          active ? "border-b-4 border-primary text-primary hover:bg-transparent -mb-px" : "",
        ].join(" ")}
      >
        {label}
      </Button>
    );
  };

  return (
    <div className="bg-card">
      <div className="relative w-full bg-muted flex justify-center">
        <div className="relative max-w-[1050px] w-full h-[315px]">
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />

          <div className="absolute bottom-[10px] left-0 right-0">
            <div className="px-0">
              <div className="flex items-center justify-between pl-[200px]">
                <h1 className="text-3xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                  {name}
                  {verified && (
                    <div className="bg-primary rounded-full p-1">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </h1>

                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-white hover:bg-white/90 text-foreground shadow-sm">
                    <Check className="h-4 w-4 mr-1" />
                    Friends
                  </Button>
                  <Button size="sm" className="bg-white hover:bg-white/90 text-foreground shadow-sm">
                    <Check className="h-4 w-4 mr-1" />
                    Following
                  </Button>
                  <Button size="sm" className="bg-white hover:bg-muted/80 text-foreground">
                    Message
                  </Button>
                  <Button size="sm" variant="ghost" className="bg-white/80 hover:bg-white">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1050px] mx-auto px-4 -mt-30">
        <div className="flex items-end gap-4">
          <div className="border border-gray-100 rounded-md relative -top-3">
          <Avatar className="h-[160px] w-[160px] border-5  border-card rounded-md flex-shrink-0">
            <AvatarImage src={avatarUrl} className="rounded-md object-cover" />
            <AvatarFallback className="text-5xl rounded-md">{initials || "?"}</AvatarFallback>
          </Avatar>
          </div>
          <div className="flex items-center gap-1 border-b border-border flex-1 pb-0">
            {tabBtn("timeline", "Timeline")}
            {tabBtn("about", "About")}
            {tabBtn("friends", <>Friends <span className="ml-1 text-muted-foreground">9 Mutual</span></>)}
            {tabBtn("photos", "Photos")}
            {tabBtn("timeline", "More")}
          </div>
        </div>
      </div>
    </div>
  );
}