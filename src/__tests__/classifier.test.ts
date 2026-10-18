import { describe, it, expect } from 'vitest'
import { classifyText } from '../lib/classifier'

describe('classifier rules (text)', ()=>{
  it('detects marksheet signals', ()=>{
    const txt = 'Board of Education\nSemester Examination\nMarks Obtained: 567/600\nPercentage: 94%'
    const r = classifyText(txt, 'marks.pdf')
    expect(r.suggested).toBe('academic-marksheet')
    expect(r.confidence).toBeGreaterThan(50)
  })

  it('detects identity proof from filename', ()=>{
    const r = classifyText('', 'aadhar_card_scan.pdf')
    expect(r.suggested).toBe('identity-proof')
    expect(r.confidence).toBeGreaterThan(0)
  })

  it('returns unknown when no signals', ()=>{
    const r = classifyText('random gibberish qwerty zxcv', 'file.bin')
    expect(r.suggested).toBeNull()
    expect(r.confidence).toBe(0)
  })
})
