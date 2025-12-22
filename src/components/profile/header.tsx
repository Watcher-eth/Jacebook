// src/components/profile/header.tsx
import React from "react";
import { Check, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type ProfileTab = "timeline" | "about" | "friends" | "photos" | "more";

export function ProfileHeader(props: {
  name: string;
  coverUrl?: string;
  avatarUrl?: string;
  verified?: boolean;
  friendsCount?: number;
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
          "rounded-none hover:bg-muted hover:scale-101 active:scale-[0.99]",
          active
            ? "border-b-4 border-primary text-primary hover:bg-transparent hover:scale-101 active:scale-99 -mb-px"
            : "",
        ].join(" ")}
      >
        {label}
      </Button>
    );
  };

  return (
    <div className="bg-card">
      {/* Full-bleed cover */}
      <div className="relative w-full bg-muted">
        <div className="relative h-[315px] w-full">
          {coverUrl.length > 10 ? <img src={ coverUrl } alt="Cover" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-primary" />}

          {/* Optional dark gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

          {/* Centered overlay content */}
          <div className="absolute inset-x-0 bottom-[10px]">
            <div className="max-w-[1050px] mx-auto px-4">
              <div className="flex items-center justify-between pl-[200px]">
                <h1 className="text-3xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                  {name}
                  {verified && (
                    <div className="bg-blue-500 rounded-full p-1 border border-white">
                      <Check strokeWidth={4} className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </h1>

                <div className="flex items-center gap-2 md:-left-10">
                  <Button size="sm" className="bg-white rounded-md hover:bg-white/90 text-foreground shadow-sm">
                    <Check strokeWidth={3} className="h-3 w-3 text-foreground/80" />
                    Friends
                  </Button>
                  <div className="bg-white hover:bg-white rounded-md flex items-center">
                  <Button size="sm" className="bg-white hover:bg-white/90 text-foreground shadow-sm">
                    <Check strokeWidth={3} className="h-3 w-3 text-foreground/80" />
                    Following
                  </Button>
                  <div className="h-7 w-[0.1rem] bg-gray-100"/>
                  <Button size="sm" className="bg-white hover:bg-muted/80 text-foreground">
                    Message
                  </Button>
                  <div className="h-7 w-[0.1rem] bg-gray-100"/>
                  <Button size="sm" variant="ghost" className="bg-white/80 hover:bg-white">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Centered avatar + tabs (still max width) */}
      <div className="max-w-[1050px] mx-auto px-4 -mt-30">
        <div className="flex items-end gap-4">
          <div className="border border-gray-300 rounded-md relative -top-3 hover:scale-101">
            <Avatar className="h-[165px] w-[165px] border-5 bg-white border-card rounded-md flex-shrink-0">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} className="rounded-md object-cover" />
              ) : (
                <AvatarFallback className="text-5xl rounded-md">{initials || "?"}</AvatarFallback>
              )}
            </Avatar>
          </div>

          <div className="flex items-center gap-1 border-b border-border flex-1 pb-0">
            {tabBtn("timeline", "Timeline")}
            {tabBtn("about", "About")}
            {tabBtn(
              "friends",
              <>
                Friends{" "}
                <span className="-ml-0.5 text-muted-foreground text-xs">
                  {props.friendsCount} Mutual
                </span>
              </>
            )}
            {tabBtn("photos", "Photos")}
          </div>
        </div>
      </div>
    </div>
  );
}