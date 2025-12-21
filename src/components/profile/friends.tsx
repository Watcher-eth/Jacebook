// components/profile/friends.tsx
"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type FriendEdge = {
  slug: string;
  name: string;
  weight: number;
  avatarUrl?: string;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

const epsteinFriend = {
  slug: "jeffrey-epstein",
  name: "Jeffrey Epstein",
  weight: 1,
  avatarUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Epstein_2013_mugshot.jpg"
}

export function FriendsSection(props: { friends: FriendEdge[]; loading?: boolean }) {
  const { friends, loading } = props;



  const friendsWithEpstein = [...friends, epsteinFriend];
  const count = friendsWithEpstein.length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between -mb-4">
        <h2 className="font-bold text-foreground">
          FRIENDS
          <span className="text-muted-foreground font-normal text-sm ml-2">· {count}</span>
        </h2>
      </div>

      {loading ?  <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-sm bg-muted" />
            <div className="flex-1">
              <div className="h-3 w-40 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded mt-1" />
            </div>
          </div>
        ))}
      </div> :count === 0 ? (
        <div className="text-sm text-muted-foreground">No friends yet.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {friendsWithEpstein.map((f) => (
            <Link key={f.slug} href={`/${f.slug}`} className="relative group cursor-pointer hover:scale-101 active:scale-99">
              <Avatar className="h-[95px] w-full rounded-md">
                <AvatarImage className="rounded-md object-cover" src={f.avatarUrl || ""} />
                <AvatarFallback className="rounded-md">{initialsFromName(f.name)}</AvatarFallback>
              </Avatar>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-sm">
                <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
                  {f.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}