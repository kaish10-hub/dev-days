import React, {useEffect, useRef, useState} from 'react'
import { X, Download, Image, File } from 'lucide-react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import ChecklistPanel from './ChecklistPanel'
import { workflowConfigs } from '../data/workflowConfigs'

type UploadFile = {
  id: string
  file: File
  url: string
  type: string
  size: number
  status: 'ready' | 'error' | 'uploading' | 'processing' | 'done'
  error?: string
  suggestedType?: string | null
  suggestedConfidence?: number | null
  suggestedExplanation?: string | null
  processingStatus?: 'pending' | 'processing' | 'done' | 'error' | 'skipped'
  manualConfirmed?: boolean
  skipOCR?: boolean
}

const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg']
const MAX_BYTES = 10 * 1024 * 1024 // 10MB
const DOCUMENT_TYPES = ['Passport','Birth Certificate','College Form','Photo','Other']

export default function UploadWorkspace({preservedWorkflowId}:{preservedWorkflowId?:string | null}){
  const [items, setItems] = useState<UploadFile[]>([])
  // assignments: requirementId -> uploadId
  const [assignments, setAssignments] = useState<Record<string,string>>({})
  // conditional confirmations: conditionKey -> true/false/null
  const [conditionConfirmed, setConditionConfirmed] = useState<Record<string,boolean | null>>({})

  // expose a simplified UploadItem shape for the checklist engine
  const uploadItemsForChecklist = items.map(i=> ({ id: i.id, fileName: i.file.name, type: i.type, size: i.size, mime: i.file.type }))
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pendingAssignRef = useRef<string | null>(null) // requirement id awaiting next upload
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [ocrControllers, setOcrControllers] = useState<Record<string, AbortController>>({})

  useEffect(()=> {
    return ()=>{ items.forEach(i=>URL.revokeObjectURL(i.url)) }
  }, [items])

  // optional param to auto-assign the first added file to a requirement
  function addFiles(files: FileList | null, autoAssignReqId?: string){
    if(!files) return
    const arr = Array.from(files)
    const newItems : UploadFile[] = arr.map(f=>{
      const url = URL.createObjectURL(f)
      const ok = ACCEPTED.includes(f.type)
      const tooLarge = f.size > MAX_BYTES
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        file: f,
        url,
        type: ok ? (f.type.startsWith('image') ? 'image' : 'pdf') : 'unknown',
        size: f.size,
        status: ok && !tooLarge ? 'ready' : 'error',
        error: !ok ? 'Unsupported file type' : (tooLarge ? 'File too large (max 10MB)' : undefined)
      }
    })

    setItems(prev=>{
      const combined = [...prev, ...newItems]
      // if autoAssignReqId provided, assign the first new item to that requirement
      if(autoAssignReqId && newItems.length>0){
        const firstNew = newItems[0]
        // prevent duplicate assignment if upload is already assigned
        setAssignments(asg=>{
          const already = Object.values(asg).includes(firstNew.id)
          if(already) return asg
          return { ...asg, [autoAssignReqId]: firstNew.id }
        })
      }
      return combined
    })

    // start classification/OCR for each new item (non-blocking)
    newItems.forEach(it=> processFile(it))
  }

  function onFileChange(e:React.ChangeEvent<HTMLInputElement>){
    // if a pending auto-assign target exists, use it
    const pendingReq = pendingAssignRef.current
    addFiles(e.target.files, pendingReq || undefined)
    pendingAssignRef.current = null
    e.currentTarget.value = ''
  }

  // process a single file: classify/ocr and update item state
  async function processFile(item: UploadFile){
    // skip if manualConfirmed or skipOCR or unsupported mime
    if(item.manualConfirmed || item.skipOCR) return
    const controller = new AbortController()
    setOcrControllers(prev=> ({ ...prev, [item.id]: controller }))
    setItems(prev=> prev.map(p=> p.id===item.id ? {...p, processingStatus: 'processing', status: 'processing', error: undefined, suggestedType: null, suggestedConfidence: null, suggestedExplanation: null,} : p))
    try{
      // dynamically import classifier to avoid loading heavy libs earlier
      const { classifyFile } = await import('../lib/classifier')
      const res = await classifyFile(item.file, { ocr: true, pageLimit: 2, signal: controller.signal })
      if(controller.signal.aborted){
        setItems(prev=> prev.map(p=> p.id===item.id ? {...p, processingStatus: 'error', status: 'error', error: 'aborted'} : p))
        setOcrControllers(prev=>{ const c = {...prev}; delete c[item.id]; return c })
        return
      }
      setItems(prev=> prev.map(p=> p.id===item.id ? {...p, processingStatus: 'done', status: 'ready', suggestedType: res.suggested || null, suggestedConfidence: res.confidence || null, suggestedExplanation: res.explanation || null} : p))
      setOcrControllers(prev=>{ const c = {...prev}; delete c[item.id]; return c })
    }catch(err:any){
      setItems(prev=> prev.map(p=> p.id===item.id ? {...p, processingStatus: 'error', status: 'error', error: String(err?.message || err)} : p))
      setOcrControllers(prev=>{ const c = {...prev}; delete c[item.id]; return c })
    }
  }

  function onDrop(e:React.DragEvent){
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  // assign an existing upload to a requirement
  function assignUploadToRequirement(reqId:string, uploadId:string){
    // prevent duplicate usage unless explicitly allowed: disallow if upload already assigned
    const alreadyAssigned = Object.entries(assignments).find(([k,v])=> v===uploadId)
    if(alreadyAssigned && alreadyAssigned[0] !== reqId){
      setMessage('This upload is already assigned to another requirement. Reassigning is required to reuse.')
      return
    }
    setAssignments(prev=> ({ ...prev, [reqId]: uploadId }))
  }

  // trigger file picker and auto-assign next selected file to reqId
  function triggerUploadForRequirement(reqId:string){
    pendingAssignRef.current = reqId
    fileInputRef.current?.click()
  }

  function onAssignFromSelect(reqId:string, uploadId:string){
    if(!uploadId) return
    assignUploadToRequirement(reqId, uploadId)
  }

  function onConfirmCondition(conditionKey:string, value:boolean | null){
    setConditionConfirmed(prev=> ({ ...prev, [conditionKey]: value }))
  }

  function removeItem(id:string){
    setItems(prev=>{
      const found = prev.find(p=>p.id===id)
      if(found) URL.revokeObjectURL(found.url)
      return prev.filter(p=>p.id!==id)
    })
    // remove any assignment referencing this upload
    setAssignments(prev=>{
      const copy = {...prev}
      for(const k of Object.keys(copy)){
        if(copy[k]===id) delete copy[k]
      }
      return copy
    })
  }

  function onTypeChange(id:string, type:string){
    setItems(prev=>prev.map(p=> p.id===id ? {...p, file: p.file, type, manualConfirmed: true} : p))
  }

  function acceptSuggestion(id:string){
    setItems(prev=> prev.map(p=> p.id===id ? {...p, type: p.suggestedType || p.type, manualConfirmed: true} : p))
  }
  function rejectSuggestion(id:string){
    setItems(prev=> prev.map(p=> p.id===id ? {...p, suggestedType: null, suggestedConfidence: null, suggestedExplanation: null} : p))
  }

  function cancelOcrFor(id:string){
    const ctrl = ocrControllers[id]
    if(ctrl) ctrl.abort()
    setOcrControllers(prev=>{ const c = {...prev}; delete c[id]; return c })
    setItems(prev=> prev.map(p=> p.id===id ? {...p, processingStatus: 'skipped', status: 'ready'} : p))
  }

  function onDragStart(e:React.DragEvent, idx:number){
    e.dataTransfer.setData('text/plain', String(idx))
  }
  function onDragOver(e:React.DragEvent){ e.preventDefault() }
  function onDropReorder(e:React.DragEvent, idx:number){
    e.preventDefault()
    const from = Number(e.dataTransfer.getData('text/plain'))
    if(Number.isNaN(from)) return
    setItems(prev=>{
      const copy = prev.slice()
      const [item] = copy.splice(from,1)
      copy.splice(idx,0,item)
      return copy
    })
  }

  async function downloadCombined(){
    setBusy(true); setMessage(null)
    try{
      const pdfDoc = await PDFDocument.create()
      for(const it of items){
        if(it.type==='pdf' && it.file.type==='application/pdf'){
          const arr = await it.file.arrayBuffer()
          const donor = await PDFDocument.load(arr)
          const copied = await pdfDoc.copyPages(donor, donor.getPageIndices())
          copied.forEach(p=> pdfDoc.addPage(p))
        } else if(it.type==='image'){
          const imgBytes = await it.file.arrayBuffer()
          const mime = it.file.type
          let img
          if(mime==='image/png') img = await pdfDoc.embedPng(imgBytes)
          else img = await pdfDoc.embedJpg(imgBytes)
          const page = pdfDoc.addPage([img.width, img.height])
          page.drawImage(img, { x:0, y:0, width: img.width, height: img.height })
        }
      }
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], {type:'application/pdf'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DocSaathi-sequence-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMessage('Combined PDF prepared for download')
    }catch(err:any){
      console.error(err)
      setMessage('Failed to create combined PDF')
    }finally{ setBusy(false) }
  }

  return (
    <div className="card">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Document Upload</h2>
        <div className="text-xs text-gray-500">Demo mode — verify official requirements</div>
      </div>

      <div onDragOver={(e)=>{e.preventDefault(); setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={onDrop} className={`mb-3 p-4 rounded border-dashed ${dragOver ? 'border-2 border-blue-400 bg-blue-50' : 'border'} `}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded"><Image size={20} /></div>
          <div className="flex-1">
            <div className="text-sm text-gray-700">Drop PDF, PNG, JPG here or</div>
            <div className="mt-2">
              <input ref={fileInputRef} onChange={onFileChange} aria-label="Choose files" type="file" multiple className="hidden" accept=".pdf,image/png,image/jpeg" />
              <button onClick={()=>fileInputRef.current?.click()} className="px-3 py-2 border rounded bg-white">Choose files</button>
              <span className="ml-3 text-xs text-gray-500">Max file size 10MB</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.length===0 && <div className="text-sm text-gray-500">No files uploaded yet.</div>}

        {items.map((it, idx)=> (
          <div key={it.id} draggable onDragStart={(e)=>onDragStart(e, idx)} onDragOver={onDragOver} onDrop={(e)=>onDropReorder(e, idx)} className="flex items-center gap-3 p-3 bg-white rounded">
            <div className="w-14 h-14 flex items-center justify-center bg-gray-50 rounded overflow-hidden border">
              {it.type==='image' ? <img src={it.url} alt={it.file.name} className="object-cover w-full h-full" /> : <File size={28} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{it.file.name}</div>
                  <div className="text-xs text-gray-500">{(it.size/1024).toFixed(1)} KB • {it.file.type || 'unknown'}</div>
                </div>
                <div className="text-xs text-gray-500">{it.status==='error' ? <span className="text-red-600">{it.error}</span> : it.status}</div>
              </div>

              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <select aria-label="Assign document type" value={it.type} onChange={(e)=>onTypeChange(it.id, e.target.value)} className="px-2 py-1 border rounded text-sm">
                    <option value="image">Image</option>
                    <option value="pdf">PDF</option>
                    {DOCUMENT_TYPES.map(dt=> (<option key={dt} value={dt}>{dt}</option>))}
                  </select>

                  <button onClick={()=>window.open(it.url,'_blank')} className="px-2 py-1 border rounded text-sm bg-white">Preview</button>
                  <button onClick={()=>removeItem(it.id)} className="px-2 py-1 border rounded text-sm text-red-600"><X size={14} /></button>
                </div>

                <div className="mt-2 text-sm text-gray-600">
                  {it.processingStatus === 'processing' && (
                    <div className="flex items-center gap-2">Processing: OCR running <button onClick={()=>cancelOcrFor(it.id)} className="ml-2 text-xs underline">Cancel</button></div>
                  )}
                  {it.processingStatus === 'done' && it.suggestedType && !it.manualConfirmed && (
                    <div className="flex items-center gap-3">
                      <div className="text-xs">Suggestion: <strong>{it.suggestedType}</strong> {it.suggestedConfidence ? `(${Math.round(it.suggestedConfidence*100)}%)` : ''}</div>
                      <button onClick={()=>acceptSuggestion(it.id)} className="px-2 py-1 bg-[#0f1724] text-white rounded text-xs">Accept</button>
                      <button onClick={()=>rejectSuggestion(it.id)} className="px-2 py-1 border rounded text-xs">Reject</button>
                    </div>
                  )}

                  {it.processingStatus === 'error' && (
                    <div className="text-xs text-red-600">OCR failed: {it.error}</div>
                  )}

                  {it.suggestedExplanation && (
                    <div className="text-xs text-gray-500 mt-1">{it.suggestedExplanation}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={downloadCombined} disabled={items.length===0 || busy} className="px-4 py-2 bg-[#0f1724] text-white rounded flex items-center gap-2">
          <Download size={16} /> {busy ? 'Preparing...' : 'Download Combined PDF'}
        </button>

        <button onClick={()=>{ setItems([]); setAssignments({}); setMessage(null) }} className="px-4 py-2 border rounded">Clear</button>
      </div>

      {message && <div className="mt-3 text-sm text-gray-700">{message}</div>
        }
    </div>

        <aside>
          <ChecklistPanel
            uploads={uploadItemsForChecklist}
            workflow={preservedWorkflowId ? workflowConfigs[preservedWorkflowId] : null}
            assignments={assignments}
            conditionConfirmed={conditionConfirmed}
            onUploadNew={(reqId)=> triggerUploadForRequirement(reqId)}
            onAssign={(reqId, uploadId)=> onAssignFromSelect(reqId, uploadId)}
            onConfirmCondition={(conditionKey, value)=> onConfirmCondition(conditionKey, value)}
          />
        </aside>
      </div>

      {/* Render checklist below (for small screens) */}
      <div className="mt-4 md:hidden">
        <ChecklistPanel
          uploads={uploadItemsForChecklist}
          workflow={preservedWorkflowId ? workflowConfigs[preservedWorkflowId] : null}
          assignments={assignments}
          conditionConfirmed={conditionConfirmed}
          onUploadNew={(reqId)=> triggerUploadForRequirement(reqId)}
          onAssign={(reqId, uploadId)=> onAssignFromSelect(reqId, uploadId)}
          onConfirmCondition={(conditionKey, value)=> onConfirmCondition(conditionKey, value)}
        />
      </div>
    </div>
  )
}
