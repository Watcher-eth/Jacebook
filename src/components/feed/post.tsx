import Link from "next/link";
import { MoreHorizontal, Globe, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { avatarPlaceholderDataUri } from "@/lib/people"

type WithPerson = { name: string; slug: string };

interface NewsFeedPostProps {
  author: string;
  authorAvatar: string;
  timestamp: string;
  content: string;
  imageUrl?: string;
  imageAlt?: string;
  withPeople?: WithPerson[];
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export function NewsFeedPost({ imageUrl, withPeople, ...props }: NewsFeedPostProps) {
  const fallback = avatarPlaceholderDataUri(props.author, 64);
  const src = imageUrl ?? fallback;

  return (
    <div className="rounded-lg">
      <div className="p-3 pb-0 bg-white rounded-lg">
        <div className="flex items-start justify-between mb-2">
          <div className="flex gap-2 items-center">
            <Avatar className="h-12 w-12 rounded-sm">
              <AvatarImage className="rounded-sm object-cover" src={props.authorAvatar || "/placeholder.svg"} />
              <AvatarFallback className="rounded-sm">{initialsFromName(props.author)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="font-semibold text-sm text-primary hover:underline cursor-pointer">
                {props.author}
              </p>

              {/* WITH <NAME> */}
              {withPeople && withPeople.length > 0 && (
                <div className="text-xs text-muted-foreground leading-tight">
                  <span className="mr-1">with</span>
                  {withPeople.slice(0, 3).map((p, i) => (
                    <span key={p.slug}>
                      <Link
                        href={`/${p.slug}`}
                        className="text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                      {i < Math.min(withPeople.length, 3) - 1 ? ", " : ""}
                    </span>
                  ))}
                  {withPeople.length > 3 ? <span>, …</span> : null}
                </div>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{props.timestamp}</span>
                <span>·</span>
                <Globe className="h-3 w-3" />
              </div>
            </div>
          </div>

          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="my-3">
          <p className="text-sm text-foreground">{props.content}</p>
        </div>

        <div className="mb-0">
          <img
            src={src}
            alt={props.imageAlt || ""}
            className="w-full"
            onLoad={(e) => {
              const img = e.currentTarget;
              console.log("[img ok]", img.src, img.naturalWidth, img.naturalHeight);
            }}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              console.error("[img fail]", { src: img.src, currentSrc: img.currentSrc });
            }}
          />
        </div>

        <div className="flex gap-2 items-center mt-1.5 -mb-1.5">
          <div className="h-7 text-xs text-primary hover:text-foreground">Like</div>
          <div className="h-7 text-xs text-primary hover:text-foreground">Comment</div>
          <div className="h-7 text-xs text-primary hover:text-foreground">Share</div>
        </div>
      </div>

      <div className="flex gap-2 mt-2 bg-white/30 p-2">
        <Avatar className="h-8 w-8 rounded-sm border-border border">
          <AvatarImage className="rounded-sm" src="/diverse-user-avatars.png" />
          <AvatarFallback className="rounded-sm">Y</AvatarFallback>
        </Avatar>

        <div className="flex-1 relative border border-border/50 rounded-md">
          <input
            type="text"
            placeholder="Write a comment..."
            className="w-full bg-white rounded px-1.5 py-1.5 pr-8 text-sm focus:outline-none border border-transparent focus:border-border"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2">
            <Camera className="h-5 w-5 text-white fill-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}