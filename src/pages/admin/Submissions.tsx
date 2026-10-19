import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Submission, Assignment, Project } from '../../lib/types'

type Row = Submission & {
  assignment: Assignment & { project: Pick<Project, 'title'> }
}

export default function Submissions() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('submissions')
      .select('*, assignment:assignments(*, project:projects(title))')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        setRows((data as unknown as Row[]) || [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Submissions</h2>
      {loading ? <div className="text-vs-mute">Loading…</div> :
        rows.length === 0 ? <div className="text-vs-mute">No submissions yet.</div> :
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium">{r.assignment.project.title}</div>
                <div className="text-xs text-vs-mute font-mono">{r.assignment.assignee_email}</div>
                <div className="text-xs text-vs-mute">{new Date(r.submitted_at).toLocaleString()}</div>
              </div>
              <Link className="btn-ghost" to={`/admin/submissions/${r.id}`}>Open</Link>
            </div>
          ))}
        </div>
      }
    </div>
  )
}
