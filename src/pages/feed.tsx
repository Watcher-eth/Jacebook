import { FacebookNavbar } from "@/components/layout/navbar"
import { NewsFeedSidebar } from "@/components/feed/sidebarLeft"
import { NewsFeedRightSidebar } from "@/components/feed/sidebarRight"
import { CreatePost } from "@/components/profile/createPost"
import { NewsFeedPost } from "@/components/feed/post"

export default function NewsFeedPage() {
  return (
    <div className="min-h-screen bg-background">
      <FacebookNavbar />

      <div className="max-w-[1050px] mx-auto flex gap-3">
        {/* Left Sidebar */}
        <NewsFeedSidebar />

        {/* Main Feed */}
        <main className="flex-1 py-4 space-y-3">
          {/* Create Post */}
          <CreatePost />

          {/* Posts */}
          <NewsFeedPost
            author="Vivian Wang"
            authorAvatar="/asian-woman-portrait.png"
            timestamp="Just now"
            content="Colorful day on the boardwalk!"
            imageUrl="https://images.ft.com/v3/image/raw/https%3A%2F%2Fd1e00ek4ebabms.cloudfront.net%2Fproduction%2Fa83289ad-567a-4403-a536-099f3d376ce4.jpg?source=next-article&fit=scale-down&quality=highest&width=700&dpr=1"
            imageAlt="Aerial view of colorful carnival"
          />

          <NewsFeedPost
            author="Matt Viscomi"
            authorAvatar="/thoughtful-man-portrait.png"
            timestamp="5 mins"
            content="I can't wait to visit Iceland next week!"
            imageUrl="https://images.ft.com/v3/image/raw/https%3A%2F%2Fd1e00ek4ebabms.cloudfront.net%2Fproduction%2Fa83289ad-567a-4403-a536-099f3d376ce4.jpg?source=next-article&fit=scale-down&quality=highest&width=700&dpr=1"
            imageAlt="Bowl of soup"
          />
        </main>

        {/* Right Sidebar */}
        <NewsFeedRightSidebar />
      </div>
    </div>
  )
}
