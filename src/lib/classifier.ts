// Pure and side-effecting helpers for document classification.
// Uses text-based rules (classifyText) and image OCR via tesseract.js when available.

import { inferTypeFromMime } from './checklist'

export type ClassifyResult = {
  suggested?: string | null
  confidence?: number // 0..100
  explanation?: string
}

// Keyword rules map: keyword -> suggested type and weight
const RULES: { keywords: string[]; type: string }[] = [
  { type: 'academic-marksheet', keywords: ['marksheet','mark sheet','percentage','grade','CGPA','semester','board of'] },
  { type: 'identity-proof', keywords: ['aadhar','aadhaar','identity','id no','passport','pan','voter'] },
  { type: 'income-certificate', keywords: ['income','salary','employer','pay slip','payslip','income certificate'] },
  { type: 'caste-certificate', keywords: ['caste','scheduled caste','scheduled tribe','othcaste'] },
  { type: 'domicile-certificate', keywords: ['domicile','resident','residence','address proof'] },
  { type: 'bank-proof', keywords: ['ifsc','account','bank','account no','account number','bank statement'] },
  { type: 'passport-photo', keywords: ['photo','passport size','passport-size','passportphoto'] }
]

// classifyText: analyze extracted text and filename to suggest type
export function classifyText(text: string, fileName?: string): ClassifyResult{
  const lowered = (text||'').toLowerCase()
  const name = (fileName||'').toLowerCase()
  const scores: Record<string,number> = {}

  function addScore(type:string, amount:number){ scores[type] = (scores[type]||0) + amount }

  // filename signals (smaller weight)
  for(const rule of RULES){
    for(const k of rule.keywords){
      if(name.includes(k)) addScore(rule.type, 1)
    }
  }

  // text signals (higher weight)
  for(const rule of RULES){
    for(const k of rule.keywords){
      const re = new RegExp(`\\b${k.replace(/\s+/g,'\\s+')}\\b`, 'i')
      if(re.test(lowered)) addScore(rule.type, 5)
    }
  }

  // simple fallback: look for numeric identifiers patterns
  if(/\b\d{4,}\b/.test(lowered)){
    addScore('identity-proof', 1)
  }

  // choose top score
  const entries = Object.entries(scores).sort((a,b)=> b[1]-a[1])
  if(entries.length===0) return { suggested: null, confidence: 0, explanation: 'No textual signals found' }

  const [bestType, bestScore] = entries[0]
  const total = entries.reduce((s,[,v])=>s+v,0)
  const confidence = Math.min(95, Math.round((bestScore/ (total || 1)) * 100))
  const explanation = `Detected keywords supporting: ${bestType} (score ${bestScore}) from ${entries.length} candidates.`
  return { suggested: bestType, confidence, explanation }
}

// attempt to OCR an image using tesseract.js when available; returns extracted text or empty on failure
export async function ocrImageFile(file: File, options: { signal?: AbortSignal } = {}): Promise<{ text: string, error?: string }>{
  let worker: any = null
  let aborted = false
  try{
    // dynamically import tesseract to keep tests fast when not used
    const { createWorker } = await import('tesseract.js')
    worker = await createWorker({ logger: ()=>{} })
    await worker.load()
    await worker.loadLanguage('eng')
    await worker.initialize('eng')

    // attach abort listener to terminate worker if needed
    const onAbort = () => {
      aborted = true
      try{ worker?.terminate?.() }catch(_){ }
    }
    if(options.signal){
      if(options.signal.aborted){
        onAbort()
        return { text: '', error: 'aborted' }
      }
      options.signal.addEventListener('abort', onAbort)
    }

    const arrayBuffer = await file.arrayBuffer()
    if(aborted){
      await worker.terminate()
      return { text: '', error: 'aborted' }
    }

    // tesseract accepts Blob/URL/ArrayBuffer; pass Buffer
    const { data: { text } } = await worker.recognize(new Uint8Array(arrayBuffer))
    await worker.terminate()
    if(options.signal) options.signal.removeEventListener('abort', onAbort)
    return { text }
  }catch(err:any){
    try{ if(worker) await worker.terminate() }catch(_){ }
    return { text: '', error: String(err?.message || err) }
  }
}

// quick PDF embedded-text scan: try to find readable ascii sequences within the binary
export async function extractTextFromPDFBuffer(buf: ArrayBuffer): Promise<string>{
  try{
    const s = new TextDecoder('utf-8', { fatal: false }).decode(buf)
    // find long runs of letters and spaces
    const matches = s.match(/[A-Za-z0-9\s]{30,}/g)
    if(matches && matches.length>0){
      return matches.slice(0,3).join('\n')
    }
    return ''
  }catch(_){
    return ''
  }
}

