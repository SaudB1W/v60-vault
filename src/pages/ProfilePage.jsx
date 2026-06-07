import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getFavorites,
  getProfile,
  getUserBeanSuggestions,
  getUserComments,
  getUserRatings,
  getUserSuggestions,
  updateProfile,
} from '../api.js'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'
import { hashPassword, verifyPassword } from '../utils/crypto.js'
import BeanCard from '../components/BeanCard.jsx'
import V60Logo from '../components/V60Logo.jsx'

const initialsFor = (name) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('') || '?'

const colorFor = (name) => {
  const palette = ['#B8966E', '#C4A882', '#3D2B1F', '#A06A4F', '#7B5A45']
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return palette[Math.abs(h) % palette.length]
}

const statusPillClass = (status) => {
  if (status === 'accepted') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'rejected') return 'bg-red-100 text-red-800 border-red-200'
  return 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

export default function ProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { language } = useLanguage()
  const t = uiStrings[language]

  const isOwner = user && String(user.id) === String(id)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [editingBio, setEditingBio] = useState(false)
  const [bioValue, setBioValue] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState({ kind: '', text: '' })

  const [activeTab, setActiveTab] = useState('ratings')
  const [ratings, setRatings] = useState([])
  const [comments, setComments] = useState([])
  const [favorites, setFavorites] = useState([])
  const [recipeSuggestions, setRecipeSuggestions] = useState([])
  const [beanSuggestions, setBeanSuggestions] = useState([])

  const refresh = async () => {
    setLoading(true)
    setErr('')
    try {
      const p = await getProfile(id)
      setProfile(p)
      if (p) {
        setNameValue(p.name ?? '')
        setBioValue(p.bio ?? '')
      }
    } catch (e) {
      setErr(e.message || 'Could not load profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Load activity once we know the profile + permissions.
  useEffect(() => {
    let cancelled = false
    if (!profile) return
    const canView = isOwner || profile.is_public !== false
    if (!canView) return

    if (isOwner) {
      Promise.all([
        getUserRatings(id),
        getUserComments(id),
        getFavorites(id),
        getUserSuggestions(id),
        getUserBeanSuggestions(id),
      ])
        .then(([r, c, f, s, bs]) => {
          if (cancelled) return
          setRatings(r)
          setComments(c)
          setFavorites(f)
          setRecipeSuggestions(s)
          setBeanSuggestions(bs)
        })
        .catch(() => {
          /* silent — tabs will just show empty */
        })
    } else {
      Promise.all([
        getUserComments(id),
        getUserSuggestions(id),
        getUserBeanSuggestions(id),
      ])
        .then(([c, s, bs]) => {
          if (cancelled) return
          setComments(c)
          setRecipeSuggestions(s.filter((x) => x.status === 'accepted'))
          setBeanSuggestions(bs.filter((x) => x.status === 'accepted'))
        })
        .catch(() => {
          /* silent */
        })
    }
    return () => {
      cancelled = true
    }
  }, [profile, isOwner, id])

  const saveProfileField = async (patch) => {
    try {
      await updateProfile(id, patch)
      setProfile((p) => ({ ...p, ...patch }))
    } catch (e) {
      setErr(e.message || 'Could not save profile.')
    }
  }

  const onSaveName = async () => {
    const trimmed = nameValue.trim()
    setEditingName(false)
    if (!trimmed || trimmed === profile?.name) return
    await saveProfileField({ name: trimmed })
  }

  const onSaveBio = async () => {
    const next = bioValue.slice(0, 160)
    setEditingBio(false)
    if ((next || '') === (profile?.bio || '')) return
    await saveProfileField({ bio: next })
  }

  const togglePublic = async () => {
    await saveProfileField({ is_public: !(profile?.is_public !== false) })
  }

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const path = `${id}-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        })
      if (uploadError) throw uploadError
      const { data: publicUrlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(path)
      const avatarUrl = publicUrlData?.publicUrl ?? null
      if (avatarUrl) {
        await saveProfileField({ avatar_url: avatarUrl })
      }
    } catch (e2) {
      setErr(e2.message || 'Could not upload photo.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const onChangePassword = async (e) => {
    e.preventDefault()
    setPwdMsg({ kind: '', text: '' })
    if (!currentPwd || !newPwd) return
    setPwdSaving(true)
    try {
      const fresh = await getProfile(id)
      const ok = await verifyPassword(currentPwd, fresh?.password ?? '')
      if (!ok) {
        setPwdMsg({ kind: 'error', text: t.passwordError })
        return
      }
      const hash = await hashPassword(newPwd)
      await updateProfile(id, { password: hash })
      setPwdMsg({ kind: 'success', text: t.passwordChanged })
      setCurrentPwd('')
      setNewPwd('')
    } catch (e2) {
      setPwdMsg({ kind: 'error', text: e2.message || 'Could not change password.' })
    } finally {
      setPwdSaving(false)
    }
  }

  const allSuggestions = useMemo(() => {
    const recipes = recipeSuggestions.map((s) => ({
      ...s,
      kind: 'recipe',
    }))
    const beans = beanSuggestions.map((s) => ({
      ...s,
      kind: 'bean',
    }))
    return [...recipes, ...beans].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )
  }, [recipeSuggestions, beanSuggestions])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-espresso/60">
        Loading…
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <V60Logo className="w-12 h-12 text-espresso/40 mb-4" />
        <h1 className="font-display text-3xl text-espresso mb-2">
          Profile not found
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

  const canView = isOwner || profile.is_public !== false

  return (
    <div className="min-h-screen bg-cream pb-16">
      <header className="grain dot-field border-b border-oatmeal/80">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-6 sm:pt-8 pb-10">
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

          <div className="mt-8 flex items-start gap-5 flex-wrap">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-[100px] h-[100px] rounded-full object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div
                className="w-[100px] h-[100px] rounded-full flex items-center justify-center font-display text-3xl text-cream border-4 border-white shadow-md"
                style={{ backgroundColor: colorFor(profile.name) }}
                aria-hidden="true"
              >
                {initialsFor(profile.name)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {isOwner && editingName ? (
                <input
                  type="text"
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={onSaveName}
                  onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                  className="font-display text-3xl sm:text-4xl text-espresso bg-transparent border-b border-oatmeal focus:outline-none focus:border-gold"
                />
              ) : (
                <h1
                  onClick={isOwner ? () => setEditingName(true) : undefined}
                  className={`font-display text-3xl sm:text-4xl text-espresso ${
                    isOwner ? 'cursor-pointer hover:text-gold transition-colors' : ''
                  }`}
                >
                  {profile.name || '—'}
                </h1>
              )}

              {isOwner && editingBio ? (
                <textarea
                  autoFocus
                  rows={2}
                  maxLength={160}
                  value={bioValue}
                  onChange={(e) => setBioValue(e.target.value)}
                  onBlur={onSaveBio}
                  className="mt-2 w-full bg-transparent border border-oatmeal rounded-card px-3 py-2 text-sm text-espresso focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
                />
              ) : (
                <p
                  onClick={isOwner ? () => setEditingBio(true) : undefined}
                  className={`mt-2 text-sm text-espresso/75 max-w-xl ${
                    isOwner ? 'cursor-pointer hover:text-espresso' : ''
                  }`}
                >
                  {profile.bio || (isOwner ? `+ ${t.bio}` : '')}
                </p>
              )}

              {isOwner && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-full border border-oatmeal bg-white/70 px-3 py-1.5 text-xs font-semibold text-espresso hover:bg-cream/60 transition-colors cursor-pointer">
                    {avatarUploading ? '…' : t.uploadPhoto}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={onAvatarChange}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={togglePublic}
                    className="rounded-full border border-oatmeal px-3 py-1.5 text-xs font-semibold text-espresso hover:bg-cream/60 transition-colors"
                  >
                    {profile.is_public !== false ? t.publicProfile : t.privateProfile}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 mt-8 sm:mt-12 space-y-8">
        {err && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-card px-4 py-3">
            {err}
          </p>
        )}

        {!canView ? (
          <p className="text-center text-espresso/70 italic py-12">
            {t.profileIsPrivate}
          </p>
        ) : isOwner ? (
          <>
            <section className="bg-white/70 border border-oatmeal rounded-card shadow-card p-6 sm:p-8">
              <h3 className="font-display text-xl sm:text-2xl text-espresso mb-4">
                {t.changePassword}
              </h3>
              <form onSubmit={onChangePassword} className="space-y-3 max-w-md">
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-[0.16em] text-espresso/60 font-semibold mb-1">
                    {t.currentPassword}
                  </span>
                  <input
                    type="password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    className="w-full rounded-card border border-oatmeal bg-cream/60 px-3 py-2 text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-[0.16em] text-espresso/60 font-semibold mb-1">
                    {t.newPassword}
                  </span>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="w-full rounded-card border border-oatmeal bg-cream/60 px-3 py-2 text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
                  />
                </label>
                {pwdMsg.text && (
                  <p
                    className={`text-sm rounded-card border px-3 py-2 ${
                      pwdMsg.kind === 'error'
                        ? 'text-red-700 bg-red-50 border-red-200'
                        : 'text-green-800 bg-green-50 border-green-200'
                    }`}
                  >
                    {pwdMsg.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pwdSaving || !currentPwd || !newPwd}
                  className="rounded-full bg-espresso text-cream px-5 py-2.5 text-sm font-semibold tracking-wide hover:bg-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {pwdSaving ? '…' : t.savePassword}
                </button>
              </form>
            </section>

            <section>
              <div className="flex flex-wrap gap-2 mb-5">
                <TabButton
                  active={activeTab === 'ratings'}
                  onClick={() => setActiveTab('ratings')}
                >
                  ⭐ {t.myRatings}
                </TabButton>
                <TabButton
                  active={activeTab === 'comments'}
                  onClick={() => setActiveTab('comments')}
                >
                  💬 {t.myComments}
                </TabButton>
                <TabButton
                  active={activeTab === 'favorites'}
                  onClick={() => setActiveTab('favorites')}
                >
                  ❤️ {t.myFavoritesTab}
                </TabButton>
                <TabButton
                  active={activeTab === 'suggestions'}
                  onClick={() => setActiveTab('suggestions')}
                >
                  📝 {t.mySuggestionsTab}
                </TabButton>
              </div>

              {activeTab === 'ratings' && <RatingsList items={ratings} />}
              {activeTab === 'comments' && <CommentsList items={comments} />}
              {activeTab === 'favorites' && (
                <FavoritesGrid items={favorites.map((f) => f.bean).filter(Boolean)} />
              )}
              {activeTab === 'suggestions' && (
                <SuggestionsList items={allSuggestions} t={t} />
              )}
            </section>
          </>
        ) : (
          <>
            <section>
              <h3 className="font-display text-xl sm:text-2xl text-espresso mb-4">
                💬 {t.myComments}
              </h3>
              <CommentsList items={comments} />
            </section>
            <section>
              <h3 className="font-display text-xl sm:text-2xl text-espresso mb-4">
                📝 {t.mySuggestionsTab}
              </h3>
              <SuggestionsList items={allSuggestions} t={t} />
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors ${
        active
          ? 'bg-espresso text-cream border-espresso'
          : 'bg-white/70 text-espresso border-oatmeal hover:bg-cream/60'
      }`}
    >
      {children}
    </button>
  )
}

