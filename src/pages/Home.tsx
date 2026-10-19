import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Assignment, Project } from '../lib/types'

type Row = Assignment & { project: Pick<Project, 'title' | 'description'> }

export default function Home() {
  const { profile, signOut } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('assignments')
      .select('*, project:projects(title, description)')
      .order('starts_at', { ascending: true })
      .then(({ data }) => {
        setRows((data as unknown as Row[]) || [])
        setLoading(false)
      })
  }, [])

  const now = Date.now()

  return (
    <div className="min-h-screen">
      <header className="border-b border-vs-border px-4 py-3 flex items-center justify-between">
        <div className="font-semibold">Web Eval</div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-vs-mute">{profile?.email}</span>
          {profile?.role === 'admin' && <Link className="btn-ghost" to="/admin">Admin</Link>}
          <button className="btn-ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <h2 className="text-lg mb-4">Your assignments</h2>
        {loading ? <div className="text-vs-mute">Loading…</div> :
          rows.length === 0 ? <div className="text-vs-mute">Nothing assigned yet.</div> :
          <ul className="space-y-3">
            {rows.map(r => {
              const start = new Date(r.starts_at).getTime()
              const end = new Date(r.ends_at).getTime()
              const open = now >= start && now <= end
              const upcoming = now < start
              const closed = now > end
              return (
                <li key={r.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{r.project.title}</div>
                      <div className="text-xs text-vs-mute mt-1">
                        {new Date(r.starts_at).toLocaleString()} → {new Date(r.ends_at).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      {open && <Link className="btn" to={`/solve/${r.id}`}>Open</Link>}
                      {upcoming && <span className="text-xs text-vs-mute">Not yet open</span>}
                      {closed && <span className="text-xs text-red-400">Closed</span>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        }
      </main>
    </div>
  )
}
