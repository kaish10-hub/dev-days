import React from 'react'
import type { UploadItem, MatchResult, WorkflowConfig } from '../lib/checklist'
import { matchUploadsToWorkflow } from '../lib/checklist'

type Props = {
  uploads: UploadItem[]
  workflow?: WorkflowConfig | null
  assignments?: Record<string,string>
  conditionConfirmed?: Record<string,boolean | null>
  onUseUpload?: (reqId:string, uploadId:string)=>void
  onUploadNew?: (reqId:string)=>void
  onAssign?: (reqId:string, uploadId:string)=>void
  onConfirmCondition?: (conditionKey:string, value:boolean|null)=>void
}

export default function ChecklistPanel({uploads, workflow, assignments = {}, conditionConfirmed = {}, onUseUpload, onUploadNew, onAssign, onConfirmCondition}:Props){
  if(!workflow) return <div className="card">Select a workflow to view checklist.</div>

  const results: MatchResult[] = matchUploadsToWorkflow(workflow, uploads, { assignments, conditionConfirmed })

  const requiredResults = results.filter(r=> r.requirement.required)
  const optional = results.filter(r=> !r.requirement.required && r.requirement.id!=='needs-review')
  const review = results.find(r=> r.requirement.id==='needs-review')

  // progress: count applicable required and satisfied
  const applicableRequired = requiredResults.filter(r=> !(r.requirement.conditionalOn && (conditionConfirmed[r.requirement.conditionalOn]===null || conditionConfirmed[r.requirement.conditionalOn]===undefined || conditionConfirmed[r.requirement.conditionalOn]===false)))
  const satisfiedCount = applicableRequired.filter(r=> r.status==='satisfied').length
  const totalRequired = applicableRequired.length
  const percent = totalRequired===0 ? 0 : Math.round((satisfiedCount/totalRequired)*100)

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-3">Smart Checklist</h3>

      <div className="mb-3">
        <div className="text-sm text-gray-600">Progress: <strong>{satisfiedCount}</strong> of <strong>{totalRequired}</strong> required matched</div>
        <div className="w-full bg-gray-200 h-2 rounded mt-2 overflow-hidden">
          <div style={{width: `${percent}%`}} className="h-2 bg-navy" />
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-medium">Required</h4>
        <ul className="mt-2 space-y-2">
          {requiredResults.map(r=> (
            <li key={r.requirement.id} className="p-2 border rounded">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{r.requirement.label} {r.status==='satisfied' ? <span className="ml-2 text-sm text-green-700">Satisfied</span> : (r.status==='missing' ? <span className="ml-2 text-sm text-red-700">Missing</span> : <span className="ml-2 text-sm text-yellow-700">{r.status}</span>)}</div>
                  <div className="text-sm text-gray-600">{r.explanation}</div>

                  {r.matched && r.matched.length>0 && (
                    <ul className="mt-2 text-sm">
                      {r.matched.map(m=> (<li key={m.id}>{m.fileName} • {(m.size/1024).toFixed(1)} KB</li>))}
                    </ul>
                  )}

                  {r.requirement.conditionalOn && (
                    <div className="mt-2 text-sm">
                      <div>Conditional: {r.requirement.conditionalOn}</div>
                      <div className="flex gap-2 mt-1">
                        <button onClick={()=>onConfirmCondition && onConfirmCondition(r.requirement.conditionalOn!, true)} className="px-2 py-1 border rounded text-sm">Applies</button>
                        <button onClick={()=>onConfirmCondition && onConfirmCondition(r.requirement.conditionalOn!, false)} className="px-2 py-1 border rounded text-sm">Does not apply</button>
                        <button onClick={()=>onConfirmCondition && onConfirmCondition(r.requirement.conditionalOn!, null)} className="px-2 py-1 border rounded text-sm">Not sure</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button onClick={()=>onUploadNew && onUploadNew(r.requirement.id)} className="px-3 py-1 border rounded text-sm">Upload</button>

                  <div className="text-sm">
                    <label className="text-xs text-gray-600">Use existing upload</label>
                    <select onChange={(e)=> onAssign && onAssign(r.requirement.id, e.target.value)} className="block mt-1 border rounded text-sm">
                      <option value="">— select —</option>
                      {uploads.map(u=> (
                        <option key={u.id} value={u.id}>{u.fileName}{r.requirement.types.includes(u.type) ? '' : ' (type mismatch)'}</option>
                      ))}
                    </select>
                  </div>
                </div>
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
