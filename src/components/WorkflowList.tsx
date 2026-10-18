import React, {useMemo, useState} from 'react'
import { workflows } from '../data/workflows'

export default function WorkflowList(){
  const [query, setQuery] = useState('')
  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase()
    return workflows.filter(w=> w.title.toLowerCase().includes(q) || w.category.toLowerCase().includes(q))
  },[query])

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input aria-label="Search workflows" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search workflows or categories" className="flex-1 px-4 py-2 border rounded-md"/>
        <button className="px-4 py-2 bg-[#0f1724] text-white rounded-md">Search</button>
      </div>

      <div className="space-y-4">
        {filtered.map(w=> (
          <div key={w.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-md font-semibold">{w.title}</h3>
                <div className="text-sm text-gray-600">{w.category}</div>
              </div>
              <div className="text-sm text-gray-500">Sample</div>
            </div>
            <p className="mt-3 text-sm text-gray-700">{w.summary}</p>
            <div className="mt-4 flex gap-2">
              <button className="px-3 py-1 border rounded">Open</button>
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
