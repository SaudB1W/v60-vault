import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBeansByRoastery, getRoastery } from '../api.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'
import BeanCard from '../components/BeanCard.jsx'
import V60Logo from '../components/V60Logo.jsx'

export default function RoasteryPage() {
  const { id } = useParams()
  const { language } = useLanguage()
  const t = uiStrings[language]
  const [roastery, setRoastery] = useState(null)
  const [beans, setBeans] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErr('')
    Promise.all([getRoastery(id), getBeansByRoastery(id)])
      .then(([r, b]) => {
        if (cancelled) return
        setRoastery(r)
        setBeans(b)
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || 'Could not load roastery.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (!loading && !roastery) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <V60Logo className="w-12 h-12 text-espresso/40 mb-4" />
        <h1 className="font-display text-3xl text-espresso mb-2">
          Roastery not found
        </h1>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-espresso text-cream px-5 py-2 text-sm font-semibold hover:bg-gold transition-colors"
        >
          ← Back
        </Link>
      </div>
    )
  }

  const accent = roastery?.color || '#3D2B1F'

  return (
    <div className="min-h-screen bg-cream pb-16">
      <header
        className="grain dot-field border-b border-oatmeal/80"
        style={{ borderBottomColor: accent }}
      >
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

          <div className="mt-8 flex items-center gap-5">
            {roastery?.logo_url && (
              <img
                src={roastery.logo_url}
                alt=""
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md"
                style={{ outline: `3px solid ${accent}` }}
              />
            )}
            <div>
              <p
                className="uppercase text-[11px] tracking-[0.22em] font-semibold mb-2"
                style={{ color: accent }}
              >
                {t.roastery}
              </p>
              <h1 className="font-display text-4xl sm:text-5xl text-espresso">
                {roastery?.name}
              </h1>
              <p className="mt-2 text-sm text-espresso/55 tabular-nums">
                {t.beanCount(beans.length)}
              </p>
            </div>
          </div>
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
          <p className="text-espresso/60 italic">No beans from this roastery yet.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {beans.map((bean) => (
              <BeanCard key={bean.id} bean={bean} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
