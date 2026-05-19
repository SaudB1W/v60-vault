import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getFavorites } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'
import BeanCard from '../components/BeanCard.jsx'
import V60Logo from '../components/V60Logo.jsx'

export default function MyFavoritesPage() {
  const { user } = useAuth()
  const { language } = useLanguage()
  const t = uiStrings[language]

  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const refresh = async () => {
    if (!user) return
    setLoading(true)
    try {
      const rows = await getFavorites(user.id)
      setFavorites(rows)
    } catch (e) {
      setErr(e.message || 'Could not load favorites.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const favoriteSet = useMemo(
    () => new Set(favorites.map((f) => String(f.beanId))),
    [favorites],
  )

  const beans = favorites
    .map((f) => f.bean)
    .filter((b) => b != null)

  const handleFavoriteChange = (beanId, next) => {
    if (!next) {
      setFavorites((prev) => prev.filter((f) => String(f.beanId) !== String(beanId)))
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-16">
      <header className="grain dot-field border-b border-oatmeal/80">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-6 sm:pt-8 pb-10">
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
            {t.myFavorites}
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 mt-8 sm:mt-12">
        {err && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-card px-4 py-3 mb-6">
            {err}
          </p>
        )}

        {loading ? (
          <p className="text-espresso/60">Loading…</p>
        ) : beans.length === 0 ? (
          <p className="text-espresso/60 italic">{t.noFavorites}</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {beans.map((bean) => (
              <BeanCard
                key={bean.id}
                bean={bean}
                isFavorite={favoriteSet.has(String(bean.id))}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
