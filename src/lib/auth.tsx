import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  session: null, profile: null, loading: true, signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) { setProfile(null); setLoading(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    supabase
      .from('profiles')
      .select('id, email, role, full_name, campus, semester, section')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data as Profile | null)
        setLoading(false)
      })
  }, [session])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return <Ctx.Provider value={{ session, profile, loading, signOut }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
