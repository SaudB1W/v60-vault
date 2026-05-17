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

    const finishHydration = () => {
      if (!cancelled) setHydrated(true)
    }

    // Safety net: if Supabase is slow or unreachable, unblock the UI
    // after 3s so ProtectedRoute can redirect unauthenticated users
    // to /login instead of leaving the app stuck on the spinner.
    const hydrationTimeout = setTimeout(finishHydration, 3000)

    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data?.session ?? null
        if (session?.user) {
          try {
            const me = await fetchProfile(session.user)
            if (!cancelled) setUser(me)
          } catch {
            if (!cancelled) setUser(null)
          }
        } else if (!cancelled) {
          setUser(null)
        }
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        finishHydration()
      }
      // Best-effort; never let a seeding failure block the UI.
      try {
        await seedBeansIfEmpty()
      } catch {
        /* ignored — seeding is non-critical */
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return
        if (!session?.user) {
          setUser(null)
          finishHydration()
          return
        }
        try {
          const me = await fetchProfile(session.user)
          if (!cancelled) setUser(me)
        } catch {
          if (!cancelled) setUser(null)
        } finally {
          finishHydration()
        }
      },
    )

    return () => {
      cancelled = true
      clearTimeout(hydrationTimeout)
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  async function login(email, password) {
    console.log("Login start")
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 5s")), 5000))
      ])
      console.log("Login result:", JSON.stringify(result))
      const { data, error } = result
      if (error) throw error
      if (data?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
        console.log("Profile:", JSON.stringify(profile))
        const userData = { id: data.user.id, name: profile?.name, email: data.user.email, role: profile?.role || 'user' }
        setUser(userData)
        localStorage.setItem('v60_user', JSON.stringify(userData))
      }
    } catch(e) {
      console.log("Login error:", e.message)
      throw e
    }
  }

  const signup = async (name, email, password) => {
    const cleanEmail = String(email).trim()
    const cleanName = String(name).trim()

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name: cleanName } },
    })
    if (error) throw new Error(error.message)
    const authUser = data?.user
    if (!authUser) throw new Error('Sign up did not return a user.')

    const { error: insertError } = await supabase.from('profiles').insert({
      id: authUser.id,
      name: cleanName,
      email: cleanEmail,
      role: 'user',
    })
    if (insertError) throw new Error(insertError.message)

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
