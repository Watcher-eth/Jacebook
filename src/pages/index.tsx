import { FacebookNavbar } from "@/components/layout/navbar"
import { BioSection } from "@/components/profile/bio"
import { CreatePost } from "@/components/profile/createPost"
import { FriendsSection } from "@/components/profile/friends"
import { ProfileHeader } from "@/components/profile/header"
import { PostCard } from "@/components/profile/post"
import { TimelineSection } from "@/components/profile/timeline"


export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <FacebookNavbar />
      <ProfileHeader />

      <div className="max-w-[1050px] mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr_250px] gap-4">
          {/* Left Sidebar - Bio Section */}
          <aside className="space-y-4">
            <BioSection />
            <FriendsSection />
          </aside>

          {/* Main Content - Timeline */}
          <main className="space-y-4">
            <CreatePost />
            <PostCard
              author="Alex Fitzpatrick"
              timestamp="20 hrs"
              content="All this talk of measles has...

Gone viral"
              likes={29}
              likedBy={["Craig Kanalley", "Rubina Madan Fillion"]}
              comments={[
                {
                  author: "Robert Potter",
                  text: "Alex Fitzpatrick when you have your first kid I want to be there when you look into its eyes and say 'aw, you are such a little dick'",
                  likes: 1,
                  timestamp: "16 hrs",
                },
                {
                  author: "Alex Fitzpatrick",
                  text: "Robert I'm not planning on getting pregnant until at least after the wedding",
                  likes: 2,
                  timestamp: "16 hrs",
                },
                {
                  author: "Ryan Teague Beckwith",
                  text: "I'm actually wondering if this 'babies are dicks' thing isn't just a spectacular misunderstanding of the birds and the bees talk.",
                  likes: 0,
                  timestamp: "16 hrs",
                },
              ]}
              totalComments={15}
            />

            <PostCard
              author="Alex Fitzpatrick"
              timestamp="February 2 at 12:04pm"
              content="Looking forward to the weekend!"
              likes={15}
              likedBy={["Sarah Johnson", "Mike Chen"]}
              comments={[]}
              totalComments={0}
              
            />
          </main>

          {/* Right Sidebar - Timeline Years */}
          <aside className="hidden lg:block">
            <TimelineSection />
          </aside>
        </div>
      </div>
    </div>
  )
}
