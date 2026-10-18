import { describe, it, expect } from 'vitest'
import { matchUploadsToWorkflow, WorkflowConfig, UploadItem } from '../lib/checklist'
import { workflowConfigs } from '../data/workflowConfigs'

describe('checklist assignments and conditions', ()=>{
  it('honors explicit assignments even if type mismatches', ()=>{
    const cfg = workflowConfigs['college-counselling-demo'] as WorkflowConfig
    const uploads: UploadItem[] = [ { id:'u1', fileName:'weird.xyz', type:'random-type', size:10 } ]
    const res = matchUploadsToWorkflow(cfg, uploads, { assignments: { 'id-proof':'u1' } })
    const idReq = res.find(r=> r.requirement.id==='id-proof')
    expect(idReq).toBeTruthy()
    expect(idReq?.matched?.[0].id).toBe('u1')
    expect(idReq?.explanation).toMatch(/does not match/i)
  })

  it('conditional requirement flows: not confirmed -> conditional', ()=>{
    const cfg = workflowConfigs['delhi-income-demo'] as WorkflowConfig
    const uploads: UploadItem[] = []
    const res = matchUploadsToWorkflow(cfg, uploads, {})
    const incomeReq = res.find(r=> r.requirement.id==='income-proof')
    expect(incomeReq?.status).toBe('conditional')
  })

  it('conditional applies when confirmed true', ()=>{
    const cfg = workflowConfigs['delhi-income-demo'] as WorkflowConfig
    const uploads: UploadItem[] = [ { id:'u1', fileName:'sal.pdf', type:'Salary Slip', size:100 } ]
    const res = matchUploadsToWorkflow(cfg, uploads, { conditionConfirmed: { 'is-salaried': true } })
    const incomeReq = res.find(r=> r.requirement.id==='income-proof')
    expect(incomeReq?.status).toBe('satisfied')
  })

  it('conditional not applicable when false', ()=>{
    const cfg = workflowConfigs['delhi-income-demo'] as WorkflowConfig
    const uploads: UploadItem[] = [ { id:'u1', fileName:'sal.pdf', type:'Salary Slip', size:100 } ]
    const res = matchUploadsToWorkflow(cfg, uploads, { conditionConfirmed: { 'is-salaried': false } })
    const incomeReq = res.find(r=> r.requirement.id==='income-proof')
    expect(incomeReq?.status).toBe('optional')
  })

  it('prevents the same upload silently satisfying two required items', ()=>{
    const cfg = workflowConfigs['scholarship-demo'] as WorkflowConfig
    // craft uploads where one pdf could match multiple
    const uploads: UploadItem[] = [ { id:'u1', fileName:'one.pdf', type:'pdf', size:100 } ]
    const res = matchUploadsToWorkflow(cfg, uploads)
    const satisfied = res.filter(r=> r.status==='satisfied')
    expect(satisfied.length).toBe(1)
  })

  it('workflow switching recalculates matches', ()=>{
    const c1 = workflowConfigs['college-counselling-demo'] as WorkflowConfig
    const c2 = workflowConfigs['scholarship-demo'] as WorkflowConfig
    const uploads: UploadItem[] = [ { id:'u1', fileName:'aadhar.pdf', type:'Aadhar', size:50 } ]
    const r1 = matchUploadsToWorkflow(c1, uploads)
    const r2 = matchUploadsToWorkflow(c2, uploads)
    expect(r1.find(r=> r.requirement.id==='id-proof')?.status).toBe('satisfied')
    expect(r2.find(r=> r.requirement.id==='id-proof')?.status).toBe('satisfied')
  })
})
