import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { seedBeansIfEmpty } from '../api.js'
import { hashPassword, verifyPassword } from '../utils/crypto.js'

// NOTE: This auth flow stores bcrypt password hashes in the `profiles`
// table and verifies them client-side. For that to work the RLS policy
// on `profiles` must allow anonymous SELECT (so login can fetch the row
// by email) and anonymous INSERT (so signup can create the row). This
// also means hashes are readable by anyone with the anon key — accept
// the trade-off knowingly.

const STORAGE_KEY = 'v60_user'

const AuthContext = createContext(null)

const persist = (next, setUser) => {
  setUser(next)
  if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  else localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      /* corrupt payload — ignore */
    }
    setHydrated(true)
    seedBeansIfEmpty()
  }, [])

  const login = async (email, password) => {
    const cleanEmail = String(email).trim()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!profile || !profile.password) {
      throw new Error('Invalid email or password')
    }
    const hashedInput = await hashPassword(password)
    console.log("Input hash:", hashedInput)
    console.log("Stored hash:", profile?.password)
    console.log("Match:", hashedInput === profile?.password)
    const ok = await verifyPassword(password, profile.password)
    if (!ok) throw new Error('Invalid email or password')

    const me = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role || 'user',
    }
    persist(me, setUser)
    return me
  }

  const signup = async (name, email, password) => {
    const cleanEmail = String(email).trim()
    const cleanName = String(name).trim()

    const { data: existing, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', cleanEmail)
      .maybeSingle()
    if (lookupError) throw new Error(lookupError.message)
    if (existing) {
      throw new Error('An account with that email already exists.')
    }

    const hash = await hashPassword(password)
    const id = crypto.randomUUID()

    const { error: insertError } = await supabase.from('profiles').insert({
      id,
      name: cleanName,
      email: cleanEmail,
      password: hash,
      role: 'user',
    })
    if (insertError) throw new Error(insertError.message)

    const me = { id, name: cleanName, email: cleanEmail, role: 'user' }
    persist(me, setUser)
    return me
  }

  const logout = () => {
    persist(null, setUser)
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
