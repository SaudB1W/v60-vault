import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BeanCard from '../components/BeanCard.jsx'
import SuggestBean from '../components/SuggestBean.jsx'
import V60Logo from '../components/V60Logo.jsx'
import { beans as seedBeans } from '../data/beans.js'
import { getBeanStats, getBeans } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'
import { supabase } from '../supabaseClient.js'

const ROAST_OPTIONS = ['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark']

export default function LandingPage() {
  const { user, logout } = useAuth()
  const { language, toggleLanguage } = useLanguage()
  const t = uiStrings[language]
  const [beans, setBeans] = useState(seedBeans)
  const [mostLovedIds, setMostLovedIds] = useState([])
  const [statsById, setStatsById] = useState({})
  const [search, setSearch] = useState('')
  const [roastFilter, setRoastFilter] = useState('All')
  const [originFilter, setOriginFilter] = useState('All')
  const [sortBy, setSortBy] = useState('default')

  useEffect(() => {
    let cancelled = false
    getBeans()
      .then((rows) => {
        if (!cancelled && Array.isArray(rows) && rows.length > 0) {
          setBeans(rows)
        }
      })
      .catch(() => {
        /* fall back to seed beans if the API is unreachable */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('favorites')
      .select('bean_id')
      .then(({ data }) => {
        if (cancelled || !Array.isArray(data)) return
        const counts = new Map()
        data.forEach((row) => {
          const id = String(row.bean_id)
          counts.set(id, (counts.get(id) || 0) + 1)
        })
        const sorted = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([id]) => id)
        setMostLovedIds(sorted)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch stats for every bean so Sort By can use averageStars / favoritesCount.
  useEffect(() => {
    let cancelled = false
    if (!beans.length) return
    Promise.all(
      beans.map((b) =>
        getBeanStats(b.id)
          .then((s) => [b.id, s])
          .catch(() => [b.id, null]),
      ),
    ).then((pairs) => {
      if (cancelled) return
      const map = {}
      pairs.forEach(([id, s]) => {
        if (s) map[id] = s
      })
      setStatsById(map)
    })
    return () => {
      cancelled = true
    }
  }, [beans])

  const mostLovedBeans = mostLovedIds
    .map((id) => beans.find((b) => String(b.id) === id))
    .filter(Boolean)

  const originOptions = useMemo(() => {
    const set = new Set()
    beans.forEach((b) => {
      if (b.origin) set.add(b.origin)
    })
    return Array.from(set).sort()
  }, [beans])

  const filteredBeans = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = beans.filter((b) => {
      if (roastFilter !== 'All' && b.roastLevel !== roastFilter) return false
      if (originFilter !== 'All' && b.origin !== originFilter) return false
      if (q) {
        const name = (b.name || '').toLowerCase()
        const origin = (b.origin || '').toLowerCase()
        if (!name.includes(q) && !origin.includes(q)) return false
      }
      return true
    })

    if (sortBy === 'highestRated') {
      list = [...list].sort(
        (a, b) =>
          (statsById[b.id]?.averageStars || 0) -
          (statsById[a.id]?.averageStars || 0),
      )
    } else if (sortBy === 'mostFavorited') {
      list = [...list].sort(
        (a, b) =>
          (statsById[b.id]?.favoritesCount || 0) -
          (statsById[a.id]?.favoritesCount || 0),
      )
    } else if (sortBy === 'newest') {
      const indexOf = new Map(beans.map((b, i) => [b.id, i]))
      list = [...list].sort(
        (a, b) => (indexOf.get(b.id) ?? 0) - (indexOf.get(a.id) ?? 0),
      )
    }
    return list
  }, [beans, search, roastFilter, originFilter, sortBy, statsById])

  const hasActiveFilter =
    search.trim() !== '' ||
    roastFilter !== 'All' ||
    originFilter !== 'All' ||
    sortBy !== 'default'

  const clearAll = () => {
    setSearch('')
    setRoastFilter('All')
    setOriginFilter('All')
    setSortBy('default')
  }

  const sortLabel = (v) => {
    if (v === 'highestRated') return t.sortHighestRated
    if (v === 'mostFavorited') return t.sortMostFavorited
    if (v === 'newest') return t.sortNewest
    return t.sortDefault
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="grain dot-field border-b border-oatmeal/80">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-12 sm:pb-20">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 text-espresso">
              <V60Logo className="w-9 h-9 sm:w-10 sm:h-10 text-espresso" />
              <span className="font-display text-lg sm:text-xl tracking-wide">
                The V60 Vault
              </span>
            </div>

            {user && (
              <div className="flex items-center gap-3 sm:gap-4 text-sm">
                <span className="text-espresso/70 hidden sm:inline">
                  Hello, <strong className="text-espresso">{user.name}</strong>
                </span>
                {user.role === 'admin' ? (
                  <Link
                    to="/admin"
                    className="font-semibold text-espresso hover:text-gold underline-offset-2 hover:underline"
                  >
                    {t.adminPanel}
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/my-favorites"
                      className="font-semibold text-espresso hover:text-gold underline-offset-2 hover:underline"
                    >
                      {t.myFavorites}
                    </Link>
                    <Link
                      to="/my-suggestions"
                      className="font-semibold text-espresso hover:text-gold underline-offset-2 hover:underline"
                    >
                      {t.mySuggestions}
                    </Link>
                  </>
                )}
                <button
                  onClick={toggleLanguage}
                  className="rounded-full border border-oatmeal px-3 py-1.5 text-xs font-semibold text-espresso hover:bg-cream/60 transition-colors"
                >
                  {language === 'en' ? 'العربية' : 'English'}
                </button>
                <button
                  onClick={logout}
                  className="rounded-full border border-oatmeal px-3 py-1.5 text-xs font-semibold text-espresso hover:bg-cream/60 transition-colors"
                >
                  {t.logout}
                </button>
              </div>
            )}
          </div>

          <div
            className={`mt-10 sm:mt-16 max-w-2xl ${
              language === 'ar' ? 'mx-auto text-center' : ''
            }`}
          >
            <p className="uppercase text-xs tracking-[0.22em] text-gold font-semibold mb-4">
              {t.heroTagline}
            </p>
            <h1 className="font-display text-4xl sm:text-6xl leading-[1.05] text-espresso">
              {t.heroTitle1}
              <br />
              <span className="italic text-gold">{t.heroTitle2}.</span>
            </h1>
            <p
              className={`mt-5 sm:mt-6 text-base sm:text-lg text-espresso/70 max-w-xl ${
                language === 'ar' ? 'mx-auto' : ''
              }`}
            >
              {t.heroDesc}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {mostLovedBeans.length > 0 && (
          <section className="mb-10 sm:mb-14">
            <h2 className="font-display text-2xl sm:text-3xl text-espresso mb-6 sm:mb-8">
              {t.mostLoved}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {mostLovedBeans.map((bean) => (
                <BeanCard key={`loved-${bean.id}`} bean={bean} />
              ))}
            </div>
          </section>
        )}

        <div className="flex items-baseline justify-between mb-6 sm:mb-8">
          <h2 className="font-display text-2xl sm:text-3xl text-espresso">
            {t.theCollection}
          </h2>
          <span className="text-sm text-espresso/55 tabular-nums">
            {t.beansCount(beans.length)}
          </span>
        </div>

        <SuggestBean />

        <div className="mb-5 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-card border border-oatmeal bg-white/70 px-4 py-2.5 pr-10 text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute top-1/2 -translate-y-1/2 right-2 w-7 h-7 rounded-full text-espresso/60 hover:bg-cream/80 hover:text-espresso flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
            <select
              value={roastFilter}
              onChange={(e) => setRoastFilter(e.target.value)}
              aria-label={t.filterRoast}
              className="rounded-card border border-oatmeal bg-white/70 px-3 py-2.5 text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
            >
              <option value="All">{t.allRoasts}</option>
              {ROAST_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              aria-label={t.filterOrigin}
              className="rounded-card border border-oatmeal bg-white/70 px-3 py-2.5 text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
            >
              <option value="All">{t.allOrigins}</option>
              {originOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label={t.sortBy}
              className="rounded-card border border-oatmeal bg-white/70 px-3 py-2.5 text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
            >
              <option value="default">{t.sortDefault}</option>
              <option value="highestRated">{t.sortHighestRated}</option>
              <option value="mostFavorited">{t.sortMostFavorited}</option>
              <option value="newest">{t.sortNewest}</option>
            </select>
          </div>

          {hasActiveFilter && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {search.trim() !== '' && (
                <FilterPill
                  label={`${t.searchPlaceholder.replace(/\.\.\.$/, '')}: ${search.trim()}`}
                  onRemove={() => setSearch('')}
                />
              )}
              {roastFilter !== 'All' && (
                <FilterPill
                  label={`${t.filterRoast}: ${roastFilter}`}
                  onRemove={() => setRoastFilter('All')}
                />
              )}
              {originFilter !== 'All' && (
                <FilterPill
                  label={`${t.filterOrigin}: ${originFilter}`}
                  onRemove={() => setOriginFilter('All')}
                />
              )}
              {sortBy !== 'default' && (
                <FilterPill
                  label={`${t.sortBy}: ${sortLabel(sortBy)}`}
                  onRemove={() => setSortBy('default')}
                />
              )}
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-semibold text-espresso/70 hover:text-espresso underline-offset-2 hover:underline px-2 py-1"
              >
                {t.clearAll}
              </button>
            </div>
          )}

          <p className="mt-3 text-sm text-espresso/55 tabular-nums">
            {filteredBeans.length === 0
              ? t.noResults
              : t.showingResults(filteredBeans.length, beans.length)}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredBeans.map((bean) => (
            <BeanCard key={bean.id} bean={bean} />
          ))}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-5 sm:px-8 py-10 text-xs text-espresso/50">
        <div className="border-t border-oatmeal pt-6 flex items-center justify-between">
          <span>© The V60 Vault</span>
          <span>Brewed with care.</span>
        </div>
      </footer>
    </div>
  )
}

function FilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-espresso bg-cream border border-oatmeal rounded-full px-3 py-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="text-espresso/60 hover:text-espresso w-4 h-4 flex items-center justify-center"
      >
        ×
      </button>
    </span>
  )
}
