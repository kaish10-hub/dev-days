import { describe, it, expect } from 'vitest'
import { matchUploadsToWorkflow, WorkflowConfig, UploadItem } from '../lib/checklist'

const sampleConfig: WorkflowConfig = {
  id: 'sample',
  name: 'Sample',
  requirements: [
    { id: 'id-proof', label: 'ID', required: true, types: ['Aadhar','Passport','pdf'] },
    { id: 'form', label: 'Form', required: true, types: ['College Form','pdf'] },
    { id: 'photo', label: 'Photo', required: false, types: ['Photo','image'] }
  ]
}

describe('checklist matching', ()=>{
  it('matches uploads by assigned type', ()=>{
    const uploads: UploadItem[] = [
      { id: 'u1', fileName: 'aadhar.pdf', type: 'Aadhar', size: 100 },
      { id: 'u2', fileName: 'form.pdf', type: 'College Form', size: 200 }
    ]
    const res = matchUploadsToWorkflow(sampleConfig, uploads)
    const idReq = res.find(r=> r.requirement.id==='id-proof')
    const formReq = res.find(r=> r.requirement.id==='form')

    expect(idReq?.status).toBe('satisfied')
    expect(formReq?.status).toBe('satisfied')
  })

  it('marks missing required docs', ()=>{
    const uploads: UploadItem[] = []
    const res = matchUploadsToWorkflow(sampleConfig, uploads)
    const missing = res.filter(r=> r.status==='missing')
    expect(missing.length).toBe(2) // id and form
  })

  it('leaves unmatched uploads as needs-review', ()=>{
    const uploads: UploadItem[] = [ { id:'u1', fileName:'random.png', type:'random-type', size:50 } ]
    const res = matchUploadsToWorkflow(sampleConfig, uploads)
    const review = res.find(r=> r.requirement.id==='needs-review')
    expect(review).toBeTruthy()
    expect(review?.matched?.length).toBe(1)
  })

  it('does not let one file satisfy multiple requirements', ()=>{
    const uploads: UploadItem[] = [ { id:'u1', fileName:'one.pdf', type:'pdf', size:100 } ]
    const res = matchUploadsToWorkflow(sampleConfig, uploads)
    const satisfied = res.filter(r=> r.status==='satisfied')
    // Only the first requirement should be satisfied by the pdf; form remains missing
    expect(satisfied.length).toBe(1)
  })
})
