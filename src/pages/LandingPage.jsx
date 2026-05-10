import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BeanCard from '../components/BeanCard.jsx'
import V60Logo from '../components/V60Logo.jsx'
import { beans as seedBeans } from '../data/beans.js'
import { getBeans } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'

export default function LandingPage() {
  const { user, logout } = useAuth()
  const { language, toggleLanguage } = useLanguage()
  const t = uiStrings[language]
  const [beans, setBeans] = useState(seedBeans)

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
                  <Link
                    to="/my-suggestions"
                    className="font-semibold text-espresso hover:text-gold underline-offset-2 hover:underline"
                  >
                    {t.mySuggestions}
                  </Link>
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
        <div className="flex items-baseline justify-between mb-6 sm:mb-8">
          <h2 className="font-display text-2xl sm:text-3xl text-espresso">
            {t.theCollection}
          </h2>
          <span className="text-sm text-espresso/55 tabular-nums">
            {t.beansCount(beans.length)}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {beans.map((bean) => (
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
