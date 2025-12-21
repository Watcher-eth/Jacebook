import { WikidataProfile } from '@/lib/wikidata'
import { Briefcase, Calendar, DivideSquare, Heart, Users } from 'lucide-react'
import { BioSection } from './bio'

export function AboutSection({ wikidata }: { wikidata: WikidataProfile | null }) {
  return (
    <div className='flex flex-col gap-4 p-4 rounded-md bg-white border shadow-xs'>
        <div className="text-xl font-bold">About</div>
        <div className="text-sm -mt-2">{wikidata?.bio}</div>

<BioSection wikidata={wikidata!}/>        
    </div>
  )
}

