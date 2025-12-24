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

const EPSTEIN_SLUG = "jeffrey-epstein";

function hasRealAvatar(f: FriendEdge) {
  const u = (f.avatarUrl || "").trim();
  return u.length > 0;
}

export function FriendsSection(props: {
  friends: FriendEdge[];
  loading?: boolean;
  name: string; // slug currently
  onShowAll?: () => void;
}) {
  const { friends, loading, name, onShowAll } = props;

  const MAX = 12;
  const all = friends ?? [];

  const preview = all.filter(hasRealAvatar).slice(0, MAX);

  const count = all.length;
  const hasMore = count > MAX;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between -mb-4">
        <div className="flex items-baseline gap-2">
          <h2 className="font-bold text-foreground">
            {name === EPSTEIN_SLUG ? "" : "MUTUAL"} FRIENDS
          </h2>
          <span className="text-muted-foreground font-normal text-sm">· {count}</span>
        </div>

        {hasMore ? (
          <button
            type="button"
            onClick={onShowAll}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Show all
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-sm bg-muted" />
              <div className="flex-1">
                <div className="h-3 w-40 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded mt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : count === 0 ? (
        <div className="text-sm text-muted-foreground mt-5">No friends yet.</div>
      ) : preview.length === 0 ? (
        <div className="text-sm text-muted-foreground mt-5">
          No friends with profile photos yet.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mt-4">
          {preview.map((f) => (
            <Link
              key={f.slug}
              href={`/u/${f.slug}`}
              className="relative group cursor-pointer hover:scale-101 active:scale-99"
            >
              <Avatar className="h-[95px] w-full rounded-md">
                <AvatarImage className="rounded-md object-cover" src={f.avatarUrl!} />
                <AvatarFallback className="rounded-md">
                  {initialsFromName(f.name || f.slug)}
                </AvatarFallback>
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