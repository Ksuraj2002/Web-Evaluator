import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const nav = useNavigate()
  const [ready, setReady] = useState(false)   // we have a recovery session
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  // When the user arrives via the reset email, Supabase JS parses the URL
  // hash and fires PASSWORD_RECOVERY. Only allow the new-password form then.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true)
      }
    })
    // Also set ready if we already have a session (e.g. refresh after click)
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) { setErr('Passwords do not match'); return }
    setBusy(true); setErr(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setDone(true)
    setTimeout(() => nav('/'), 1500)
  }

  if (done) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="card max-w-sm text-center space-y-3">
          <div className="text-4xl">✓</div>
          <h1 className="text-lg font-semibold">Password updated</h1>
          <p className="text-sm text-vs-mute">Redirecting you to the app…</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="card max-w-sm text-center space-y-3">
          <h1 className="text-lg font-semibold">Password reset</h1>
          <p className="text-sm text-vs-mute">
            This page needs to be opened from the reset link in your email.
            If you got here by mistake, head back to sign in.
          </p>
          <Link to="/login" className="btn inline-block">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-3">
        <h1 className="text-lg font-semibold">Choose a new password</h1>
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" minLength={6} required
            value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input className="input" type="password" minLength={6} required
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        </div>
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn w-full" disabled={busy}>{busy ? '…' : 'Update password'}</button>
      </form>
    </div>
  )
}
