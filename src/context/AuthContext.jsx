import { createContext, useContext, useEffect, useState } from 'react'
import { addUser, getUsers } from '../api.js'

const STORAGE_KEY = 'v60_user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [hydrated, setHydrated] = useState(false)

  // Rehydrate on app load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      /* ignore corrupt payload */
    }
    setHydrated(true)
  }, [])

  const persist = (next) => {
    setUser(next)
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  }

  const login = async (email, password) => {
    const users = await getUsers()
    const match = users.find(
      (u) =>
        u.email.toLowerCase() === String(email).toLowerCase() &&
        u.password === password,
    )
    if (!match) {
      throw new Error('Invalid email or password.')
    }
    persist(match)
    return match
  }

  const signup = async (name, email, password) => {
    const users = await getUsers()
    if (
      users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())
    ) {
      throw new Error('An account with that email already exists.')
    }
    const created = await addUser({
      name,
      email,
      password,
      role: 'user',
    })
    persist(created)
    return created
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
