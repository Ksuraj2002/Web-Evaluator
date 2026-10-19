import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import MarkdownEditor from '../../components/MarkdownEditor'
import type { Project } from '../../lib/types'

export default function Projects() {
  const [rows, setRows] = useState<Project[]>([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setRows((data as Project[]) || [])
  }
  useEffect(() => { load() }, [])

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('projects').insert({ title, description: desc })
    setBusy(false)
    if (error) return alert(error.message)
    setTitle(''); setDesc(''); load()
  }

  async function remove(id: string) {
    if (!confirm('Delete project and its assets/assignments?')) return
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <form onSubmit={create} className="card md:col-span-1 space-y-3 h-fit">
        <h2 className="font-semibold">New project</h2>
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label">Problem statement (markdown)</label>
          <MarkdownEditor
            value={desc}
            onChange={setDesc}
            placeholder={"# Build an e-commerce landing page\n\nIt should have:\n- a hero section\n- a product grid\n- a sticky header"}
            minHeight={200}
          />
        </div>
        <button className="btn w-full" disabled={busy}>{busy ? '…' : 'Create project'}</button>
      </form>

      <div className="md:col-span-2 space-y-3">
        <h2 className="font-semibold">Projects</h2>
        {rows.length === 0 && <div className="text-vs-mute text-sm">No projects yet.</div>}
        {rows.map(p => (
          <div key={p.id} className="card flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-vs-mute line-clamp-2 whitespace-pre-wrap">{p.description || '—'}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link to={`/admin/projects/${p.id}`} className="btn-ghost">Edit</Link>
              <button className="btn-ghost text-red-400" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
