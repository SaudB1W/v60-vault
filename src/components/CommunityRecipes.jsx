import { useEffect, useState } from 'react'
import { getSuggestions } from '../api.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'

export default function CommunityRecipes({ beanId }) {
  const { language } = useLanguage()
  const t = uiStrings[language]

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSuggestions(beanId)
      .then((rows) => {
        if (cancelled) return
        setItems(
          rows.filter((s) => s.status === 'accepted' && !s.makeMain),
        )
      })
      .catch(() => {
        /* silent — section just doesn't render */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [beanId])

  if (loading || items.length === 0) return null

  return (
    <section className="bg-white/70 border border-oatmeal rounded-card shadow-card p-6 sm:p-8">
      <h3 className="font-display text-xl sm:text-2xl text-espresso mb-1">
        {t.communityRecipes}
      </h3>
      <div className="mt-5 space-y-5">
        {items.map((s) => (
          <article
            key={s.id}
            className="bg-cream/60 border border-oatmeal rounded-card p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <span className="text-sm font-semibold text-espresso/80">
                {s.userName || 'Anonymous'}
              </span>
              <time
                dateTime={s.createdAt}
                className="text-xs text-espresso/55"
              >
                {new Date(s.createdAt).toLocaleDateString()}
              </time>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-espresso/70 mb-3">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-espresso/50 font-semibold">
                  {t.waterTemp}
                </span>
                <span className="font-display text-base text-espresso tabular-nums">
                  {s.brew?.waterTemp}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-espresso/50 font-semibold">
                  {t.ratio}
                </span>
                <span className="font-display text-base text-espresso tabular-nums">
                  {s.brew?.ratio}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-espresso/50 font-semibold">
                  {t.totalTime}
                </span>
                <span className="font-display text-base text-espresso tabular-nums">
                  {s.brew?.totalTime}
                </span>
              </div>
            </div>
            {Array.isArray(s.brew?.pours) && s.brew.pours.length > 0 && (
              <ol className="space-y-2">
                {s.brew.pours.map((p, i) => (
                  <li
                    key={i}
                    className="text-xs text-espresso/75 bg-white/70 border border-oatmeal rounded-card p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-espresso">
                        {i + 1}. {p.label}
                      </span>
                      <span className="font-semibold text-gold tabular-nums">
                        {p.volume}
                      </span>
                    </div>
                    {p.notes && (
                      <p className="mt-1 text-espresso/70">{p.notes}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
