import React, {useState} from 'react'
import Dashboard from './components/Dashboard'
import WorkflowList from './components/WorkflowList'
import UploadWorkspace from './components/UploadWorkspace'

const tabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'workflows', label: 'Workflows' },
  { key: 'upload', label: 'Upload' }
]

export default function App(){
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="min-h-screen">
      <nav className="max-w-6xl mx-auto py-6 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#0f1724] text-white rounded-full p-2 font-bold">DS</div>
          <h1 className="text-xl font-semibold">DocSaathi</h1>
        </div>
        <div className="flex gap-3">
          {tabs.map(t=> (
            <button key={t.key} onClick={()=>setTab(t.key)} className={`px-4 py-2 rounded-md ${tab===t.key ? 'bg-[#0f1724] text-white' : 'bg-white border'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4">
        {tab==='dashboard' && <Dashboard />}
        {tab==='workflows' && <WorkflowList />}
        {tab==='upload' && <UploadWorkspace />}
      </main>
    </div>
  )
}
