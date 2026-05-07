import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addBean,
  deleteBean,
  deleteComment,
  deleteRating,
  getBeans,
  getComments,
  getRatings,
  getUsers,
  updateBean,
} from '../api.js'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import V60Logo from '../components/V60Logo.jsx'
import { translateText } from '../utils/translate.js'

const emptyPour = () => ({ label: '', volume: '', notes: '' })

const emptyForm = () => ({
  id: '',
  name: '',
  origin: '',
  flag: '',
  variety: '',
  elevation: '',
  processing: 'Washed',
  roastLevel: 'Light',
  description: '',
  roastery_logo_url: null,
  brew: {
    waterTemp: '',
    totalTime: '',
    ratio: '',
    pours: [emptyPour()],
  },
})

const ROAST_OPTIONS = [
  'Light',
  'Medium-Light',
  'Medium',
  'Medium-Dark',
  'Dark',
]

const PROCESS_OPTIONS = ['Washed', 'Natural', 'Honey', 'Anaerobic']

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function SectionHeader({ children, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-2xl sm:text-3xl text-espresso">
        {children}
      </h2>
      {subtitle && (
        <p className="text-sm text-espresso/60 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

export default function AdminPage() {
  const { user, logout } = useAuth()

  const [beans, setBeans] = useState([])
  const [comments, setComments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)
  const [savingBean, setSavingBean] = useState(false)
  const [logoFile, setLogoFile] = useState(null)

  const refresh = async () => {
    setLoading(true)
    setErr('')
    try {
      const [b, c, u] = await Promise.all([getBeans(), getComments(), getUsers()])
      setBeans(b)
      setComments(c)
      setUsers(u)
    } catch (e) {
      setErr(e.message || 'Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const userById = useMemo(() => {
    const map = new Map()
    users.forEach((u) => map.set(String(u.id), u))
    return map
  }, [users])

  const beanById = useMemo(() => {
    const map = new Map()
    beans.forEach((b) => map.set(String(b.id), b))
    return map
  }, [beans])

  // ---------- Bean form helpers ----------
  const startEdit = (bean) => {
    setEditingId(bean.id)
    setForm({
      id: bean.id ?? '',
      name: bean.name ?? '',
      origin: bean.origin ?? '',
      flag: bean.flag ?? '',
      variety: bean.variety ?? '',
      elevation: bean.elevation ?? '',
      processing: bean.processing ?? 'Washed',
      roastLevel: bean.roastLevel ?? 'Light',
      description: bean.description ?? '',
      roastery_logo_url: bean.roastery_logo_url ?? null,
      brew: {
        waterTemp: bean.brew?.waterTemp ?? '',
        totalTime: bean.brew?.totalTime ?? '',
        ratio: bean.brew?.ratio ?? '',
        pours:
          bean.brew?.pours && bean.brew.pours.length > 0
            ? bean.brew.pours.map((p) => ({ ...p }))
            : [emptyPour()],
      },
    })
    setLogoFile(null)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm())
    setLogoFile(null)
  }

  const updateField = (key, value) =>
    setForm((f) => ({ ...f, [key]: value }))

  const updateBrewField = (key, value) =>
    setForm((f) => ({ ...f, brew: { ...f.brew, [key]: value } }))

  const updatePour = (i, key, value) =>
    setForm((f) => {
      const next = f.brew.pours.map((p, idx) =>
        idx === i ? { ...p, [key]: value } : p,
      )
      return { ...f, brew: { ...f.brew, pours: next } }
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

  const submitBean = async (e) => {
    e.preventDefault()
    setSavingBean(true)
    setErr('')
    try {
      const id = editingId ?? (form.id.trim() || slugify(form.name))

      let roasteryLogoUrl = form.roastery_logo_url ?? null
      if (logoFile) {
        const path = `${Date.now()}-${logoFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('roastery-logos')
          .upload(path, logoFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: logoFile.type || undefined,
          })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage
          .from('roastery-logos')
          .getPublicUrl(path)
        roasteryLogoUrl = publicUrlData?.publicUrl ?? null
      }

      const trimmedPours = form.brew.pours.map((p) => ({
        label: p.label.trim(),
        volume: p.volume.trim(),
        notes: p.notes.trim(),
      }))

      const name = form.name.trim()
      const origin = form.origin.trim()
      const variety = form.variety.trim()
      const processing = form.processing
      const description = form.description.trim()

      // Pre-translate all user-facing bean text to Arabic so readers in
      // ar-mode get instant translations without an API call per page load.
      // Translation failures fall back to the English text (translateText
      // returns the input on error).
      const [name_ar, origin_ar, variety_ar, processing_ar, description_ar] =
        await Promise.all([
          translateText(name, 'ar'),
          translateText(origin, 'ar'),
          translateText(variety, 'ar'),
          translateText(processing, 'ar'),
          translateText(description, 'ar'),
        ])
      const pours_ar = await Promise.all(
        trimmedPours.map(async (p) => ({
          label: await translateText(p.label, 'ar'),
          notes: await translateText(p.notes, 'ar'),
        })),
      )

      const payload = {
        id,
        name,
        origin,
        flag: form.flag.trim(),
        variety,
        elevation: form.elevation.trim(),
        processing,
        roastLevel: form.roastLevel,
        description,
        roastery_logo_url: roasteryLogoUrl,
        brew: {
          waterTemp: form.brew.waterTemp.trim(),
          totalTime: form.brew.totalTime.trim(),
          ratio: form.brew.ratio.trim(),
          pours: trimmedPours,
        },
        name_ar,
        origin_ar,
        variety_ar,
        processing_ar,
        description_ar,
        pours_ar,
      }

      if (editingId) {
        await updateBean(editingId, payload)
      } else {
        await addBean(payload)
      }
      cancelEdit()
      await refresh()
    } catch (e2) {
      setErr(e2.message || 'Could not save bean.')
    } finally {
      setSavingBean(false)
    }
  }

  const handleDeleteBean = async (bean) => {
    if (
      !window.confirm(
        `Delete "${bean.name}"? This also removes its ratings and comments.`,
      )
    ) {
      return
    }
    try {
      // Cascade-delete related ratings and comments first.
      const [relatedRatings, relatedComments] = await Promise.all([
        getRatings(bean.id),
        getComments(bean.id),
      ])
      await Promise.all([
        ...relatedRatings.map((r) => deleteRating(r.id)),
        ...relatedComments.map((c) => deleteComment(c.id)),
      ])
      await deleteBean(bean.id)
      if (editingId === bean.id) cancelEdit()
      await refresh()
    } catch (e) {
      setErr(e.message || 'Delete failed.')
    }
  }

  const handleDeleteComment = async (id) => {
    try {
      await deleteComment(id)
      await refresh()
    } catch (e) {
      setErr(e.message || 'Delete failed.')
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-16">
      <header className="grain dot-field border-b border-oatmeal/80">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-6 sm:pt-8 pb-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-espresso/70 hover:text-espresso transition-colors"
            >
              <span aria-hidden="true">←</span> The Vault
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-espresso/65">
                Signed in as <strong>{user?.name}</strong>
              </span>
              <button
                onClick={logout}
                className="text-sm font-semibold text-espresso/70 hover:text-espresso underline-offset-2 hover:underline"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <V60Logo className="w-8 h-8 text-espresso" />
            <p className="uppercase text-[11px] tracking-[0.22em] text-gold font-semibold">
              Admin
            </p>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-espresso mt-2">
            The back of house.
          </h1>
          <p className="mt-3 text-espresso/70 max-w-2xl">
            Manage beans, recipes, and brew notes from the community.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 mt-10 space-y-12">
        {err && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-card px-4 py-3">
            {err}
          </p>
        )}

        {loading ? (
          <p className="text-espresso/60">Loading…</p>
        ) : (
          <>
            {/* Section A — Manage Beans */}
            <section>
              <SectionHeader subtitle="Add, edit, or remove beans from the vault.">
                Manage Beans
              </SectionHeader>

              <div className="bg-white/70 border border-oatmeal rounded-card shadow-card p-5 sm:p-7 mb-8">
                <h3 className="font-display text-xl text-espresso mb-4">
                  {editingId ? `Edit "${form.name || editingId}"` : 'Add a new bean'}
                </h3>

                <form onSubmit={submitBean} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Name"
                      value={form.name}
                      onChange={(v) => updateField('name', v)}
                      required
                    />
                    <Field
                      label="ID (slug)"
                      value={form.id}
                      onChange={(v) => updateField('id', v)}
                      placeholder={slugify(form.name) || 'auto-from-name'}
                      disabled={!!editingId}
                      hint={editingId ? 'IDs cannot be changed.' : 'Optional — derived from name if blank.'}
                    />
                    <Field
                      label="Origin"
                      value={form.origin}
                      onChange={(v) => updateField('origin', v)}
                      required
                    />
                    <Field
                      label="Flag emoji"
                      value={form.flag}
                      onChange={(v) => updateField('flag', v)}
                      placeholder="🇪🇹"
                    />
                    <Field
                      label="Variety"
                      value={form.variety}
                      onChange={(v) => updateField('variety', v)}
                    />
                    <Field
                      label="Elevation"
                      value={form.elevation}
                      onChange={(v) => updateField('elevation', v)}
                      placeholder="1,800 m"
                    />
                    <SelectField
                      label="Processing"
                      value={form.processing}
                      onChange={(v) => updateField('processing', v)}
                      options={PROCESS_OPTIONS}
                    />
                    <SelectField
                      label="Roast Level"
                      value={form.roastLevel}
                      onChange={(v) => updateField('roastLevel', v)}
                      options={ROAST_OPTIONS}
                    />
                  </div>

                  <TextareaField
                    label="Description"
                    value={form.description}
                    onChange={(v) => updateField('description', v)}
                    rows={3}
                  />

                  <label className="block">
                    <span className="block text-xs uppercase tracking-[0.18em] text-espresso/60 font-semibold mb-1.5">
                      Roastery Logo (optional)
                    </span>
                    {form.roastery_logo_url && !logoFile && (
                      <img
                        src={form.roastery_logo_url}
                        alt="Current roastery logo"
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md mb-2"
                      />
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
                      onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                      className="block text-sm text-espresso/80 file:mr-3 file:rounded-full file:border-0 file:bg-espresso file:text-cream file:px-4 file:py-1.5 file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-gold"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field
                      label="Water Temp"
                      value={form.brew.waterTemp}
                      onChange={(v) => updateBrewField('waterTemp', v)}
                      placeholder="93°C"
                    />
                    <Field
                      label="Total Time"
                      value={form.brew.totalTime}
                      onChange={(v) => updateBrewField('totalTime', v)}
                      placeholder="3:00"
                    />
                    <Field
                      label="Ratio"
                      value={form.brew.ratio}
                      onChange={(v) => updateBrewField('ratio', v)}
                      placeholder="1:16 (15g : 240g)"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs uppercase tracking-[0.18em] text-espresso/60 font-semibold">
                        Pours
                      </label>
                      <button
                        type="button"
                        onClick={addPour}
                        className="text-sm font-semibold text-espresso hover:text-gold underline-offset-2 hover:underline"
                      >
                        + Add pour
                      </button>
                    </div>
                    <div className="space-y-3">
                      {form.brew.pours.map((p, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto] gap-3 items-start bg-cream/60 border border-oatmeal rounded-card p-3"
                        >
                          <Field
                            label={`Pour ${i + 1} label`}
                            value={p.label}
                            onChange={(v) => updatePour(i, 'label', v)}
                            placeholder="Bloom"
                            compact
                          />
                          <Field
                            label="Volume"
                            value={p.volume}
                            onChange={(v) => updatePour(i, 'volume', v)}
                            placeholder="45 ml"
                            compact
                          />
                          <Field
                            label="Notes"
                            value={p.notes}
                            onChange={(v) => updatePour(i, 'notes', v)}
                            compact
                          />
                          <button
                            type="button"
                            onClick={() => removePour(i)}
                            className="self-end sm:self-center text-xs font-semibold text-espresso/60 hover:text-red-600 px-2 py-1.5"
                            aria-label={`Remove pour ${i + 1}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingBean}
                      className="rounded-full bg-espresso text-cream px-5 py-2.5 text-sm font-semibold tracking-wide hover:bg-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingBean
                        ? 'Saving…'
                        : editingId
                        ? 'Save changes'
                        : 'Add bean'}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-full border border-oatmeal px-5 py-2.5 text-sm font-semibold text-espresso hover:bg-cream/60 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="bg-white/70 border border-oatmeal rounded-card shadow-card overflow-hidden">
                <ul className="divide-y divide-oatmeal">
                  {beans.length === 0 && (
                    <li className="p-5 text-sm text-espresso/55 italic">
                      No beans yet — add one above.
                    </li>
                  )}
                  {beans.map((bean) => (
                    <li
                      key={bean.id}
                      className="flex items-center justify-between gap-3 p-4 sm:p-5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm text-espresso/65">
                          <span className="text-base" aria-hidden="true">{bean.flag}</span>
                          <span>{bean.origin}</span>
                          <span className="text-espresso/30">·</span>
                          <span>{bean.roastLevel}</span>
                        </div>
                        <p className="font-display text-lg sm:text-xl text-espresso truncate">
                          {bean.name}
                        </p>
                        <p className="text-xs text-espresso/45 mt-0.5">
                          id: <code>{bean.id}</code>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startEdit(bean)}
                          className="rounded-full border border-oatmeal px-3 py-1.5 text-xs font-semibold text-espresso hover:bg-cream/60 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBean(bean)}
                          className="rounded-full border border-red-200 text-red-700 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section B — Manage Comments */}
            <section>
              <SectionHeader subtitle="Moderate notes posted across the vault.">
                Manage Comments
              </SectionHeader>

              <div className="bg-white/70 border border-oatmeal rounded-card shadow-card overflow-hidden">
                {comments.length === 0 ? (
                  <p className="p-5 text-sm text-espresso/55 italic">
                    No comments yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-oatmeal">
                    {comments.map((c) => {
                      const bean = beanById.get(String(c.beanId))
                      const author =
                        c.userName ||
                        userById.get(String(c.userId))?.name ||
                        'Unknown user'
                      return (
                        <li
                          key={c.id}
                          className="p-4 sm:p-5 flex items-start gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-espresso/55">
                              <span className="font-semibold text-espresso/80">
                                {author}
                              </span>
                              <span className="text-espresso/30">·</span>
                              <span>
                                {bean ? (
                                  <Link
                                    to={`/bean/${bean.id}`}
                                    className="hover:underline"
                                  >
                                    {bean.name}
                                  </Link>
                                ) : (
                                  c.beanId
                                )}
                              </span>
                              <span className="text-espresso/30">·</span>
                              <time dateTime={c.createdAt}>
                                {new Date(c.createdAt).toLocaleString(
                                  undefined,
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  },
                                )}
                              </time>
                            </div>
                            <p className="mt-1 text-sm text-espresso whitespace-pre-wrap">
                              {c.text}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            aria-label="Delete comment"
                            title="Delete"
                            className="shrink-0 rounded-full border border-red-200 text-red-700 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 transition-colors"
                          >
                            🗑
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

// ---------- Form primitives ----------
function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  hint,
  compact,
}) {
  return (
    <label className="block">
      <span
        className={`block text-xs uppercase tracking-[0.18em] text-espresso/60 font-semibold ${
          compact ? 'mb-1' : 'mb-1.5'
        }`}
      >
        {label}
        {required && <span className="text-gold ml-0.5">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-card border border-oatmeal bg-cream/60 px-3 py-2 text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition disabled:opacity-60"
      />
      {hint && <span className="block text-[11px] text-espresso/45 mt-1">{hint}</span>}
    </label>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-[0.18em] text-espresso/60 font-semibold mb-1.5">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-card border border-oatmeal bg-cream/60 px-3 py-2 text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextareaField({ label, value, onChange, rows = 3 }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-[0.18em] text-espresso/60 font-semibold mb-1.5">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full resize-y rounded-card border border-oatmeal bg-cream/60 px-3 py-2 text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
      />
    </label>
  )
}
