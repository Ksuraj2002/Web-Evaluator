import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { session, loading } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)   // email we sent a verification to
  const [resending, setResending] = useState(false)

  if (!loading && session) return <Navigate to="/" replace />

  // "Check your email" screen after signup when confirmation is required
  if (sentTo) {
    async function resend() {
      setResending(true); setErr(null)
      const { error } = await supabase.auth.resend({ type: 'signup', email: sentTo! })
      setResending(false)
      if (error) setErr(error.message)
      else setErr('Verification email resent.')
    }
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="card w-full max-w-md space-y-4 text-center">
          <div className="text-4xl">📬</div>
          <h1 className="text-lg font-semibold">Check your email</h1>
          <p className="text-sm text-vs-mute">
            We sent a verification link to <span className="text-vs-text font-mono">{sentTo}</span>.
            Click it to activate your account, then come back and sign in.
          </p>
          <p className="text-xs text-vs-mute">
            Didn't get it? Check your spam folder, or
            <button onClick={resend} disabled={resending}
              className="text-vs-accent hover:underline disabled:opacity-50 ml-1">
              {resending ? 'resending…' : 'resend the email'}
            </button>.
          </p>
          {err && <div className="text-xs text-amber-300">{err}</div>}
          <button
            type="button"
            onClick={() => { setSentTo(null); setMode('signin'); setErr(null) }}
            className="btn-ghost w-full"
          >Back to sign in</button>
        </div>
      </div>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null); setBusy(true)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setBusy(false)
      if (error) setErr(error.message)
      return
    }
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    // If "Confirm email" is ON in Supabase, signUp returns a user but no session.
    // If OFF, we get a session and AuthProvider will redirect automatically.
    if (!data.session) setSentTo(email)
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-lg font-semibold">Web Eval — {mode === 'signin' ? 'Sign in' : 'Sign up'}</h1>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        </div>
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn w-full" disabled={busy}>
          {busy ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
                : (mode === 'signin' ? 'Sign in' : 'Create account')}
        </button>
        <button type="button" className="text-xs text-vs-mute hover:text-vs-text" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr(null) }}>
          {mode === 'signin' ? "No account? Sign up" : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
