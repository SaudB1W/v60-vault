import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { seedBeansIfEmpty } from '../api.js'

const STORAGE_KEY = 'v60_user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [hydrated, setHydrated] = useState(false)

  // Rehydrate cached user + run a one-time bean seed.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      /* ignore corrupt payload */
    }
    setHydrated(true)
    seedBeansIfEmpty()
  }, [])

  const persist = (next) => {
    setUser(next)
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  }

  const login = async (email, password) => {
    const cleanEmail = String(email).trim()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .eq('password', password)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('Invalid email or password.')

    persist(data)
    return data
  }

  const signup = async (name, email, password) => {
    const cleanEmail = String(email).trim()

    const { data: existing, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .ilike('email', cleanEmail)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (existing) {
      throw new Error('An account with that email already exists.')
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        name: String(name).trim(),
        email: cleanEmail,
        password,
        role: 'user',
      })
      .select()
      .single()
    if (error) throw error

    persist(data)
    return data
  }

  const logout = () => {
    persist(null)
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
