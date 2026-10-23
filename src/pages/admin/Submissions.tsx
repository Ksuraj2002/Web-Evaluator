import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Submission, Assignment, Project, Profile } from '../../lib/types'

type Row = Submission & {
  assignment: Assignment & { project: Pick<Project, 'title'> }
  student: Profile | null
}

export default function Submissions() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    supabase
      .from('submissions')
      // profiles(*) rather than a column list, so a missing optional column
      // (e.g. uid before its migration runs) can't break the list.
      .select('*, assignment:assignments(*, project:projects(title)), student:profiles(*)')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        setRows((data as unknown as Row[]) || [])
        setLoading(false)
      })
  }, [])

  const filtered = q
    ? rows.filter(r => {
        const hay = [
          r.student?.email, r.student?.full_name, r.student?.uid, r.student?.campus,
          r.student?.semester, r.student?.section, r.assignment.project.title,
        ].filter(Boolean).join(' ').toLowerCase()
        return hay.includes(q.toLowerCase())
      })
    : rows

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold">Submissions</h2>
        <input
          className="input max-w-sm ml-auto"
          placeholder="Search name, UID, email, campus, section, project…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      {loading ? <div className="text-vs-mute">Loading…</div> :
        filtered.length === 0 ? <div className="text-vs-mute">No submissions{q ? ' match.' : ' yet.'}</div> :
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium">{r.assignment.project.title}</div>
                <div className="text-sm text-vs-text">
                  {r.student?.full_name || <span className="text-vs-mute">(no name)</span>}
                </div>
                <div className="text-xs text-vs-mute font-mono">{r.student?.email || r.assignment.assignee_email}</div>
                <div className="text-xs text-vs-mute flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {r.student?.uid && <span className="font-mono">UID: {r.student.uid}</span>}
                  {r.student?.campus && <span>Campus: {r.student.campus}</span>}
                  {r.student?.section && <span>Section: {r.student.section}</span>}
                  {r.student?.semester && <span>Sem: {r.student.semester}</span>}
                  {r.auto_collected ? (
                    <span className="text-amber-300" title="The student didn't submit; this is their last autosave, collected after the deadline.">
                      Auto-collected · last saved {new Date(r.submitted_at).toLocaleString()}
                    </span>
                  ) : (
                    <span>Submitted {new Date(r.submitted_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <Link className="btn-ghost" to={`/admin/submissions/${r.id}`}>Open</Link>
            </div>
          ))}
        </div>
      }
    </div>
  )
}
