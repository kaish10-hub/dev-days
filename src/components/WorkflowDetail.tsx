import React from 'react'
import { ExternalLink, FileText, MapPin } from 'lucide-react'

type Workflow = {
  id: string
  title: string
  category: string
  demo?: boolean
  region?: string
  summary?: string
  authority?: string
  required?: string[]
  optional?: string[]
  source?: string
}

export default function WorkflowDetail({w}:{w:Workflow | null}){
  if(!w) return <div className="card">Select a workflow to see details.</div>

  return (
    <div className="card">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold mb-1">{w.title}</h2>
          <div className="text-sm text-gray-600 mb-3">{w.summary}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Jurisdiction</h3>
              <div className="text-sm text-gray-700 flex items-center gap-2"><MapPin size={14}/> {w.region || 'N/A'}</div>
            </div>

            <div>
              <h3 className="font-medium">Authority</h3>
              <div className="text-sm text-gray-700 flex items-center gap-2"><FileText size={14}/> {w.authority || 'N/A'}</div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-medium">Required documents</h3>
            <ul className="mt-2 text-sm text-gray-700 list-disc pl-5">
              {(w.required || ['Proof of identity (sample)', 'Application form (sample)']).map((d,i)=>(<li key={i}>{d}</li>))}
            </ul>
          </div>

          <div className="mt-4">
            <h3 className="font-medium">Optional documents</h3>
            <ul className="mt-2 text-sm text-gray-700 list-disc pl-5">
              {(w.optional || ['Photograph (sample)']).map((d,i)=>(<li key={i}>{d}</li>))}
            </ul>
          </div>

          <div className="mt-4 text-sm">
            <a href={w.source || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-600">
              <ExternalLink size={14} /> Official source (demo)
            </a>
            <div className="mt-2 text-xs text-gray-500">This is demo data and should be verified against official sources before submission.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
