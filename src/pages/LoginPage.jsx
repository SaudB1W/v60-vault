import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'
import V60Logo from '../components/V60Logo.jsx'

export default function LoginPage() {
  const { login, user } = useAuth()
  const { language, toggleLanguage } = useLanguage()
  const t = uiStrings[language]
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // If already logged in, send them onward.
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const me = await login(email.trim(), password)
      const from = location.state?.from?.pathname
      const dest = me.role === 'admin' ? '/admin' : from || '/'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream grain dot-field flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-sm border border-oatmeal rounded-card shadow-card p-7 sm:p-9">
        <div className="flex flex-col items-center text-center mb-7">
          <V60Logo className="w-12 h-12 text-espresso mb-3" />
          <p className="uppercase text-[11px] tracking-[0.22em] text-gold font-semibold">
            The V60 Vault
          </p>
          <h1 className="font-display text-3xl text-espresso mt-2">
            {t.welcomeBack}
          </h1>
          <p className="text-sm text-espresso/60 mt-1">
            Sign in to brew, rate, and remember.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs uppercase tracking-[0.18em] text-espresso/60 font-semibold mb-1.5"
            >
              {t.email}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-card border border-oatmeal bg-cream/60 px-4 py-2.5 text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs uppercase tracking-[0.18em] text-espresso/60 font-semibold mb-1.5"
            >
              {t.password}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-card border border-oatmeal bg-cream/60 px-4 py-2.5 text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-card px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-espresso text-cream py-2.5 text-sm font-semibold tracking-wide hover:bg-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Signing in...' : t.signIn}
          </button>
        </form>

        <p className="text-center text-sm text-espresso/65 mt-6">
          <Link
            to="/signup"
            className="text-espresso font-semibold underline-offset-2 hover:underline"
          >
            {t.createAccount}
          </Link>
        </p>

        <button
          type="button"
          onClick={toggleLanguage}
          className="mt-4 mx-auto block rounded-full border border-oatmeal px-3 py-1.5 text-xs font-semibold text-espresso hover:bg-cream/60 transition-colors"
        >
          {language === 'en' ? 'العربية' : 'English'}
        </button>
      </div>
    </div>
  )
}
