import type { Requirement, WorkflowConfig } from '../lib/checklist'

export const workflowConfigs: Record<string, WorkflowConfig> = {
  'college-counselling-demo': {
    id: 'college-counselling-demo',
    name: 'College Counselling (Demo)',
    demo: true,
    requirements: [
      { id: 'id-proof', label: 'ID Proof', required: true, types: ['Passport','Aadhar','Passport Copy','image','pdf'] },
      { id: 'application-form', label: 'Application Form', required: true, types: ['College Form','pdf'] },
      { id: 'photo', label: 'Passport Photo', required: false, types: ['Photo','image'] },
      { id: 'marksheet', label: 'Latest Marksheet', required: true, types: ['Marksheet','pdf'], alternatives: ['transcript'] }
    ],
    outputOrder: ['id-proof','application-form','marksheet','photo']
  },

  'delhi-income-demo': {
    id: 'delhi-income-demo',
    name: 'Delhi Income Certificate (Demo)',
    demo: true,
    requirements: [
      { id: 'id-proof', label: 'ID Proof', required: true, types: ['Aadhar','Passport','image','pdf'] },
      { id: 'address-proof', label: 'Address Proof', required: true, types: ['Utility Bill','Address Document','pdf'] },
      { id: 'income-proof', label: 'Income Proof', required: true, types: ['Salary Slip','Income Certificate','pdf'], conditionalOn: 'is-salaried' }
    ],
    outputOrder: ['id-proof','address-proof','income-proof']
  },

  'scholarship-demo': {
    id: 'scholarship-demo',
    name: 'Scholarship Application (Demo)',
    demo: true,
    requirements: [
      { id: 'id-proof', label: 'ID Proof', required: true, types: ['Aadhar','Passport','image','pdf'] },
      { id: 'eligibility-proof', label: 'Eligibility Proof (E.g., marks or income)', required: true, types: ['Marksheet','Income Certificate','pdf'], alternatives: ['transcript'] },
      { id: 'letter-of-recommendation', label: 'Letter of Recommendation', required: false, types: ['pdf'] }
    ],
    outputOrder: ['id-proof','eligibility-proof','letter-of-recommendation']
  }
}
