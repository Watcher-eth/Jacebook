import Link from "next/link";
import React from "react";
import { MoreHorizontal, Globe, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { slugifyName } from "@/lib/people"

type WithPerson = { name: string; slug: string };
export type LikedByPerson = {
  name: string;
  slug: string;
  avatarUrl?: string | null;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export function NewsFeedPost({
  imageUrl,
  hqImageUrl,
  priorityImage,
  withPeople,
  likedBy,
  ...props
}: {
  author: string;
  likedBy: LikedByPerson[];
  authorAvatar?: string;
  timestamp: string;
  content: string;
  imageUrl?: string | null;     // thumb
  hqImageUrl?: string | null;   // HQ
  priorityImage?: boolean;
  imageAlt?: string;
  withPeople?: WithPerson[];
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = React.useState(imageUrl || "");
  const [didUpgrade, setDidUpgrade] = React.useState(false);

  React.useEffect(() => {
    setSrc(imageUrl || "");
    setDidUpgrade(false);
  }, [imageUrl, hqImageUrl]);

  React.useEffect(() => {
    if (!hqImageUrl || didUpgrade) return;

    const upgrade = () => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        setSrc(hqImageUrl);
        setDidUpgrade(true);
      };
      img.src = hqImageUrl;
    };

    if (priorityImage) {
      upgrade();
      return;
    }

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
        upgrade();
        io.disconnect();
      },
      { root: null, rootMargin: "800px 0px", threshold: 0.01 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hqImageUrl, didUpgrade, priorityImage]);

  return (
    // ✅ IMPORTANT: attach ref here
    <div ref={ref} className="rounded-lg ">
      <div className="p-3 pb-0 bg-white shadow-b-md rounded-lg">
        <div className="flex items-start justify-between mb-2">
          <div className="flex gap-2 items-center">
            
          <Link href={`/u/${slugifyName(props.author)}`}><Avatar className="h-12 w-12 rounded-sm">
              <AvatarImage className="rounded-sm object-cover" src={props.authorAvatar || ""} />
              {!props.authorAvatar ? (
                <AvatarFallback className="rounded-sm">{initialsFromName(props.author)}</AvatarFallback>
              ) : null}
            </Avatar></Link>

            <div className="min-w-0">
              <Link href={`/u/${slugifyName(props.author)}`} className="font-semibold text-sm text-primary hover:underline cursor-pointer">
                {props.author}
              </Link>

              {withPeople && withPeople.length > 0 && (
                <div className="text-xs text-muted-foreground leading-tight">
                  <span className="mr-1">with</span>
                  {withPeople.slice(0, 3).map((p, i) => (
                    <span key={p.slug}>
                      <Link href={`/u/${p.slug}`} className="text-primary hover:underline">
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

        <div className="mb-0">
          <img
            src={src}
            alt={props.imageAlt || ""}
            className="w-full"
            loading={priorityImage ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priorityImage ? "high" : "auto"}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              console.error("[post img fail]", { src: img.src, currentSrc: img.currentSrc });
            }}
          />
        </div>

        <div className="flex gap-2 items-center  -mb-1 -ml-0.5">
          <div className="h-7 text-sm text-primary hover:font-semibold">Like</div>
          <div className="h-7 text-sm text-primary hover:font-semibold">Comment</div>
          <div className="h-7 text-sm text-primary hover:font-semibold">Share</div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 w-full mt-1 bg-[#F6F6F6] p-2">
      {likedBy && likedBy.length > 0 && (
  <div className="flex text-sm gap-1 items-center w-full my-1">
    {likedBy.slice(0, 2).map((p) => (
      <Link
        key={p.slug}
        href={`/u/${p.slug}`}
        className="text-primary font-semibold hover:underline"
      >
        {p.name},
      </Link>
    ))}
    {likedBy.length > 2 && (
      <>
        <span className="text-muted-foreground"> and </span>
        <span className="text-primary font-semibold">
          {likedBy.length - 2} others
        </span>
      </>
    )}
    <span className="text-muted-foreground"> liked this</span>
  </div>
)}
        <div className="flex items-center gap-2 w-full flex-1">
        <Avatar className="h-9 w-9 rounded-sm border-border border">
          <AvatarImage className="rounded-sm object-cover" src="https://commons.wikimedia.org/wiki/Special:FilePath/Epstein_2013_mugshot.jpg" />
          <AvatarFallback className="rounded-sm">JE</AvatarFallback>
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
    </div>
  );
}