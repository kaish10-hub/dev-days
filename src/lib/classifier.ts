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
export async function ocrImageFile(file: File): Promise<{ text: string, error?: string }>{
  try{
    // dynamically import tesseract to keep tests fast when not used
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker({ logger: ()=>{} })
    await worker.load()
    await worker.loadLanguage('eng')
    await worker.initialize('eng')
    const arrayBuffer = await file.arrayBuffer()
    // tesseract accepts Blob/URL/ArrayBuffer; pass Buffer
    const { data: { text } } = await worker.recognize(new Uint8Array(arrayBuffer))
    await worker.terminate()
    return { text }
  }catch(err:any){
    return { text: '', error: String(err?.message || err) }
  }
}

// naive PDF text extract: try to find readable ascii sequences within the binary
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

export type ClassifyOptions = { ocr?: boolean }

// classifyFile: extract text where possible, run classifyText rules; uses OCR for images when ocr=true
export async function classifyFile(file: File, options: ClassifyOptions = { ocr: true }): Promise<ClassifyResult & { extracted?: string | null }>{
  const mime = file.type || ''
  let extracted = ''
  if(mime.startsWith('image/')){
    if(options.ocr){
      const { text, error } = await ocrImageFile(file)
      if(error) return { suggested: null, confidence: 0, explanation: `OCR failed: ${error}`, extracted: null }
      extracted = text || ''
      const r = classifyText(extracted, file.name)
      return { ...r, extracted }
    } else {
      return { suggested: null, confidence: 0, explanation: 'OCR disabled', extracted: null }
    }
  }

  if(mime === 'application/pdf'){
    // attempt naive text extraction from PDF binary
    const buf = await file.arrayBuffer()
    const t = await extractTextFromPDFBuffer(buf)
    if(t && t.trim().length>20){
      const r = classifyText(t, file.name)
      return { ...r, extracted: t }
    }
    // no embedded text found; if OCR enabled, we could try to run OCR on rendered pages — expensive/unsupported here
    // fall back to filename heuristics
    const r = classifyText('', file.name)
    return { ...r, confidence: r.confidence > 0 ? Math.max(10, r.confidence - 20) : 0, explanation: r.explanation + ' (from filename; embedded PDF text not found)', extracted: null }
  }

  // unknown mime: try filename heuristics
  const r = classifyText('', file.name)
  return { ...r, extracted: null }
}
