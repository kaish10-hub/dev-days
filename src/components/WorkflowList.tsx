import React, {useMemo, useState} from 'react'
import { workflows } from '../data/workflows'
import { ChevronRight } from 'lucide-react'

type Props = {
  category?: string | null
  onSelect?: (id:string)=>void
}

export default function WorkflowList({category=null, onSelect}:Props){
  const [query, setQuery] = useState('')
  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase()
    return workflows.filter(w=> (
      (category ? w.category === category : true) &&
      (w.title.toLowerCase().includes(q) || w.category.toLowerCase().includes(q) || (w.region||'').toLowerCase().includes(q))
    ))
  },[query, category])

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input aria-label="Search workflows" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search workflows or categories" className="flex-1 px-4 py-2 border rounded-md"/>
        <button className="px-4 py-2 bg-[#0f1724] text-white rounded-md">Search</button>
      </div>

      <div className="space-y-3">
        {filtered.map(w=> (
          <div key={w.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-md font-semibold">{w.title} {w.demo && <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">Demo</span>}</h3>
                <div className="text-sm text-gray-600">{w.category} • {w.region}</div>
              </div>
              <button onClick={()=>onSelect && onSelect(w.id)} aria-label={`Open ${w.title}`} className="flex items-center gap-2 text-sm text-gray-600">
                Open <ChevronRight size={16} />
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-700">{w.summary}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={()=>onSelect && onSelect(w.id)} className="px-3 py-1 border rounded">View</button>
              <button className="px-3 py-1 bg-[#0f1724] text-white rounded">Start</button>
            </div>
          </div>
        ))}

        {filtered.length===0 && (
          <div className="card">No workflows match your search.</div>
        )}
      </div>
    </div>
  )
}
