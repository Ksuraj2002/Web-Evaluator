import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import CodeEditor from '../../components/CodeEditor'
import Preview from '../../components/Preview'
import ReactPreview from '../../components/ReactPreview'
import type { ProjectAsset, ProjectType, Submission } from '../../lib/types'

type Row = Submission & {
  assignment: {
    assignee_email: string
    project_id: string
    project: { title: string; project_type?: ProjectType }
  }
}

export default function SubmissionView() {
  const { id } = useParams()
  const [row, setRow] = useState<Row | null>(null)
  const [assets, setAssets] = useState<ProjectAsset[]>([])
  const [active, setActive] = useState('index.html')

  useEffect(() => {
    (async () => {
      if (!id) return
      const { data } = await supabase
        .from('submissions')
        .select('*, assignment:assignments(assignee_email, project_id, project:projects(title, project_type))')
        .eq('id', id)
        .maybeSingle()
      if (!data) return
      const r = data as unknown as Row
      setRow(r)
      // Open the main file first, as the student's editor does.
      const names = Object.keys(r.files || {})
      const preferred = r.assignment.project.project_type === 'react'
        ? ['src/App.jsx', 'src/App.tsx', 'App.jsx', 'App.tsx']
        : ['index.html']
      const first = preferred.find(n => names.includes(n)) ?? names[0]
      if (first) setActive(first)
      const { data: a } = await supabase.from('project_assets').select('*').eq('project_id', r.assignment.project_id)
      setAssets((a as ProjectAsset[]) || [])
    })()
  }, [id])

  const files = row?.files || {}
  const names = useMemo(() => Object.keys(files), [files])

  if (!row) return <div className="text-vs-mute">Loading…</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <Link to="/admin/submissions" className="text-vs-mute hover:text-vs-text">← Submissions</Link>
        <span className="font-semibold">{row.assignment.project.title}</span>
        <span className="text-vs-mute font-mono">{row.assignment.assignee_email}</span>
        <span className="ml-auto text-vs-mute">{new Date(row.submitted_at).toLocaleString()}</span>
      </div>

      <div className="flex border border-vs-border rounded overflow-hidden" style={{ height: '72vh' }}>
        <aside className="w-48 border-r border-vs-border bg-vs-sidebar overflow-auto">
          <div className="text-xs uppercase text-vs-mute p-3 pb-1">Files</div>
          <ul>
            {names.map(n => (
              <li key={n}>
                <button
                  className={`w-full text-left text-sm px-3 py-1.5 ${active === n ? 'bg-vs-panel text-vs-text' : 'text-vs-text/80 hover:bg-vs-panel'}`}
                  onClick={() => setActive(n)}
                >{n}</button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="flex-1 min-w-0">
          <CodeEditor file={active} value={files[active] ?? ''} readOnly />
        </section>
        <section className="w-[40%] border-l border-vs-border">
          {row.assignment.project.project_type === 'react'
            ? <ReactPreview files={files} assets={assets} />
            : <Preview files={files} assets={assets} />}
        </section>
      </div>
    </div>
  )
}
