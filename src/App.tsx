import React, {useMemo, useState} from 'react'
import Dashboard from './components/Dashboard'
import WorkflowList from './components/WorkflowList'
import UploadWorkspace from './components/UploadWorkspace'
import WorkflowDetail from './components/WorkflowDetail'
import { workflows } from './data/workflows'
import { BookOpen, Briefcase, FileText, ClipboardList, Folder } from 'lucide-react'

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: BookOpen },
  { key: 'College Counselling', label: 'College Counselling', icon: ClipboardList },
  { key: 'Government Certificates', label: 'Government Certificates', icon: FileText },
  { key: 'Scholarships', label: 'Scholarships', icon: Briefcase },
  { key: 'my-docs', label: 'My Documents', icon: Folder }
]

export default function App(){
  const [category, setCategory] = useState<string | null>(null)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const selectedWorkflow = useMemo(()=> workflows.find(w=>w.id===selectedWorkflowId) || null, [selectedWorkflowId])

  return (
    <div className="min-h-screen bg-offwhite text-navy">
      <div className="max-w-7xl mx-auto flex gap-6 p-6">
        <aside className="w-64 hidden md:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-navy text-white rounded-full p-2 font-semibold">DS</div>
            <div>
              <div className="text-lg font-semibold">DocSaathi</div>
              <div className="text-xs text-gray-500">Document preparation</div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(item=>{
              const Icon = item.icon
              const active = (category===item.key) || (item.key==='dashboard' && category===null && !selectedWorkflowId)
              return (
                <button key={item.key} onClick={()=>{ setCategory(item.key==='dashboard' ? null : item.key); setSelectedWorkflowId(null)}} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded ${active ? 'bg-navy text-white' : 'bg-white border'}`}>
                  <Icon size={16} /> {item.label}
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">Signed in: Demo user</div>
            <div className="flex items-center gap-3">
              <button className="px-3 py-2 border rounded bg-white">Help</button>
              <button className="px-3 py-2 border rounded bg-white">Settings</button>
            </div>
          </header>

          <main>
            {!selectedWorkflowId && category===null && <Dashboard />}

            {!selectedWorkflowId && category!==null && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <h2 className="text-xl font-semibold mb-3">{category}</h2>
                  <WorkflowList category={category} onSelect={(id)=>setSelectedWorkflowId(id)} />
                </div>
                <aside className="md:col-span-1">
                  <div className="card">
                    <h3 className="font-medium mb-2">Quick actions</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li><button className="text-left w-full">+ Start new workflow</button></li>
                      <li><button className="text-left w-full">Upload documents</button></li>
                      <li><button className="text-left w-full">View my documents</button></li>
                    </ul>
                  </div>
                </aside>
              </div>
            )}

            {selectedWorkflowId && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <WorkflowDetail w={selectedWorkflow} />
                </div>
                <aside className="md:col-span-1">
                  <UploadWorkspace preservedWorkflowId={selectedWorkflowId} />
                </aside>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
