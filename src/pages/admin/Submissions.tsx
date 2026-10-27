import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Submission, Assignment, Project, Profile, Evaluation, Course, ExamGroup } from '../../lib/types'
import { COURSES, courseFor, EXAM_GROUPS, examGroupFor } from '../../lib/types'

type Row = Submission & {
  assignment: Assignment & { project: Pick<Project, 'title' | 'project_type'> }
  student: Profile | null
  evaluation: Pick<Evaluation, 'total' | 'max_total' | 'graded_at'> | null
}

type GradeFilter = 'all' | 'graded' | 'ungraded'
type CourseFilter = 'all' | Course
type ExamFilter = 'all' | ExamGroup

export default function Submissions() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all')
  const [courseFilter, setCourseFilter] = useState<CourseFilter>('all')
  const [examFilter, setExamFilter] = useState<ExamFilter>('all')

  useEffect(() => {
    supabase
      .from('submissions')
      // profiles(*) rather than a column list, so a missing optional column
      // (e.g. uid before its migration runs) can't break the list.
      .select('*, assignment:assignments(*, project:projects(title, project_type)), student:profiles(*), evaluation:evaluations(total,max_total,graded_at)')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        const normalized = ((data as unknown as (Omit<Row, 'evaluation'> & { evaluation: Row['evaluation'] | Row['evaluation'][] })[]) || []).map(r => ({
          ...r,
          // Supabase returns 1:1 relations as an array; flatten to the single row.
          evaluation: Array.isArray(r.evaluation) ? (r.evaluation[0] ?? null) : (r.evaluation ?? null),
        })) as Row[]
        setRows(normalized)
        setLoading(false)
      })
  }, [])

  const counts = useMemo(() => ({
    all: rows.length,
    graded: rows.filter(r => r.evaluation).length,
    ungraded: rows.filter(r => !r.evaluation).length,
  }), [rows])

  const courseCounts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length }
    for (const course of COURSES) c[course] = 0
    for (const r of rows) c[courseFor(r.assignment.project.project_type)] = (c[courseFor(r.assignment.project.project_type)] || 0) + 1
    return c
  }, [rows])

  const examCounts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length }
    for (const g of EXAM_GROUPS) c[g] = 0
    for (const r of rows) c[examGroupFor(r.assignment.project.title)] = (c[examGroupFor(r.assignment.project.title)] || 0) + 1
    return c
  }, [rows])

  const filtered = rows.filter(r => {
    if (gradeFilter === 'graded' && !r.evaluation) return false
    if (gradeFilter === 'ungraded' && r.evaluation) return false
    if (courseFilter !== 'all' && courseFor(r.assignment.project.project_type) !== courseFilter) return false
    if (examFilter !== 'all' && examGroupFor(r.assignment.project.title) !== examFilter) return false
    if (!q) return true
    const hay = [
      r.student?.email, r.student?.full_name, r.student?.uid, r.student?.campus,
      r.student?.semester, r.student?.section, r.assignment.project.title,
    ].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  // Nested grouping: ExamGroup -> Course -> rows
  const groupedByExam = useMemo(() => {
    const outer = new Map<ExamGroup, Map<Course, Row[]>>()
    for (const g of EXAM_GROUPS) {
      const inner = new Map<Course, Row[]>()
      for (const c of COURSES) inner.set(c, [])
      outer.set(g, inner)
    }
    for (const r of filtered) {
      const g = examGroupFor(r.assignment.project.title)
      const c = courseFor(r.assignment.project.project_type)
      outer.get(g)!.get(c)!.push(r)
    }
    return [...outer.entries()]
      .map(([g, inner]) => [g, [...inner.entries()].filter(([, items]) => items.length > 0)] as const)
      .filter(([, courses]) => courses.length > 0)
  }, [filtered])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-semibold">Submissions</h2>
        <div className="flex items-center gap-1 text-xs">
          {(['all', 'ungraded', 'graded'] as GradeFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setGradeFilter(f)}
              className={`px-2 py-1 rounded border ${gradeFilter === f ? 'bg-vs-accent text-white border-vs-accent' : 'border-vs-border text-vs-mute hover:text-vs-text'}`}
            >
              {f[0].toUpperCase() + f.slice(1)} <span className="opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs">
          {(['all', ...EXAM_GROUPS] as ExamFilter[]).map(e => (
            <button
              key={e}
              onClick={() => setExamFilter(e)}
              className={`px-2 py-1 rounded border ${examFilter === e ? 'bg-vs-accent text-white border-vs-accent' : 'border-vs-border text-vs-mute hover:text-vs-text'}`}
            >
              {e === 'all' ? 'All exams' : e} <span className="opacity-70">({examCounts[e] ?? 0})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs">
          {(['all', ...COURSES] as CourseFilter[]).map(c => (
            <button
              key={c}
              onClick={() => setCourseFilter(c)}
              className={`px-2 py-1 rounded border ${courseFilter === c ? 'bg-vs-accent text-white border-vs-accent' : 'border-vs-border text-vs-mute hover:text-vs-text'}`}
            >
              {c === 'all' ? 'All courses' : c} <span className="opacity-70">({courseCounts[c] ?? 0})</span>
            </button>
          ))}
        </div>
        <input
          className="input max-w-sm ml-auto"
          placeholder="Search name, UID, email, campus, section, project…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      {loading ? <div className="text-vs-mute">Loading…</div> :
        filtered.length === 0 ? <div className="text-vs-mute">No submissions{q ? ' match.' : ' yet.'}</div> :
        <div className="space-y-8">
          {groupedByExam.map(([examGroup, courses]) => (
            <div key={examGroup} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-vs-text border-b border-vs-border pb-1">
                <span>{examGroup}</span>
                <span className="opacity-60">·</span>
                <span className="text-vs-mute font-normal">{courses.reduce((n, [, items]) => n + items.length, 0)}</span>
              </div>
              {courses.map(([course, items]) => (
                <div key={course} className="space-y-2 pl-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-vs-mute">
                    <span>{course}</span>
                    <span className="opacity-60">·</span>
                    <span>{items.length}</span>
                  </div>
                  {items.map(r => (
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
              <div className="flex items-center gap-3 shrink-0">
                {r.evaluation ? (
                  <span className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
                    {r.evaluation.total}/{r.evaluation.max_total}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded border border-vs-border text-vs-mute">Not graded</span>
                )}
                <Link className="btn-ghost" to={`/admin/submissions/${r.id}`}>
                  {r.evaluation ? 'Review' : 'Grade'}
                </Link>
              </div>
            </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      }
    </div>
  )
}
