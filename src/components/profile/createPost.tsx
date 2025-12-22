import { FileText, ImageIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function CreatePost() {
  return (
    <div className=" px-0 gap-0 bg-white rounded-md border shadow-xs">
      <div className="flex p-3  items-center bg-gray-100 gap-3 mb-2 border-b border-border/20 px-3 pb-1">
        <div className="flex items-center hover:bg-primary/5 hover:text-primary  text-sm gap-1 mr-1 hover:scale-101 transition-all">
          <img src="../icons/Write.png" className="h-4.5 w-4.5 rounded font-semibold flex items-center justify-center" />
          Update Status
        </div>
        <div className="flex items-center hover:bg-primary/5 hover:text-primary  text-sm gap-1 hover:scale-101 transition-all">
          <img src="../icons/Photos.png" className="h-4.5 w-4.5 rounded font-semibold flex items-center justify-center" />
          Add Photo
        </div>
      </div>
      <input
        type="text"
        placeholder="What's on your mind?"
        className="w-full pb-3  bg-white rounded px-3 mx-0 py-0 text-md focus:outline-none focus:border-primary"
      />
    </div>
  )
}