function RatingsList({ items }) {
  if (items.length === 0) {
    return <p className="text-espresso/55 italic">No ratings yet.</p>
  }
  return (
    <ul className="space-y-2">
      {items.map((r) => (
        <li
          key={r.id}
          className="bg-white/70 border border-oatmeal rounded-card p-4 flex items-center justify-between gap-3"
        >
          <Link
            to={`/bean/${r.beanId}`}
            className="font-display text-lg text-espresso hover:text-gold transition-colors"
          >
            {r.beanName || r.beanId}
          </Link>
          <span className="text-sm font-semibold text-gold tabular-nums">
            {r.stars} ★
          </span>
        </li>
      ))}
    </ul>
  )
}

function CommentsList({ items }) {
  if (items.length === 0) {
    return <p className="text-espresso/55 italic">No comments yet.</p>
  }
  return (
    <ul className="space-y-3">
      {items.map((c) => (
        <li
          key={c.id}
          className="bg-white/70 border border-oatmeal rounded-card p-4"
        >
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <Link
              to={`/bean/${c.beanId}`}
              className="text-sm font-semibold text-espresso hover:text-gold transition-colors"
            >
              {c.beanName || c.beanId}
            </Link>
            <time dateTime={c.createdAt} className="text-xs text-espresso/55">
              {new Date(c.createdAt).toLocaleDateString()}
            </time>
          </div>
          <p className="text-sm text-espresso/85 whitespace-pre-wrap">{c.text}</p>
        </li>
      ))}
    </ul>
  )
}

function FavoritesGrid({ items }) {
  if (items.length === 0) {
    return <p className="text-espresso/55 italic">No favorites yet.</p>
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {items.map((bean) => (
        <BeanCard key={bean.id} bean={bean} />
      ))}
    </div>
  )
}

function SuggestionsList({ items, t }) {
  if (items.length === 0) {
    return <p className="text-espresso/55 italic">No suggestions yet.</p>
  }
  return (
    <ul className="space-y-3">
      {items.map((s) => (
        <li
          key={`${s.kind}-${s.id}`}
          className="bg-white/70 border border-oatmeal rounded-card p-4"
        >
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-xs uppercase tracking-[0.18em] text-espresso/55 font-semibold">
              {s.kind === 'bean' ? '🌱 Bean' : '📝 Recipe'}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border ${statusPillClass(
                  s.status,
                )}`}
              >
                {t[s.status] ?? s.status}
              </span>
              <time dateTime={s.createdAt} className="text-xs text-espresso/55">
                {new Date(s.createdAt).toLocaleDateString()}
              </time>
            </div>
          </div>
          <p className="text-sm font-semibold text-espresso">
            {s.kind === 'bean' ? s.name : s.beanId}
          </p>
        </li>
      ))}
    </ul>
  )
}
