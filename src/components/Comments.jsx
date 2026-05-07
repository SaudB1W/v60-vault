import { useEffect, useState } from 'react'
import { addComment, deleteComment, getComments } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { uiStrings } from '../utils/uiStrings.js'

const formatTimestamp = (iso) => {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function Comments({ beanId }) {
  const { user } = useAuth()
  const { language } = useLanguage()
  const t = uiStrings[language]
  const isAdmin = user?.role === 'admin'

  const [comments, setComments] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getComments(beanId)
      .then((rows) => {
        if (cancelled) return
        setComments(rows)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Could not load comments.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [beanId])

  const submit = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !user) return
    setPosting(true)
    setError('')
    try {
      const created = await addComment({
        beanId,
        userId: user.id,
        userName: user.name,
        text,
        createdAt: new Date().toISOString(),
      })
      setComments((prev) => [created, ...prev])
      setDraft('')
    } catch (err) {
      setError(err.message || 'Could not post comment.')
    } finally {
      setPosting(false)
    }
  }

  const remove = async (id) => {
    setError('')
    try {
      await deleteComment(id)
      setComments((prev) => prev.filter((c) => String(c.id) !== String(id)))
    } catch (err) {
      setError(err.message || 'Could not delete comment.')
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="comment" className="sr-only">
          {t.addComment}
        </label>
        <textarea
          id="comment"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Share your tweak — grind size, swirl pattern, what you tasted…"
          className="w-full resize-y rounded-card border border-oatmeal bg-cream/60 px-4 py-3 text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-espresso/50">
            {user ? `Posting as ${user.name}.` : 'Sign in to post.'}
          </p>
          <button
            type="submit"
            disabled={!draft.trim() || !user || posting}
            className="inline-flex items-center gap-2 rounded-full bg-espresso text-cream px-5 py-2 text-sm font-semibold tracking-wide hover:bg-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {posting ? '…' : t.submitComment}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-card px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {loading && (
          <p className="text-sm text-espresso/50 italic">Loading notes…</p>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-sm text-espresso/50 italic">
            No notes yet. Brew it, taste it, leave the first one.
          </p>
        )}
        {comments.map((c) => (
          <article
            key={c.id}
            className="bg-cream/60 border border-oatmeal rounded-card p-4"
          >
            <p className="text-espresso whitespace-pre-wrap">{c.text}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-espresso/55">
              <span>
                <span className="font-semibold text-espresso/80">
                  {c.userName || 'Anonymous'}
                </span>
                <span className="text-espresso/30 mx-1.5">·</span>
                <time dateTime={c.createdAt}>
                  {formatTimestamp(c.createdAt)}
                </time>
              </span>
              {isAdmin && (
                <button
                  onClick={() => remove(c.id)}
                  className="text-espresso/40 hover:text-red-700 underline-offset-2 hover:underline"
                  aria-label="Delete this note"
                  title="Delete (admin)"
                >
                  🗑
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
