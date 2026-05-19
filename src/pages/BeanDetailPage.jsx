import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { beans } from '../data/beans.js'
import { addFavorite, getBean, getFavorites, removeFavorite } from '../api.js'
import V60Logo from '../components/V60Logo.jsx'
import StarRating from '../components/StarRating.jsx'
import Comments from '../components/Comments.jsx'
import CommunityRecipes from '../components/CommunityRecipes.jsx'
import SuggestRecipe from '../components/SuggestRecipe.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'
import { translateBean } from '../utils/translate.js'

function MetaPill({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full bg-cream border border-oatmeal text-espresso/80">
      {children}
    </span>
  )
}

function StatBlock({ label, value, sub }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-[11px] uppercase tracking-[0.18em] text-espresso/50 font-semibold">
        {label}
      </span>
      <span className="font-display text-3xl sm:text-5xl text-espresso leading-none mt-2 tabular-nums">
        {value}
      </span>
      {sub && <span className="text-xs text-espresso/55 mt-1.5">{sub}</span>}
    </div>
  )
}

export default function BeanDetailPage() {
  const { id } = useParams()
  const { language } = useLanguage()
  const { user } = useAuth()
  const t = uiStrings[language]
  const [bean, setBean] = useState(() => beans.find((b) => b.id === id) ?? null)
  const [displayBean, setDisplayBean] = useState(bean)
  const [loading, setLoading] = useState(true)
  const [translating, setTranslating] = useState(false)
  const [liked, setLiked] = useState(false)
  const [favToggling, setFavToggling] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getBean(id)
      .then((row) => {
        if (!cancelled && row) setBean(row)
      })
      .catch(() => {
        // Network/404 — leave whatever we have from the seed data.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    if (!user || !bean) {
      setLiked(false)
      return
    }
    getFavorites(user.id)
      .then((rows) => {
        if (cancelled) return
        setLiked(rows.some((f) => String(f.beanId) === String(bean.id)))
      })
      .catch(() => {
        /* silent */
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, bean?.id])

  const toggleFavorite = async () => {
    if (!user || !bean || favToggling) return
    const next = !liked
    setLiked(next)
    setFavToggling(true)
    try {
      if (next) {
        await addFavorite(user.id, bean.id)
      } else {
        await removeFavorite(user.id, bean.id)
      }
    } catch {
      setLiked(!next)
    } finally {
      setFavToggling(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    if (!bean) {
      setDisplayBean(null)
      return
    }
    if (language === 'ar') {
      setTranslating(true)
      translateBean(bean, 'ar')
        .then((translated) => {
          if (!cancelled) setDisplayBean(translated)
        })
        .finally(() => {
          if (!cancelled) setTranslating(false)
        })
    } else {
      setDisplayBean(bean)
    }
    return () => {
      cancelled = true
    }
  }, [bean, language])

  if (!bean && !loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <V60Logo className="w-12 h-12 text-espresso/40 mb-4" />
        <h1 className="font-display text-3xl text-espresso mb-2">
          Bean not found
        </h1>
        <p className="text-espresso/60 mb-6">
          That recipe isn’t in the vault yet.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-espresso text-cream px-5 py-2 text-sm font-semibold hover:bg-gold transition-colors"
        >
          ← Back to the collection
        </Link>
      </div>
    )
  }

  if (!bean) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-espresso/60">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream pb-16">
      <div className="grain dot-field border-b border-oatmeal/80">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-6 sm:pt-8 pb-10 sm:pb-14">
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

          <div className="mt-8 sm:mt-12">
            <div className="flex items-center gap-2 text-sm text-espresso/65 mb-3">
              <span className="text-base" aria-hidden="true">{bean.flag}</span>
              <span className="font-medium">{(displayBean ?? bean).origin}</span>
              <span className="text-espresso/30">·</span>
              <span>{(displayBean ?? bean).variety}</span>
            </div>

            <h1 className={`font-display text-4xl sm:text-6xl text-espresso leading-[1.05] ${translating ? 'opacity-60' : ''}`}>
              {(displayBean ?? bean).name}
            </h1>

            <div className="mt-5 flex flex-wrap gap-2">
              <MetaPill>{(displayBean ?? bean).processing}</MetaPill>
              <MetaPill>{bean.roastLevel} roast</MetaPill>
              <MetaPill>{bean.elevation}</MetaPill>
            </div>

            <p className="mt-6 text-espresso/75 max-w-2xl leading-relaxed">
              {(displayBean ?? bean).description}
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 mt-8 sm:mt-12 space-y-8 sm:space-y-10">
        {/* V60 Dashboard */}
        <section
          aria-label="V60 brew dashboard"
          className="bg-espresso text-cream rounded-card shadow-card overflow-hidden"
        >
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center gap-2">
                <V60Logo className="w-6 h-6 text-gold" />
                <span className="text-xs uppercase tracking-[0.22em] text-gold font-semibold">
                  {t.brewDashboard}
                </span>
              </div>
              <span className="text-xs text-cream/50 tabular-nums">
                Total {bean.brew.totalTime}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 sm:gap-6 text-cream">
              <div>
                <span className="text-[11px] uppercase tracking-[0.18em] text-cream/55 font-semibold">
                  Water
                </span>
                <div className="font-display text-3xl sm:text-5xl leading-none mt-2 tabular-nums">
                  {bean.brew.waterTemp}
                </div>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-[0.18em] text-cream/55 font-semibold">
                  Ratio
                </span>
                <div className="font-display text-2xl sm:text-3xl leading-tight mt-2 tabular-nums">
                  {bean.brew.ratio.split(' ')[0]}
                </div>
                <span className="text-xs text-cream/55 mt-1.5 block">
                  {bean.brew.ratio.split(' ').slice(1).join(' ')}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-[0.18em] text-cream/55 font-semibold">
                  Time
                </span>
                <div className="font-display text-3xl sm:text-5xl leading-none mt-2 tabular-nums">
                  {bean.brew.totalTime}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-cream text-espresso p-6 sm:p-8 border-t-4 border-gold">
            <h3 className="font-display text-xl sm:text-2xl mb-5">
              {t.pours}
            </h3>

            <ol className="space-y-4">
              {(displayBean ?? bean).brew.pours.map((pour, i) => (
                <li
                  key={i}
                  className="flex gap-4 sm:gap-5 p-4 sm:p-5 bg-white/70 border border-oatmeal rounded-card min-h-[88px]"
                >
                  <div
                    aria-hidden="true"
                    className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-espresso text-cream flex items-center justify-center font-display text-lg sm:text-xl tabular-nums"
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <span className="font-display text-lg sm:text-xl text-espresso">
                        {pour.label}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-gold tabular-nums">
                        {pour.volume}
                      </span>
                    </div>
                    <p className="mt-2 text-sm sm:text-[0.95rem] text-espresso/75 leading-relaxed">
                      {pour.notes}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <CommunityRecipes beanId={bean.id} />
        <SuggestRecipe beanId={bean.id} />

        {/* Rating */}
        <section className="bg-white/70 border border-oatmeal rounded-card shadow-card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl sm:text-2xl text-espresso">
              {t.rating}
            </h3>
          </div>
          <p className="text-sm text-espresso/60 mb-5">
            How did the cup land for you? Saved on this device.
          </p>
          <StarRating beanId={bean.id} />
          {user && (
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={favToggling}
              aria-pressed={liked}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-espresso text-cream px-5 py-2.5 text-sm font-semibold tracking-wide hover:bg-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 transition-colors duration-200"
                fill={liked ? '#dc2626' : 'none'}
                stroke={liked ? '#dc2626' : 'currentColor'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {liked ? t.saved : t.saveToFavorites}
            </button>
          )}
        </section>

        {/* Comments */}
        <section className="bg-white/70 border border-oatmeal rounded-card shadow-card p-6 sm:p-8">
          <h3 className="font-display text-xl sm:text-2xl text-espresso mb-1">
            {t.comments}
          </h3>
          <p className="text-sm text-espresso/60 mb-5">
            Log your tweaks across brews — grind, agitation, what you tasted.
          </p>
          <Comments beanId={bean.id} />
        </section>
      </main>
    </div>
  )
}
