import { ThumbsUp, MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface Comment {
  author: string
  text: string
  likes: number
  timestamp: string
}

interface PostCardProps {
  author: string
  timestamp: string
  content: string
  likes: number
  likedBy: string[]
  comments: Comment[]
  totalComments: number
}

export function PostCard({ author, timestamp, content, likes, likedBy, comments, totalComments }: PostCardProps) {
  return (
    <Card className="p-4">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/placeholder.svg?height=40&width=40" />
            <AvatarFallback>AF</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm text-foreground">{author}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{timestamp}</span>
              <span>·</span>
              <span>🌐</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Post Content */}
      <div className="mb-3">
        <p className="text-sm text-foreground whitespace-pre-line">{content}</p>
      </div>

      {/* Like Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-1">
          <div className="flex items-center -space-x-1">
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <ThumbsUp className="h-3 w-3 text-primary-foreground fill-current" />
            </div>
          </div>
          <span>
            {likedBy.slice(0, 2).join(", ")} and {likes} others like this.
          </span>
        </div>
      </div>

      <Separator className="mb-2" />

      {/* Action Buttons */}
      <div className="flex items-center justify-around mb-3">
        <Button variant="ghost" size="sm" className="flex-1 h-8 text-muted-foreground hover:text-foreground">
          Like
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 h-8 text-muted-foreground hover:text-foreground">
          Comment
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 h-8 text-muted-foreground hover:text-foreground">
          Share
        </Button>
      </div>

      <Separator className="mb-3" />

      {/* View More Comments */}
      {totalComments > comments.length && (
        <button className="text-sm text-muted-foreground hover:underline mb-2">
          View {totalComments - comments.length} more comments
        </button>
      )}

      {/* Comments */}
      <div className="space-y-2">
        {comments.map((comment, index) => (
          <div key={index} className="flex gap-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>
                {comment.author
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-muted rounded-2xl px-3 py-2">
                <p className="font-semibold text-sm text-foreground">{comment.author}</p>
                <p className="text-sm text-foreground">{comment.text}</p>
              </div>
              <div className="flex items-center gap-3 mt-1 px-3 text-xs text-muted-foreground">
                <span>{comment.timestamp}</span>
                <button className="hover:underline font-semibold">Like</button>
                {comment.likes > 0 && (
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3 text-primary fill-current" />
                    <span>{comment.likes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comment Input */}
      <div className="flex gap-2 mt-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src="/placeholder.svg?height=32&width=32" />
          <AvatarFallback>Y</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Write a comment..."
            className="w-full bg-muted rounded-full px-4 py-2 text-sm focus:outline-none"
          />
        </div>
      </div>
    </Card>
  )
}