// OCR a (scanned) PDF by rendering pages with pdfjs and running OCR on rendered images
export async function ocrPDFFile(file: File, options: { pageLimit?: number, signal?: AbortSignal } = {}): Promise<{ text: string, error?: string }>{
  const pageLimit = options.pageLimit ?? 2
  try{
    const arrayBuffer = await file.arrayBuffer()
    // try to import pdfjs
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf')
    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
    const total = Math.min(doc.numPages, pageLimit)
    let combinedText = ''
    for(let i=1;i<=total;i++){
      if(options.signal?.aborted) return { text: combinedText, error: 'aborted' }
      const page = await doc.getPage(i)
      // try to get selectable text first
      try{
        const content = await page.getTextContent()
        const strs = content.items.map((it:any)=> (it.str || '')).join(' ')
        if(strs && strs.trim().length>20){
          combinedText += strs + '\n'
          continue
        }
      }catch(_){
        // ignore and fallback to rendering
      }

      // render page to canvas if environment allows
      const viewport = page.getViewport({ scale: 1.5 })
      let canvas: any = null
      let ctx: any = null
      if(typeof OffscreenCanvas !== 'undefined'){
        canvas = new OffscreenCanvas(viewport.width, viewport.height)
        ctx = canvas.getContext('2d')
      } else if(typeof document !== 'undefined'){
        canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        ctx = canvas.getContext('2d')
      }
      if(!canvas || !ctx){
        // Cannot render in this environment; skip
        continue
      }
      await page.render({ canvasContext: ctx, viewport }).promise
      // convert canvas to blob
      let blob: Blob | null = null
      if((canvas as OffscreenCanvas).convertToBlob){
        blob = await (canvas as OffscreenCanvas).convertToBlob()
      } else if(canvas.toBlob){
        blob = await new Promise<Blob | null>((res)=> canvas.toBlob((b:any)=> res(b)))
      }
      if(blob){
        const imgFile = new File([blob], `${file.name}-page-${i}.png`, { type: blob.type })
        const ocr = await ocrImageFile(imgFile, { signal: options.signal })
        if(ocr.error) return { text: combinedText, error: ocr.error }
        combinedText += (ocr.text || '') + '\n'
      }
      // release canvas
      try{ if(canvas && 'width' in canvas){ canvas.width = 0; canvas.height = 0 } }catch(_){ }
    }
    return { text: combinedText }
  }catch(err:any){
    return { text: '', error: String(err?.message || err) }
  }
}

export type ClassifyOptions = { ocr?: boolean, pageLimit?: number, signal?: AbortSignal }

// classifyFile: extract text where possible, run classifyText rules; uses OCR for images and scanned PDFs when ocr=true
export async function classifyFile(file: File, options: ClassifyOptions = { ocr: true, pageLimit: 2 }): Promise<ClassifyResult & { extracted?: string | null }>{
  const mime = file.type || ''
  let extracted: string | null = null
  if(mime.startsWith('image/')){
    if(options.ocr){
      const { text, error } = await ocrImageFile(file, { signal: options.signal })
      if(error) return { suggested: null, confidence: 0, explanation: `OCR failed: ${error}`, extracted: null }
      extracted = text || ''
      const r = classifyText(extracted, file.name)
      return { ...r, extracted }
    } else {
      return { suggested: null, confidence: 0, explanation: 'OCR disabled', extracted: null }
    }
  }

  if(mime === 'application/pdf'){
    const sizeLimit = 10 * 1024 * 1024 // 10MB default
    const buf = await file.arrayBuffer()
    if(buf.byteLength > sizeLimit){
      // avoid processing very large PDFs
      const r = classifyText('', file.name)
      return { ...r, confidence: r.confidence > 0 ? Math.min(40, r.confidence) : 0, explanation: r.explanation + ' (file too large for OCR; using filename heuristics)', extracted: null }
    }

    // first try embedded selectable text
    const embedded = await extractTextFromPDFBuffer(buf)
    if(embedded && embedded.trim().length>20){
      const r = classifyText(embedded, file.name)
      return { ...r, extracted: embedded }
    }

    // no embedded text; if OCR enabled, attempt pdf render + OCR
    if(options.ocr){
      const { text, error } = await ocrPDFFile(file, { pageLimit: options.pageLimit, signal: options.signal })
      if(error) return { suggested: null, confidence: 0, explanation: `PDF OCR failed: ${error}`, extracted: null }
      if(text && text.trim().length>20){
        const r = classifyText(text, file.name)
        return { ...r, extracted: text }
      }
      // OCR returned little; fall back to filename heuristics but mark low confidence and explain
      const r = classifyText('', file.name)
      return { ...r, confidence: r.confidence > 0 ? Math.min(40, r.confidence) : 0, explanation: r.explanation + ' (OCR produced no usable text; using filename heuristics)', extracted: null }
    }

    // OCR disabled; rely on filename heuristics (low confidence)
    const r = classifyText('', file.name)
    return { ...r, confidence: r.confidence > 0 ? Math.min(40, r.confidence) : 0, explanation: r.explanation + ' (OCR disabled; filename heuristics)', extracted: null }
  }

  // unknown mime: try filename heuristics
  const r = classifyText('', file.name)
  return { ...r, extracted: null }
}
