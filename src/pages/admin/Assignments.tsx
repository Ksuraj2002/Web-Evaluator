import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Assignment, Project } from '../../lib/types'

type Row = Assignment & { project: Pick<Project, 'title'> }

// local datetime <-> ISO
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// "2h 15m" / "1d 3h" / "45m"
const formatDuration = (a: Date, b: Date) => {
  let ms = b.getTime() - a.getTime()
  if (ms <= 0) return ''
  const d = Math.floor(ms / 86_400_000); ms -= d * 86_400_000
  const h = Math.floor(ms / 3_600_000);  ms -= h * 3_600_000
  const m = Math.floor(ms / 60_000)
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || '< 1m'
}

// Format a datetime-local input value in a clear 12-hour format like
// "Mon, Oct 20, 2026 · 12:15 PM"
const prettyLocal = (v: string) => {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default function Assignments() {
  const [projects, setProjects] = useState<Project[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [projectId, setProjectId] = useState('')
  const [emails, setEmails] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [starts, setStarts] = useState(toLocalInput(new Date().toISOString()))
  const [ends, setEnds] = useState(toLocalInput(new Date(Date.now()+2*3600_000).toISOString()))
  const [busy, setBusy] = useState(false)
  const [filterProject, setFilterProject] = useState('')

  async function load() {
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from('projects').select('id, title').order('created_at', { ascending: false }),
      supabase.from('assignments').select('*, project:projects(title)').order('created_at', { ascending: false }),
    ])
    setProjects((p as Project[]) || [])
    setRows((a as unknown as Row[]) || [])
  }
  useEffect(() => { load() }, [])

  async function create(e: FormEvent) {
    e.preventDefault()
    if (!projectId) return alert('Pick a project')
    const startsISO = new Date(starts).toISOString()
    const endsISO = new Date(ends).toISOString()
    if (new Date(endsISO) <= new Date(startsISO)) return alert('End must be after start')
    setBusy(true)
    if (isPublic) {
      // Delete any existing public row for this project (there can be only one)
      // and any per-email rows, then insert one public row.
      await supabase.from('assignments').delete().eq('project_id', projectId).eq('is_public', true)
      const { error } = await supabase.from('assignments').insert({
        project_id: projectId,
        assignee_email: null,
        is_public: true,
        starts_at: startsISO,
        ends_at: endsISO,
      })
      setBusy(false)
      if (error) return alert(error.message)
    } else {
      const list = emails.split(/[\s,;\n]+/).map(s => s.trim().toLowerCase()).filter(Boolean)
      if (!list.length) { setBusy(false); return alert('Add at least one email, or tick "Publish to everyone"') }
      const payload = list.map(email => ({
        project_id: projectId, assignee_email: email, is_public: false,
        starts_at: startsISO, ends_at: endsISO,
      }))
      // Per-email conflict → update start/end
      for (const row of payload) {
        await supabase.from('assignments').delete()
          .eq('project_id', row.project_id)
          .eq('is_public', false)
          .ilike('assignee_email', row.assignee_email!)
      }
      const { error } = await supabase.from('assignments').insert(payload)
      setBusy(false)
      if (error) return alert(error.message)
      setEmails('')
    }
    load()
  }

  async function remove(id: string) {
    if (!confirm('Remove assignment?')) return
    await supabase.from('assignments').delete().eq('id', id)
    load()
  }

  const shown = filterProject ? rows.filter(r => r.project_id === filterProject) : rows

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <form onSubmit={create} className="card space-y-3 h-fit">
        <h2 className="font-semibold">Assign a project</h2>
        <div>
          <label className="label">Project</label>
          <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)} required>
            <option value="">— pick —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div className="border border-vs-border rounded p-3 bg-vs-bg">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-sm text-vs-text">Publish to everyone</div>
              <div className="text-[11px] text-vs-mute mt-0.5">
                Every signed-in student sees this assignment during the window. No email list needed.
              </div>
            </div>
          </label>
        </div>

        {!isPublic && (
          <div>
            <label className="label">Assignee emails</label>
            <textarea className="input min-h-[100px]" value={emails} onChange={e => setEmails(e.target.value)}
              placeholder="one@example.com, two@example.com&#10;three@example.com" />
            <div className="text-[11px] text-vs-mute mt-1">Separate with commas, spaces, or newlines.</div>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Opens at</label>
              <button
                type="button"
                className="text-[11px] text-vs-accent hover:underline"
                onClick={() => setStarts(toLocalInput(new Date().toISOString()))}
              >Set to now</button>
            </div>
            <input className="input" type="datetime-local" value={starts} onChange={e => setStarts(e.target.value)} />
            <div className="text-[11px] text-vs-mute mt-1">{prettyLocal(starts) || '—'}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Closes at</label>
              <div className="flex gap-2 text-[11px]">
                {[
                  { label: '+30m', ms: 30 * 60_000 },
                  { label: '+1h',  ms: 60 * 60_000 },
                  { label: '+2h',  ms: 120 * 60_000 },
                  { label: '+1d',  ms: 24 * 60 * 60_000 },
                ].map(({ label, ms }) => (
                  <button
                    key={label}
                    type="button"
                    className="text-vs-accent hover:underline"
                    onClick={() => {
                      const base = new Date(starts || new Date()).getTime()
                      setEnds(toLocalInput(new Date(base + ms).toISOString()))
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>
            <input className="input" type="datetime-local" value={ends} onChange={e => setEnds(e.target.value)} />
            <div className="text-[11px] text-vs-mute mt-1">
              {prettyLocal(ends) || '—'}
              {starts && ends && new Date(ends) > new Date(starts) && (
                <span className="ml-2 text-vs-text">({formatDuration(new Date(starts), new Date(ends))})</span>
              )}
            </div>
          </div>
        </div>
        <button className="btn w-full" disabled={busy}>{busy ? '…' : 'Assign'}</button>
      </form>

      <div className="md:col-span-2 space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">Assignments</h2>
          <select className="input max-w-[280px] ml-auto" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        {shown.length === 0 && <div className="text-vs-mute text-sm">No assignments.</div>}
        <div className="space-y-2">
          {shown.map(a => (
            <div key={a.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm">
                  {a.is_public
                    ? <span className="inline-block mr-2 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-emerald-900/40 border border-emerald-700 text-emerald-300">Public</span>
                    : <span className="font-mono">{a.assignee_email}</span>}
                  <span className="text-vs-mute">· {a.project.title}</span>
                </div>
                <div className="text-xs text-vs-mute">
                  {prettyLocal(a.starts_at)} → {prettyLocal(a.ends_at)}
                  <span className="ml-2 text-vs-text/70">({formatDuration(new Date(a.starts_at), new Date(a.ends_at))})</span>
                </div>
              </div>
              <button className="btn-ghost text-red-400" onClick={() => remove(a.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
