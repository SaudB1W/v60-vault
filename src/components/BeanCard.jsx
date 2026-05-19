import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'
import { translateBean } from '../utils/translate.js'
import {
  addFavorite,
  getBeanStats,
  removeFavorite,
} from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

const roastStyles = {
  Light: 'bg-cream text-espresso border-lightbrown/60',
  'Medium-Light': 'bg-oatmeal text-espresso border-lightbrown/60',
  Medium: 'bg-lightbrown/40 text-espresso border-lightbrown',
  'Medium-Dark': 'bg-gold/60 text-cream border-gold',
  Dark: 'bg-espresso text-cream border-espresso',
}

export default function BeanCard({ bean, isFavorite = false, onFavoriteChange }) {
  const { language } = useLanguage()
  const { user } = useAuth()
  const t = uiStrings[language]
  const roastClass = roastStyles[bean.roastLevel] ?? roastStyles.Medium

  const [displayBean, setDisplayBean] = useState(bean)
  const [translating, setTranslating] = useState(false)
  const [stats, setStats] = useState(null)
  const [liked, setLiked] = useState(isFavorite)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    setLiked(isFavorite)
  }, [isFavorite])

  useEffect(() => {
    let cancelled = false
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

  useEffect(() => {
    let cancelled = false
    getBeanStats(bean.id)
      .then((s) => {
        if (!cancelled) setStats(s)
      })
      .catch(() => {
        /* silent — stats just won't render */
      })
    return () => {
      cancelled = true
    }
  }, [bean.id])

  const handleToggleFavorite = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || toggling) return
    const next = !liked
    setLiked(next)
    setToggling(true)
    try {
      if (next) {
        await addFavorite(user.id, bean.id)
      } else {
        await removeFavorite(user.id, bean.id)
      }
      setStats((prev) =>
        prev
          ? {
              ...prev,
              favoritesCount: Math.max(
                0,
                (prev.favoritesCount || 0) + (next ? 1 : -1),
              ),
            }
          : prev,
      )
      if (onFavoriteChange) onFavoriteChange(bean.id, next)
    } catch {
      setLiked(!next)
    } finally {
      setToggling(false)
    }
  }

  return (
    <Link
      to={`/bean/${bean.id}`}
      className="bean-card group block bg-white/70 backdrop-blur-sm border border-oatmeal rounded-card shadow-card hover:shadow-cardHover overflow-hidden relative"
    >
      {user && (
        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={liked}
          className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-oatmeal shadow-sm flex items-center justify-center transition-transform duration-200 ease-out hover:scale-110 ${
            liked ? 'scale-110' : 'scale-100'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 transition-colors duration-200"
            fill={liked ? '#dc2626' : 'none'}
            stroke={liked ? '#dc2626' : '#3D2B1F'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      )}
      <div className="p-5 sm:p-6 flex flex-col h-full">
        {bean.roastery_logo_url && (
          <div className="flex justify-center mb-3">
            <img
              src={bean.roastery_logo_url}
              alt=""
              className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
            />
          </div>
        )}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-sm text-espresso/70">
            <span className="text-base leading-none" aria-hidden="true">
              {bean.flag}
            </span>
            {language !== 'ar' && (
              <span className="font-medium">{displayBean.origin}</span>
            )}
          </div>
          <span
            className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border ${roastClass}`}
          >
            {bean.roastLevel}
          </span>
        </div>

        <h2 className={`font-display text-2xl sm:text-[1.6rem] leading-tight text-espresso mb-2 ${translating ? 'opacity-60' : ''}`}>
          {displayBean.name}
        </h2>

        {stats && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-espresso/70 mb-2">
            <span>
              {stats.ratingsCount > 0
                ? `⭐ ${stats.averageStars.toFixed(1)} ★`
                : `⭐ ${t.noRatings}`}
            </span>
            <span>💬 {stats.commentsCount}</span>
            <span>❤️ {stats.favoritesCount}</span>
          </div>
        )}

        <p className="text-sm text-espresso/70 mb-5">{displayBean.variety}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 border-t border-oatmeal">
          <span className="inline-flex items-center gap-1.5 text-xs text-espresso/70 bg-cream px-2.5 py-1 rounded-full border border-oatmeal">
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" aria-hidden="true">
              <path d="M8 1 L14 11 H2 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            {bean.elevation}
          </span>
          <span className="text-sm font-semibold text-espresso group-hover:text-gold transition-colors">
            {t.viewRecipe} →
          </span>
        </div>
      </div>
    </Link>
  )
}
