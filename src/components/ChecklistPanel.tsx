import React from 'react'
import type { UploadItem } from '../lib/checklist'
import { matchUploadsToWorkflow } from '../lib/checklist'
import type { WorkflowConfig } from '../lib/checklist'

type Props = {
  uploads: UploadItem[]
  workflow?: WorkflowConfig | null
  onUseUpload?: (reqId:string, uploadId:string)=>void
  onUploadNew?: (reqId:string)=>void
}

export default function ChecklistPanel({uploads, workflow, onUseUpload, onUploadNew}:Props){
  if(!workflow) return <div className="card">Select a workflow to view checklist.</div>

  const results = matchUploadsToWorkflow(workflow, uploads)

  const required = results.filter(r=> r.requirement.required)
  const optional = results.filter(r=> !r.requirement.required && r.requirement.id!=='needs-review')
  const review = results.find(r=> r.requirement.id==='needs-review')

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-3">Smart Checklist</h3>

      <div className="mb-4">
        <h4 className="font-medium">Required</h4>
        <ul className="mt-2 space-y-2">
          {required.map(r=> (
            <li key={r.requirement.id} className="p-2 border rounded flex items-start justify-between">
              <div>
                <div className="font-medium">{r.requirement.label} {r.status==='satisfied' ? <span className="ml-2 text-sm text-green-700">Satisfied</span> : (r.status==='missing' ? <span className="ml-2 text-sm text-red-700">Missing</span> : <span className="ml-2 text-sm text-yellow-700">{r.status}</span>)}</div>
                <div className="text-sm text-gray-600">{r.explanation}</div>
                {r.matched && r.matched.length>0 && (
                  <ul className="mt-2 text-sm">
                    {r.matched.map(m=> (<li key={m.id}>{m.fileName} • {(m.size/1024).toFixed(1)} KB</li>))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={()=>onUploadNew && onUploadNew(r.requirement.id)} className="px-3 py-1 border rounded text-sm">Upload</button>
                {uploads.length>0 && uploads.map(u=> (
                  <button key={u.id} onClick={()=>onUseUpload && onUseUpload(r.requirement.id, u.id)} className="text-sm text-left px-2 py-1 border rounded">Use: {u.fileName}</button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <h4 className="font-medium">Optional</h4>
        <ul className="mt-2 space-y-2">
          {optional.map(r=> (
            <li key={r.requirement.id} className="p-2 border rounded">
              <div className="font-medium">{r.requirement.label} <span className="text-sm text-gray-600">(Optional)</span></div>
              <div className="text-sm text-gray-600">{r.explanation}</div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="font-medium">Needs review</h4>
        <div className="mt-2 text-sm text-gray-600">{review ? review.explanation : 'No items need manual review.'}</div>
        {review && review.matched && (
          <ul className="mt-2 text-sm">
            {review.matched.map(m=> (<li key={m.id}>{m.fileName} • {(m.size/1024).toFixed(1)} KB</li>))}
          </ul>
        )}
      </div>
    </div>
  )
}
