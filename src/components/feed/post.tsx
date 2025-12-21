import { MoreHorizontal, Globe, ThumbsUp, MessageCircle, Share2, Camera } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface NewsFeedPostProps {
  author: string
  authorAvatar: string
  timestamp: string
  content: string
  imageUrl?: string
  imageAlt?: string
}

export function NewsFeedPost({ author, authorAvatar, timestamp, content, imageUrl= "https://images.ft.com/v3/image/raw/https%3A%2F%2Fd1e00ek4ebabms.cloudfront.net%2Fproduction%2Fa83289ad-567a-4403-a536-099f3d376ce4.jpg?source=next-article&fit=scale-down&quality=highest&width=700&dpr=1", imageAlt }: NewsFeedPostProps) {
  return (
    <div className=" rounded-lg">
      {/* Post Header */}
      <div className="p-3 pb-0 bg-white rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-2">
          <Avatar className="h-10 w-10 rounded-sm">
            <AvatarImage className="rounded-sm" src={authorAvatar || "/placeholder.svg"} />
            <AvatarFallback className="rounded-sm">{author.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm text-primary hover:underline cursor-pointer">{author}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{timestamp}</span>
              <span>·</span>
              <Globe className="h-3 w-3" />
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Post Content */}
      <div className="my-3">
        <p className="text-sm text-foreground">{content}</p>
      </div>

      {/* Post Image */}
      {imageUrl && (
        <div className="mb-0">
          <img src={imageUrl || "/https://images.ft.com/v3/image/raw/https%3A%2F%2Fd1e00ek4ebabms.cloudfront.net%2Fproduction%2Fa83289ad-567a-4403-a536-099f3d376ce4.jpg?source=next-article&fit=scale-down&quality=highest&width=700&dpr=1"} alt={imageAlt || ""} className="w-full" />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 items-center mt-1.5 -mb-1.5">
        <div
          className=" h-7 text-xs text-primary hover:text-foreground"
        >
          Like
        </div>
        <div
          className=" h-7 text-xs text-primary hover:text-foreground"
        >
          Comment
        </div>
        <div
          className=" h-7 text-xs text-primary hover:text-foreground"
        >
          Share
        </div>
      </div>
</div>
      {/* Comment Input */}
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
  )
}
