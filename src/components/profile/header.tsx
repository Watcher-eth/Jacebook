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
  const {
    name,
    coverUrl,
    avatarUrl,
    verified = true,
    friendsCount = 0,
    activeTab = "timeline",
    onTabChange = () => {},
  } = props;

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const tabBtn = (tab: ProfileTab, label: React.ReactNode, extra = "") => {
    const active = activeTab === tab;
    return (
      <Button
        key={tab}
        variant="ghost"
        onClick={() => onTabChange(tab)}
        className={[
          "rounded-none text-sm pl-0 md:pl-2",
          active ? "border-b-4 border-primary text-primary -mb-px" : "",
          extra,
        ].join(" ")}
      >
        {label}
      </Button>
    );
  };

  return (
    <div className="bg-card">
      {/* COVER */}
      <div className="relative h-[170px] md:h-[315px] bg-muted">
        {coverUrl ? (
          <img src={coverUrl} className="h-full  w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-primary" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* NAME + ACTIONS (DESKTOP ONLY) */}
        <div className="absolute md:block hidden -inset-x-1 bottom-[10px]">
            <div className="max-w-[1050px] mx-auto px-4">
              <div className="flex items-center justify-between pl-[190px]">
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

      {/* AVATAR + (MOBILE NAME ROW) + TABS */}
      <div className="max-w-[1050px] mx-auto px-4 -mt-12 md:-mt-24">
        <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
          {/* Left: Avatar */}
          <div className=" md:-mt-6 md:-top-3 relative rounded-md">
          <Avatar
            className="
              bg-white border border-6 border-white rounded-md
              h-[96px] w-[96px]
              md:h-[165px] md:w-[165px]
              flex-shrink-0 
              hover:scale-101 transition-all
            "
          >
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} className="object-cover " />
            ) : (
              <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
            )}
          </Avatar>
          </div>

          {/* Right: Mobile name + Friends button + Tabs */}
          <div className="flex-1 min-w-0">
            {/* MOBILE NAME ROW (avatar left, name right) */}
            <div className="md:hidden flex items-center justify-between gap-2 -mt-1">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2 truncate">
                  <span className="truncate">{name}</span>
                  {verified && (
                    <span className="bg-blue-500 rounded-full p-1">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                </h1>
              </div>

              <Button size="sm" className="bg-white text-foreground border">
                Friends
              </Button>
            </div>

            {/* DESKTOP TABS */}
            <div className="flex  border-b border-border gap-2">
              {tabBtn("timeline", "Timeline")}
              {tabBtn("about", "About")}
              {tabBtn(
                "friends",
                <>
                  Friends{" "}
                  <span className="text-xs text-muted-foreground ml-1">
                    {friendsCount}
                  </span>
                </>
              )}
              {tabBtn("photos", "Photos")}
            </div>

        
          </div>
        </div>
      </div>
    </div>
  );
}