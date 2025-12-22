"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type CommunityPerson = {
  slug: string;
  name: string;
  imageUrl: string;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export function CommunityPeopleGrid(props: {
  title: string;
  people: CommunityPerson[];
  loading?: boolean;
}) {
  const { title, people, loading } = props;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-0">
        <h2 className="font-bold text-foreground">{title}</h2>
        <div className="text-sm text-muted-foreground">· {people?.length ?? 0}</div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-full w-full rounded-md bg-muted" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <div className="text-sm text-muted-foreground">No people yet.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {people.map((p) => (
            <Link
              key={p.slug}
              href={`/u/${p.slug}`}
              className="relative group cursor-pointer hover:scale-101 active:scale-99"
            >
              <Avatar className="h-[170px] w-[170px] rounded-md">
                <AvatarImage className="rounded-md object-cover" src={p.imageUrl || ""} />
                <AvatarFallback className="rounded-md text-3xl">
                  {initialsFromName(p.name)}
                </AvatarFallback>
              </Avatar>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 rounded-b-md">
                <p className="text-white text-sm font-semibold leading-tight line-clamp-2">
                  {p.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}