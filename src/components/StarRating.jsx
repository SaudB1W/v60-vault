import { useEffect, useState } from 'react'
import { addRating, getRatings, updateRating } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function StarRating({ beanId }) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [ratingId, setRatingId] = useState(null)
  const [allRatings, setAllRatings] = useState([])
  const [hover, setHover] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setError('')
    getRatings(beanId)
      .then((rows) => {
        if (cancelled) return
        setAllRatings(rows)
        if (user) {
          const mine = rows.find((r) => String(r.userId) === String(user.id))
          if (mine) {
            setRating(mine.stars)
            setRatingId(mine.id)
          } else {
            setRating(0)
            setRatingId(null)
          }
        } else {
          setRating(0)
          setRatingId(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Could not load ratings.')
      })
    return () => {
      cancelled = true
    }
  }, [beanId, user])

  const persistRating = async (value) => {
    if (!user || busy) return
    setBusy(true)
    setError('')
    const previous = rating
    const previousId = ratingId
    const previousAll = allRatings
    setRating(value)
    try {
      if (ratingId) {
        const updated = await updateRating(ratingId, {
          id: ratingId,
          beanId,
          userId: user.id,
          stars: value,
        })
        setAllRatings((prev) =>
          prev.map((r) => (String(r.id) === String(ratingId) ? updated : r)),
        )
      } else {
        const created = await addRating({
          beanId,
          userId: user.id,
          stars: value,
        })
        setRatingId(created.id)
        setAllRatings((prev) => [...prev, created])
      }
    } catch (e) {
      setRating(previous)
      setRatingId(previousId)
      setAllRatings(previousAll)
      setError(e.message || 'Could not save rating.')
    } finally {
      setBusy(false)
    }
  }

  const display = hover || rating
  const count = allRatings.length
  const average =
    count === 0
      ? 0
      : allRatings.reduce((sum, r) => sum + (Number(r.stars) || 0), 0) / count

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
          role="radiogroup"
          aria-label="Rate this bean"
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= display
            return (
              <button
                key={n}
                type="button"
                disabled={!user || busy}
                onClick={() => persistRating(n === rating ? 0 : n)}
                onMouseEnter={() => setHover(n)}
                className="star-btn p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                aria-pressed={n === rating}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-7 h-7 sm:w-8 sm:h-8"
                  fill={filled ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  style={{ color: filled ? 'var(--gold)' : 'var(--lightbrown)' }}
                >
                  <path d="M12 2.5 L14.9 8.6 L21.5 9.5 L16.7 14.1 L17.9 20.6 L12 17.5 L6.1 20.6 L7.3 14.1 L2.5 9.5 L9.1 8.6 Z" />
                </svg>
              </button>
            )
          })}
        </div>
        <span className="text-sm text-espresso/70 tabular-nums">
          {rating > 0 ? `${rating} / 5` : 'Tap to rate'}
        </span>
      </div>

      <p className="text-xs text-espresso/55 tabular-nums">
        {count === 0
          ? 'No ratings yet — be the first.'
          : `Average ${average.toFixed(1)} / 5 across ${count} rating${count === 1 ? '' : 's'}.`}
      </p>

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  )
}
