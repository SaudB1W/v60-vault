import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'v60_lang'
const DEFAULT_LANG = 'en'

const LanguageContext = createContext({
  language: DEFAULT_LANG,
  toggleLanguage: () => {},
  setLanguage: () => {},
})

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LANG
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved === 'ar' || saved === 'en' ? saved : DEFAULT_LANG
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language)
    }
  }, [language])

  const setLanguage = useCallback((next) => {
    if (next === 'ar' || next === 'en') setLanguageState(next)
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'))
  }, [])

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
