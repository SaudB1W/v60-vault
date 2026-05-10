import { useEffect, useState } from 'react'
import { addSuggestion, getSuggestions } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'

const emptyPour = () => ({ label: '', volume: '', notes: '' })

const emptyForm = () => ({
  waterTemp: '',
  totalTime: '',
  ratio: '',
  pours: [emptyPour()],
})

const statusPillClass = (status) => {
  if (status === 'accepted') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'rejected') return 'bg-red-100 text-red-800 border-red-200'
  return 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

export default function SuggestRecipe({ beanId }) {
  const { user } = useAuth()
  const { language } = useLanguage()
  const t = uiStrings[language]

  const [form, setForm] = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [mine, setMine] = useState([])
  const [loadingMine, setLoadingMine] = useState(true)

  const refreshMine = async () => {
    if (!user) return
    setLoadingMine(true)
    try {
      const all = await getSuggestions(beanId)
      setMine(all.filter((s) => String(s.userId) === String(user.id)))
    } catch (e) {
      setError(e.message || 'Could not load your suggestions.')
    } finally {
      setLoadingMine(false)
    }
  }

  useEffect(() => {
    refreshMine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beanId, user?.id])

  if (!user || user.role === 'admin') return null

  const updatePour = (i, key, value) =>
    setForm((f) => {
      const next = f.pours.map((p, idx) =>
        idx === i ? { ...p, [key]: value } : p,
      )
      return { ...f, pours: next }
    })

  const addPour = () =>
    setForm((f) => ({ ...f, pours: [...f.pours, emptyPour()] }))

  const removePour = (i) =>
    setForm((f) => {
      const next = f.pours.filter((_, idx) => idx !== i)
      return { ...f, pours: next.length > 0 ? next : [emptyPour()] }
    })

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess(false)
    try {
      await addSuggestion({
        beanId,
        userId: user.id,
        userName: user.name,
        brew: {
          waterTemp: form.waterTemp.trim(),
          totalTime: form.totalTime.trim(),
          ratio: form.ratio.trim(),
          pours: form.pours.map((p) => ({
            label: p.label.trim(),
            volume: p.volume.trim(),
            notes: p.notes.trim(),
          })),
        },
        status: 'pending',
        makeMain: false,
        createdAt: new Date().toISOString(),
      })
      setSuccess(true)
      setForm(emptyForm())
      await refreshMine()
    } catch (e2) {
      setError(e2.message || 'Could not submit suggestion.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="bg-white/70 border border-oatmeal rounded-card shadow-card p-6 sm:p-8">
      <h3 className="font-display text-xl sm:text-2xl text-espresso mb-5">
        {t.suggestRecipe}
      </h3>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SmallField
            label={t.waterTemp}
            value={form.waterTemp}
            onChange={(v) => setForm((f) => ({ ...f, waterTemp: v }))}
            placeholder="93°C"
          />
          <SmallField
            label={t.totalTime}
            value={form.totalTime}
            onChange={(v) => setForm((f) => ({ ...f, totalTime: v }))}
            placeholder="3:00"
          />
          <SmallField
            label={t.ratio}
            value={form.ratio}
            onChange={(v) => setForm((f) => ({ ...f, ratio: v }))}
            placeholder="1:16 (15g : 240g)"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs uppercase tracking-[0.18em] text-espresso/60 font-semibold">
              {t.pours}
            </label>
            <button
              type="button"
              onClick={addPour}
              className="text-sm font-semibold text-espresso hover:text-gold underline-offset-2 hover:underline"
            >
              + {t.pours}
            </button>
          </div>
          <div className="space-y-3">
            {form.pours.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto] gap-3 items-start bg-cream/60 border border-oatmeal rounded-card p-3"
              >
                <SmallField
                  label={`${t.pours} ${i + 1}`}
                  value={p.label}
                  onChange={(v) => updatePour(i, 'label', v)}
                  placeholder="Bloom"
                />
                <SmallField
                  label="Vol"
                  value={p.volume}
                  onChange={(v) => updatePour(i, 'volume', v)}
                  placeholder="45 ml"
                />
                <SmallField
                  label="Notes"
                  value={p.notes}
                  onChange={(v) => updatePour(i, 'notes', v)}
                />
                <button
                  type="button"
                  onClick={() => removePour(i)}
                  className="self-end sm:self-center text-xs font-semibold text-espresso/60 hover:text-red-600 px-2 py-1.5"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-card px-3 py-2">
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-card px-3 py-2">
            {t.suggestionSubmitted}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-espresso text-cream px-5 py-2.5 text-sm font-semibold tracking-wide hover:bg-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? '…' : t.submitSuggestion}
        </button>
      </form>

      {!loadingMine && mine.length > 0 && (
        <div className="mt-8 border-t border-oatmeal pt-6 space-y-3">
          {mine.map((s) => (
            <div
              key={s.id}
              className="bg-cream/60 border border-oatmeal rounded-card p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
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
              <p className="text-xs text-espresso/65">
                {s.brew?.waterTemp} · {s.brew?.ratio} · {s.brew?.totalTime}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function SmallField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-espresso/60 font-semibold mb-1">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-card border border-oatmeal bg-cream/60 px-3 py-2 text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
      />
    </label>
  )
}
