import { useEffect, useState } from 'react'
import { addBeanSuggestion, getUserBeanSuggestions } from '../api.js'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'

const ROAST_OPTIONS = ['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark']

const emptyPour = () => ({ label: '', volume: '', notes: '' })

const emptyForm = () => ({
  name: '',
  origin: '',
  variety: '',
  elevation: '',
  processing: '',
  roastLevel: 'Light',
  description: '',
  brew: {
    waterTemp: '',
    totalTime: '',
    ratio: '',
    pours: [emptyPour()],
  },
})

const statusPillClass = (status) => {
  if (status === 'accepted') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'rejected') return 'bg-red-100 text-red-800 border-red-200'
  return 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

export default function SuggestBean() {
  const { user } = useAuth()
  const { language } = useLanguage()
  const t = uiStrings[language]

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [includeRecipe, setIncludeRecipe] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [mine, setMine] = useState([])

  const refreshMine = async () => {
    if (!user) return
    try {
      const rows = await getUserBeanSuggestions(user.id)
      setMine(rows)
    } catch {
      /* silent */
    }
  }

  useEffect(() => {
    refreshMine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (!user || user.role === 'admin') return null

  const updateField = (key, value) =>
    setForm((f) => ({ ...f, [key]: value }))

  const updateBrew = (key, value) =>
    setForm((f) => ({ ...f, brew: { ...f.brew, [key]: value } }))

  const updatePour = (i, key, value) =>
    setForm((f) => {
      const pours = f.brew.pours.map((p, idx) =>
        idx === i ? { ...p, [key]: value } : p,
      )
      return { ...f, brew: { ...f.brew, pours } }
    })

  const addPour = () =>
    setForm((f) => ({
      ...f,
      brew: { ...f.brew, pours: [...f.brew.pours, emptyPour()] },
    }))

  const removePour = (i) =>
    setForm((f) => {
      const next = f.brew.pours.filter((_, idx) => idx !== i)
      return {
        ...f,
        brew: { ...f.brew, pours: next.length > 0 ? next : [emptyPour()] },
      }
    })

  const resetForm = () => {
    setForm(emptyForm())
    setIncludeRecipe(false)
    setImageFile(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!imageFile) {
      setError('Bean image is required.')
      return
    }

    setSubmitting(true)
    try {
      const path = `${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('bean-suggestion-images')
        .upload(path, imageFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: imageFile.type || undefined,
        })
      if (uploadError) throw uploadError
      const { data: publicUrlData } = supabase.storage
        .from('bean-suggestion-images')
        .getPublicUrl(path)
      const imageUrl = publicUrlData?.publicUrl ?? null

      const payload = {
        userId: user.id,
        userName: user.name,
        name: form.name.trim(),
        origin: form.origin.trim(),
        variety: form.variety.trim(),
        elevation: form.elevation.trim(),
        processing: form.processing.trim(),
        roastLevel: form.roastLevel,
        description: form.description.trim(),
        imageUrl,
        brew: includeRecipe
          ? {
              waterTemp: form.brew.waterTemp.trim(),
              totalTime: form.brew.totalTime.trim(),
              ratio: form.brew.ratio.trim(),
              pours: form.brew.pours.map((p) => ({
                label: p.label.trim(),
                volume: p.volume.trim(),
                notes: p.notes.trim(),
              })),
            }
          : null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }

      await addBeanSuggestion(payload)
      setSuccess(true)
      resetForm()
      setOpen(false)
      await refreshMine()
    } catch (e2) {
      setError(e2.message || 'Could not submit bean suggestion.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="bg-white/70 border border-oatmeal rounded-card shadow-card p-5 sm:p-6 mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-xl sm:text-2xl text-espresso">
          {t.suggestBean}
        </h3>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v)
            setSuccess(false)
          }}
          className="rounded-full bg-espresso text-cream px-4 py-2 text-sm font-semibold tracking-wide hover:bg-gold transition-colors"
        >
          {open ? t.cancel : t.suggestBean}
        </button>
      </div>

      {success && !open && (
        <p className="mt-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-card px-3 py-2">
          {t.beanSuggestionSubmitted}
        </p>
      )}

      {open && (
        <form onSubmit={submit} className="mt-5 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-espresso/55 font-semibold mb-3">
              {t.beanDetails}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label={t.name}
                required
                value={form.name}
                onChange={(v) => updateField('name', v)}
              />
              <Field
                label={t.origin}
                value={form.origin}
                onChange={(v) => updateField('origin', v)}
              />
              <Field
                label={t.variety}
                value={form.variety}
                onChange={(v) => updateField('variety', v)}
              />
              <Field
                label={t.elevation}
                value={form.elevation}
                onChange={(v) => updateField('elevation', v)}
                placeholder="1,800 m"
              />
              <Field
                label={t.processing}
                value={form.processing}
                onChange={(v) => updateField('processing', v)}
                placeholder="Washed"
              />
              <label className="block">
                <span className="block text-[11px] uppercase tracking-[0.16em] text-espresso/60 font-semibold mb-1">
                  {t.roastLevel}
                </span>
                <select
                  value={form.roastLevel}
                  onChange={(e) => updateField('roastLevel', e.target.value)}
                  className="w-full rounded-card border border-oatmeal bg-cream/60 px-3 py-2 text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
                >
                  {ROAST_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block mt-3">
              <span className="block text-[11px] uppercase tracking-[0.16em] text-espresso/60 font-semibold mb-1">
                Description
              </span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full resize-y rounded-card border border-oatmeal bg-cream/60 px-3 py-2 text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
              />
            </label>

            <label className="block mt-3">
              <span className="block text-[11px] uppercase tracking-[0.16em] text-espresso/60 font-semibold mb-1">
                Bean Image <span className="text-gold">*</span>
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="block text-sm text-espresso/80 file:mr-3 file:rounded-full file:border-0 file:bg-espresso file:text-cream file:px-4 file:py-1.5 file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-gold"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeRecipe}
              onChange={(e) => setIncludeRecipe(e.target.checked)}
              className="rounded border-oatmeal text-espresso focus:ring-gold/50"
            />
            <span className="text-sm font-semibold text-espresso">
              {t.includeRecipe}
            </span>
          </label>

          {includeRecipe && (
            <div className="bg-cream/60 border border-oatmeal rounded-card p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field
                  label={t.waterTemp}
                  value={form.brew.waterTemp}
                  onChange={(v) => updateBrew('waterTemp', v)}
                  placeholder="93°C"
                />
                <Field
                  label={t.totalTime}
                  value={form.brew.totalTime}
                  onChange={(v) => updateBrew('totalTime', v)}
                  placeholder="3:00"
                />
                <Field
                  label={t.ratio}
                  value={form.brew.ratio}
                  onChange={(v) => updateBrew('ratio', v)}
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
                  {form.brew.pours.map((p, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto] gap-3 items-start bg-white/70 border border-oatmeal rounded-card p-3"
                    >
                      <Field
                        label={`${t.pours} ${i + 1}`}
                        value={p.label}
                        onChange={(v) => updatePour(i, 'label', v)}
                        placeholder="Bloom"
                      />
                      <Field
                        label="Vol"
                        value={p.volume}
                        onChange={(v) => updatePour(i, 'volume', v)}
                        placeholder="45 ml"
                      />
                      <Field
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
            </div>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-card px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-card px-3 py-2">
              {t.beanSuggestionSubmitted}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-espresso text-cream px-5 py-2.5 text-sm font-semibold tracking-wide hover:bg-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '…' : t.submitBeanSuggestion}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm()
                setOpen(false)
              }}
              className="rounded-full border border-oatmeal px-5 py-2.5 text-sm font-semibold text-espresso hover:bg-cream/60 transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        </form>
      )}

      {mine.length > 0 && (
        <div className="mt-6 pt-5 border-t border-oatmeal space-y-3">
          {mine.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 bg-cream/60 border border-oatmeal rounded-card p-3"
            >
              {s.imageUrl ? (
                <img
                  src={s.imageUrl}
                  alt=""
                  className="w-12 h-12 rounded-card object-cover border border-oatmeal"
                />
              ) : (
                <div className="w-12 h-12 rounded-card bg-oatmeal/40" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-espresso truncate">
                  {s.name}
                </p>
                <p className="text-xs text-espresso/55">
                  {new Date(s.createdAt).toLocaleDateString()}
                  {s.brew ? ' · recipe' : ''}
                </p>
              </div>
              <span
                className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border ${statusPillClass(
                  s.status,
                )}`}
              >
                {t[s.status] ?? s.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Field({ label, value, onChange, placeholder, required }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-espresso/60 font-semibold mb-1">
        {label}
        {required && <span className="text-gold ml-0.5">*</span>}
      </span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-card border border-oatmeal bg-cream/60 px-3 py-2 text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
      />
    </label>
  )
}
