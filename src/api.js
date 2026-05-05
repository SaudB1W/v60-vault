// Thin fetch() wrapper around the json-server backend.
// Run alongside Vite with: npm run server  (port 3001)

const BASE = 'http://localhost:3001'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status} ${res.statusText} — ${path} ${body}`)
  }
  // DELETE typically returns {}
  if (res.status === 204) return null
  return res.json()
}

// ---------- Beans ----------
export const getBeans = () => request('/beans')
export const getBean = (id) => request(`/beans/${id}`)
export const addBean = (bean) =>
  request('/beans', { method: 'POST', body: JSON.stringify(bean) })
export const updateBean = (id, bean) =>
  request(`/beans/${id}`, { method: 'PUT', body: JSON.stringify(bean) })
export const deleteBean = (id) =>
  request(`/beans/${id}`, { method: 'DELETE' })

// ---------- Comments ----------
export const getComments = (beanId) =>
  request(beanId ? `/comments?beanId=${encodeURIComponent(beanId)}&_sort=createdAt&_order=desc` : '/comments?_sort=createdAt&_order=desc')
export const addComment = (comment) =>
  request('/comments', { method: 'POST', body: JSON.stringify(comment) })
export const deleteComment = (id) =>
  request(`/comments/${id}`, { method: 'DELETE' })

// ---------- Ratings ----------
export const getRatings = (beanId, userId) => {
  const params = new URLSearchParams()
  if (beanId !== undefined) params.set('beanId', beanId)
  if (userId !== undefined) params.set('userId', userId)
  const qs = params.toString()
  return request(`/ratings${qs ? `?${qs}` : ''}`)
}
export const addRating = (rating) =>
  request('/ratings', { method: 'POST', body: JSON.stringify(rating) })
export const updateRating = (id, rating) =>
  request(`/ratings/${id}`, { method: 'PUT', body: JSON.stringify(rating) })
export const deleteRating = (id) =>
  request(`/ratings/${id}`, { method: 'DELETE' })

// ---------- Users ----------
export const getUsers = () => request('/users')
export const addUser = (user) =>
  request('/users', { method: 'POST', body: JSON.stringify(user) })
