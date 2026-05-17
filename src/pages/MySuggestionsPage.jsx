import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getBeans,
  getUserBeanSuggestions,
  getUserSuggestions,
} from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'
import V60Logo from '../components/V60Logo.jsx'

const statusPillClass = (status) => {
  if (status === 'accepted') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'rejected') return 'bg-red-100 text-red-800 border-red-200'
  return 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

export default function MySuggestionsPage() {
  const { user } = useAuth()
  const { language } = useLanguage()
  const t = uiStrings[language]

  const [items, setItems] = useState([])
  const [beanItems, setBeanItems] = useState([])
  const [beans, setBeans] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!user) return
    setLoading(true)
    Promise.all([
      getUserSuggestions(user.id),
      getUserBeanSuggestions(user.id),
      getBeans(),
    ])
      .then(([s, bs, b]) => {
        if (cancelled) return
        setItems(s)
        setBeanItems(bs)
        setBeans(b)
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || 'Could not load your suggestions.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const beanById = useMemo(() => {
    const map = new Map()
    beans.forEach((b) => map.set(String(b.id), b))
    return map
  }, [beans])

  return (
    <div className="min-h-screen bg-cream pb-16">
      <header className="grain dot-field border-b border-oatmeal/80">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-6 sm:pt-8 pb-10">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-espresso/70 hover:text-espresso transition-colors"
            >
              <span aria-hidden="true">←</span> The Vault
            </Link>
            <Link to="/" aria-label="Home" className="text-espresso/70 hover:text-espresso">
              <V60Logo className="w-7 h-7" />
            </Link>
          </div>
          <h1 className="mt-8 font-display text-4xl sm:text-5xl text-espresso">
            {t.mySuggestions}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 mt-8 sm:mt-12">
        {err && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-card px-4 py-3 mb-6">
            {err}
          </p>
        )}

        {loading ? (
          <p className="text-espresso/60">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-espresso/60 italic">No suggestions yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((s) => {
              const bean = beanById.get(String(s.beanId))
              return (
                <li
                  key={s.id}
                  className="bg-white/70 border border-oatmeal rounded-card shadow-card p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="min-w-0">
                      {bean ? (
                        <Link
                          to={`/bean/${bean.id}`}
                          className="font-display text-lg sm:text-xl text-espresso hover:text-gold transition-colors"
                        >
                          {bean.name}
                        </Link>
                      ) : (
                        <span className="font-display text-lg sm:text-xl text-espresso">
                          {s.beanId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border ${statusPillClass(
                          s.status,
                        )}`}
                      >
                        {t[s.status] ?? s.status}
                      </span>
                      {s.status === 'accepted' && s.makeMain && (
                        <span className="text-[11px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border bg-gold/20 text-espresso border-gold/40">
                          {t.makeMainRecipe}
                        </span>
                      )}
                      <time
                        dateTime={s.createdAt}
                        className="text-xs text-espresso/55"
                      >
                        {new Date(s.createdAt).toLocaleDateString()}
                      </time>
                    </div>
                  </div>
                  <p className="text-xs text-espresso/65">
                    {s.brew?.waterTemp} · {s.brew?.ratio} · {s.brew?.totalTime}
                  </p>
                </li>
              )
            })}
          </ul>
        )}

        {!loading && beanItems.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-2xl sm:text-3xl text-espresso mb-4">
              {t.beanSuggestions}
            </h2>
            <ul className="space-y-3">
              {beanItems.map((s) => (
                <li
                  key={s.id}
                  className="bg-white/70 border border-oatmeal rounded-card shadow-card p-4 sm:p-5"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {s.imageUrl ? (
                      <img
                        src={s.imageUrl}
                        alt=""
                        className="w-14 h-14 rounded-card object-cover border border-oatmeal"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-card bg-oatmeal/40" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-lg sm:text-xl text-espresso truncate">
                        {s.name}
                      </p>
                      <p className="text-xs text-espresso/55">
                        {new Date(s.createdAt).toLocaleDateString()}
                        {s.brew ? ' · recipe included' : ''}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border ${statusPillClass(
                        s.status,
                      )}`}
                    >
                      {t[s.status] ?? s.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}
