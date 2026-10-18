import React, {useState} from 'react'

export default function UploadWorkspace(){
  const [files, setFiles] = useState<FileList | null>(null)
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-2">Document Upload Workspace</h2>
      <p className="text-sm text-gray-700 mb-4">Upload and manage documents needed for your applications. Files are sample placeholders in this prototype.</p>

      <label className="block mb-3">
        <span className="sr-only">Choose files</span>
        <input type="file" multiple onChange={(e)=>setFiles(e.target.files)} className="" />
      </label>

      <div className="mt-4">
        <h3 className="font-medium">Selected files</h3>
        <ul className="mt-2 text-sm text-gray-700">
          {files && Array.from(files).map((f,i)=>(<li key={i}>{f.name} — {(f.size/1024).toFixed(1)} KB</li>))}
          {!files && <li className="text-gray-500">No files yet</li>}
        </ul>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="px-4 py-2 bg-[#0f1724] text-white rounded">Upload</button>
        <button className="px-4 py-2 border rounded">Clear</button>
      </div>
    </div>
  )
}
