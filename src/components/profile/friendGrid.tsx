"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { FriendEdge } from "@/lib/friends-graph";
import { UserCheck } from "lucide-react"

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}



export function FriendGrid({ friends }: { friends: FriendEdge[] }) {
  return (
    <Card className="p-4 bg-white">
      <div className="flex items-center justify-between mb-0">
        <h2 className="font-bold text-foreground">Mutual Friends</h2>
        <div className="text-sm text-muted-foreground">{friends.length}</div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {friends.map((f) => (
          <div key={f.slug} className="flex items-center gap-3 border border-border rounded-lg p-2 bg-white">
            <Avatar className="h-[72px] w-[72px] rounded-sm flex-shrink-0">
              <AvatarImage className="rounded-sm object-cover" src={f.avatarUrl || ""} />
              <AvatarFallback className="rounded-sm">{initialsFromName(f.name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <Link href={`/u/${f.slug}`} className="font-semibold text-sm text-primary hover:underline block truncate">
                {f.name}
              </Link>
              <div className="text-xs text-muted-foreground mt-0.5">
                {f.weight} shared appearances
              </div>
            </div>

            <Button size="sm" className="bg-gray-100 border items-center flex rounded-lg text-gray-600 hover:bg-gray-200 rounded-sm hover:scale-102 active:scale-99">
             <UserCheck className="h-3 w-3 mr-0" /> 
             <div>Friends</div>
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}