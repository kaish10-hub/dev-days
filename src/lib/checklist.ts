export type Requirement = {
  id: string
  label: string
  required: boolean
  types: string[] // allowed type labels
  alternatives?: string[]
  conditionalOn?: string | null // e.g., a condition key
}

export type WorkflowConfig = {
  id: string
  name: string
  demo?: boolean
  requirements: Requirement[]
  outputOrder?: string[]
}

export type UploadItem = {
  id: string
  fileName: string
  type: string // assigned type label or 'pdf'/'image' etc
  size: number
  mime?: string
}

export type RequirementStatus = 'satisfied' | 'missing' | 'optional' | 'needs-review' | 'conditional'

export type MatchResult = {
  requirement: Requirement
  status: RequirementStatus
  matched?: UploadItem[]
  explanation?: string
}

export type MatchOptions = {
  assignments?: Record<string,string> // requirementId -> uploadId
  conditionConfirmed?: Record<string,boolean | null>
}

// Matching engine: pure functions

export function inferTypeFromMime(mime?:string){
  if(!mime) return 'unknown'
  if(mime === 'application/pdf') return 'pdf'
  if(mime.startsWith('image/')) return 'image'
  return mime
}

// Determine matches without side effects. Rules:
// - A requirement is satisfied if at least one upload item's type matches one of requirement.types or an explicit assignment exists.
// - Alternatives satisfy requirement if present and no primary match.
// - If requirement.conditionalOn is set, mark conditional unless conditionConfirmed provided.
// - Items with unknown types are classified as 'needs-review'.
// - Ensure one upload doesn't silently satisfy multiple unrelated required items: matching is greedy by requirement order; once an item is assigned to satisfy a requirement, it is not used again by other required items unless explicitly assigned to multiple requirements.

export function matchUploadsToWorkflow(config: WorkflowConfig, uploads: UploadItem[], options: MatchOptions = {}): MatchResult[]{
  const { assignments = {}, conditionConfirmed = {} } = options
  const results: MatchResult[] = []
  const remaining = uploads.slice() // mutable copy

  // helper to remove an upload from remaining by id
  function takeUploadById(id:string){
    const idx = remaining.findIndex(u=>u.id===id)
    if(idx!==-1) return remaining.splice(idx,1)[0]
    return undefined
  }

  for(const req of config.requirements){
    // handle conditional requirements
    if(req.conditionalOn){
      const conf = conditionConfirmed[req.conditionalOn]
      if(conf === null || conf === undefined){
        results.push({ requirement: req, status: 'conditional', explanation: 'This requirement is conditional and awaits confirmation.'})
        continue
      }
      if(conf === false){
        // not applicable
        results.push({ requirement: req, status: 'optional', explanation: 'This conditional requirement is marked not applicable.' })
        continue
      }
      // if conf === true, proceed to attempt matching
    }

    const matched: UploadItem[] = []

    // if explicit assignment exists for this requirement, honor it if upload exists
    const assignedUploadId = assignments[req.id]
    if(assignedUploadId){
      const taken = takeUploadById(assignedUploadId)
      if(taken){
        // note: check compatibility
        const compatible = req.types.includes(taken.type) || (req.alternatives && req.alternatives.includes(taken.type))
        matched.push(taken)
        const explanation = compatible ? `Assigned file matched requirement.` : `Assigned file does not match expected types; please reclassify or confirm.`
        results.push({ requirement: req, status: req.required ? 'satisfied' : 'optional', matched: [matched[0]], explanation })
        continue
      } else {
        // assigned but upload not present (maybe removed) — fallthrough to normal matching
      }
    }

    // find exact matches by type label among remaining
    for(let i=0;i<remaining.length;i++){
      const u = remaining[i]
      if(req.types.includes(u.type)){
        matched.push(u)
        remaining.splice(i,1); i--
      }
    }

    // if no matched and alternatives exist, try alternatives
    if(matched.length===0 && req.alternatives && req.alternatives.length>0){
      for(let i=0;i<remaining.length;i++){
        const u = remaining[i]
        if(req.alternatives!.some(a=> a === u.type || req.types.includes(u.type))){
          matched.push(u)
          remaining.splice(i,1); i--
        }
      }
    }

    if(matched.length>0){
      results.push({ requirement: req, status: req.required ? 'satisfied' : 'optional', matched, explanation: `Matched ${matched.length} uploaded file(s).` })
    } else {
      results.push({ requirement: req, status: req.required ? 'missing' : 'optional', explanation: req.required ? 'Required document is missing.' : 'Optional document not provided.' })
    }
  }

  // Any leftover uploads that weren't matched: mark as needs-review
  if(remaining.length>0){
    const pseudo: Requirement = { id: 'needs-review', label: 'Needs review', required: false, types: [] }
    results.push({ requirement: pseudo, status: 'needs-review', matched: remaining, explanation: 'These uploads could not be matched automatically and need review.' })
  }

  return results
}
