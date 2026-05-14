import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { seedBeansIfEmpty } from '../api.js'

const AuthContext = createContext(null)

const profileToUser = (profile, authUser) => {
  if (!profile && !authUser) return null
  if (!profile) {
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name ?? '',
      email: authUser.email ?? '',
      role: 'user',
    }
  }
  return {
    id: profile.id,
    name: profile.name ?? '',
    email: profile.email ?? authUser?.email ?? '',
    role: profile.role ?? 'user',
  }
}

const fetchProfile = async (authUser) => {
  if (!authUser) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()
  if (error) throw error
  return profileToUser(data, authUser)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data?.session ?? null
        if (session?.user) {
          const me = await fetchProfile(session.user)
          if (!cancelled) setUser(me)
        }
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setHydrated(true)
      }
      seedBeansIfEmpty()
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          setUser(null)
          return
        }
        try {
          const me = await fetchProfile(session.user)
          setUser(me)
        } catch {
          setUser(null)
        }
      },
    )

    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim(),
      password,
    })
    if (error) throw error
    const me = await fetchProfile(data.user)
    setUser(me)
    return me
  }

  const signup = async (name, email, password) => {
    const cleanEmail = String(email).trim()
    const cleanName = String(name).trim()

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name: cleanName } },
    })
    if (error) throw error
    const authUser = data?.user
    if (!authUser) {
      throw new Error('Sign up did not return a user.')
    }

    const { error: insertError } = await supabase.from('profiles').insert({
      id: authUser.id,
      name: cleanName,
      email: cleanEmail,
      role: 'user',
    })
    if (insertError) throw insertError

    const me = {
      id: authUser.id,
      name: cleanName,
      email: cleanEmail,
      role: 'user',
    }
    setUser(me)
    return me
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, hydrated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
