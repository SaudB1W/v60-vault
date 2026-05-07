// MyMemory free translation API. No API key required.
// Caches every successful lookup in localStorage so the same string is
// only translated once per browser.

const CACHE_KEY = 'v60_translation_cache'
const ENDPOINT = 'https://api.mymemory.translated.net/get'

const readCache = () => {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

const writeCache = (cache) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* quota — ignore */
  }
}

const cacheKey = (text, targetLang) => `${targetLang}::${text}`

export async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text
  if (targetLang !== 'ar' && targetLang !== 'en') return text

  const trimmed = text.trim()
  if (!trimmed) return text

  const cache = readCache()
  const key = cacheKey(trimmed, targetLang)
  if (cache[key]) return cache[key]

  const sourceLang = targetLang === 'ar' ? 'en' : 'ar'
  const url = `${ENDPOINT}?q=${encodeURIComponent(trimmed)}&langpair=${sourceLang}|${targetLang}`

  try {
    const res = await fetch(url)
    if (!res.ok) return text
    const data = await res.json()
    const translated = data?.responseData?.translatedText
    if (typeof translated === 'string' && translated.length > 0) {
      cache[key] = translated
      writeCache(cache)
      return translated
    }
    return text
  } catch {
    return text
  }
}

export async function translateBean(bean, targetLang) {
  if (!bean) return bean
  if (targetLang === 'en') return bean

  // Prefer pre-translated columns from the admin save when present.
  const hasPreTranslation =
    bean.name_ar || bean.origin_ar || bean.variety_ar ||
    bean.processing_ar || bean.description_ar || bean.pours_ar
  if (hasPreTranslation) {
    return {
      ...bean,
      name: bean.name_ar || bean.name,
      origin: bean.origin_ar || bean.origin,
      variety: bean.variety_ar || bean.variety,
      processing: bean.processing_ar || bean.processing,
      description: bean.description_ar || bean.description,
      brew: bean.brew
        ? {
            ...bean.brew,
            pours: Array.isArray(bean.pours_ar) && bean.pours_ar.length === bean.brew.pours?.length
              ? bean.brew.pours.map((p, i) => ({
                  ...p,
                  label: bean.pours_ar[i]?.label || p.label,
                  notes: bean.pours_ar[i]?.notes || p.notes,
                }))
              : bean.brew.pours,
          }
        : bean.brew,
    }
  }

  const [name, origin, variety, processing, description] = await Promise.all([
    translateText(bean.name, targetLang),
    translateText(bean.origin, targetLang),
    translateText(bean.variety, targetLang),
    translateText(bean.processing, targetLang),
    translateText(bean.description, targetLang),
  ])

  let brew = bean.brew
  if (brew?.pours?.length) {
    const pours = await Promise.all(
      brew.pours.map(async (p) => ({
        ...p,
        label: await translateText(p.label, targetLang),
        notes: await translateText(p.notes, targetLang),
      })),
    )
    brew = { ...brew, pours }
  }

  return {
    ...bean,
    name,
    origin,
    variety,
    processing,
    description,
    brew,
  }
}
