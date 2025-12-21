import { FileText, ImageIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function CreatePost() {
  return (
    <div className="p-3 px-0 gap-0 bg-white rounded-md border border-gray-200">
      <div className="flex items-center gap-3 mb-2 border-b border-border mx-2 pb-1">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted gap-2">
          <div className="h-5 w-5 bg-[#5890ff] rounded flex items-center justify-center">
            <FileText className="h-3 w-3 text-white" />
          </div>
          Update Status
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted gap-2">
          <div className="h-5 w-5 bg-[#f5a623] rounded flex items-center justify-center">
            <ImageIcon className="h-3 w-3 text-white" />
          </div>
          Photo / Video
        </Button>
      </div>
      <input
        type="text"
        placeholder="What's on your mind?"
        className="w-full font-semibold bg-white rounded px-3 mx-0 py-0 text-md focus:outline-none focus:border-primary"
      />
    </div>
  )
}
