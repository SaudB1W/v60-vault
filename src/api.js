// Thin Supabase wrapper.
// Components see camelCase fields (beanId, userId, userName, createdAt,
// roastLevel) — the column names in Supabase are snake_case, so this file
// maps both ways. Function names and signatures match the original API
// so the rest of the app is untouched.

import { supabase } from './supabaseClient.js'
import { beans as seedBeansData } from './data/beans.js'

// ---------- Generic helpers ----------
const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}

const renameKeys = (obj, map) => {
  if (obj == null) return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    out[map[k] ?? k] = v
  }
  return out
}

const mapMany = (rows, mapper) =>
  Array.isArray(rows) ? rows.map(mapper) : rows

// ---------- Field-name maps (camelCase ↔ snake_case) ----------
// Note: keys nested inside the `brew` jsonb column (waterTemp, totalTime,
// ratio, pours[].label/volume/notes) are JSON values, not Postgres columns,
// so they keep their original camelCase casing in the database.
const BEAN_TO_DB = { roastLevel: 'roast_level' }
const BEAN_FROM_DB = { roast_level: 'roastLevel' }

const RATING_TO_DB = { beanId: 'bean_id', userId: 'user_id' }
const RATING_FROM_DB = { bean_id: 'beanId', user_id: 'userId' }

const COMMENT_TO_DB = {
  beanId: 'bean_id',
  userId: 'user_id',
  userName: 'user_name',
  createdAt: 'created_at',
}
const COMMENT_FROM_DB = {
  bean_id: 'beanId',
  user_id: 'userId',
  user_name: 'userName',
  created_at: 'createdAt',
}

const SUGGESTION_TO_DB = {
  beanId: 'bean_id',
  userId: 'user_id',
  userName: 'user_name',
  makeMain: 'make_main',
  createdAt: 'created_at',
}
const SUGGESTION_FROM_DB = {
  bean_id: 'beanId',
  user_id: 'userId',
  user_name: 'userName',
  make_main: 'makeMain',
  created_at: 'createdAt',
}

const stripNonBeanColumns = (b) => {
  if (b == null) return b
  // eslint-disable-next-line no-unused-vars
  const { rating: _r, comments: _c, ...rest } = b
  return rest
}
const beanToDb = (b) => renameKeys(stripNonBeanColumns(b), BEAN_TO_DB)
const beanFromDb = (r) => renameKeys(r, BEAN_FROM_DB)
const ratingToDb = (r) => renameKeys(r, RATING_TO_DB)
const ratingFromDb = (r) => renameKeys(r, RATING_FROM_DB)
const commentToDb = (c) => renameKeys(c, COMMENT_TO_DB)
const commentFromDb = (r) => renameKeys(r, COMMENT_FROM_DB)
const suggestionToDb = (s) => renameKeys(s, SUGGESTION_TO_DB)
const suggestionFromDb = (r) => renameKeys(r, SUGGESTION_FROM_DB)

// ---------- Beans ----------
export const getBeans = async () => {
  const rows = unwrap(await supabase.from('beans').select('*'))
  return mapMany(rows, beanFromDb)
}

export const getBean = async (id) => {
  const row = unwrap(
    await supabase.from('beans').select('*').eq('id', id).maybeSingle(),
  )
  return beanFromDb(row)
}

export const addBean = async (bean) => {
  const row = unwrap(
    await supabase.from('beans').insert(beanToDb(bean)).select().single(),
  )
  return beanFromDb(row)
}

export const updateBean = async (id, bean) => {
  const row = unwrap(
    await supabase
      .from('beans')
      .update(beanToDb(bean))
      .eq('id', id)
      .select()
      .single(),
  )
  return beanFromDb(row)
}

export const deleteBean = async (id) =>
  unwrap(await supabase.from('beans').delete().eq('id', id))

// ---------- Comments ----------
export const getComments = async (beanId) => {
  let q = supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false })
  if (beanId !== undefined) q = q.eq('bean_id', beanId)
  const rows = unwrap(await q)
  return mapMany(rows, commentFromDb)
}

export const addComment = async (comment) => {
  const row = unwrap(
    await supabase
      .from('comments')
      .insert(commentToDb(comment))
      .select()
      .single(),
  )
  return commentFromDb(row)
}

export const deleteComment = async (id) =>
  unwrap(await supabase.from('comments').delete().eq('id', id))

// ---------- Ratings ----------
export const getRatings = async (beanId, userId) => {
  let q = supabase.from('ratings').select('*')
  if (beanId !== undefined) q = q.eq('bean_id', beanId)
  if (userId !== undefined) q = q.eq('user_id', userId)
  const rows = unwrap(await q)
  return mapMany(rows, ratingFromDb)
}

export const addRating = async (rating) => {
  const row = unwrap(
    await supabase
      .from('ratings')
      .insert(ratingToDb(rating))
      .select()
      .single(),
  )
  return ratingFromDb(row)
}

export const updateRating = async (id, rating) => {
  const row = unwrap(
    await supabase
      .from('ratings')
      .update(ratingToDb(rating))
      .eq('id', id)
      .select()
      .single(),
  )
  return ratingFromDb(row)
}

export const deleteRating = async (id) =>
  unwrap(await supabase.from('ratings').delete().eq('id', id))

// ---------- Suggestions ----------
export const getSuggestions = async (beanId) => {
  let q = supabase
    .from('suggestions')
    .select('*')
    .order('created_at', { ascending: false })
  if (beanId !== undefined) q = q.eq('bean_id', beanId)
  const rows = unwrap(await q)
  return mapMany(rows, suggestionFromDb)
}

export const getUserSuggestions = async (userId) => {
  const rows = unwrap(
    await supabase
      .from('suggestions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  )
  return mapMany(rows, suggestionFromDb)
}

export const addSuggestion = async (suggestion) => {
  const row = unwrap(
    await supabase
      .from('suggestions')
      .insert(suggestionToDb(suggestion))
      .select()
      .single(),
  )
  return suggestionFromDb(row)
}

export const updateSuggestion = async (id, updates) => {
  const row = unwrap(
    await supabase
      .from('suggestions')
      .update(suggestionToDb(updates))
      .eq('id', id)
      .select()
      .single(),
  )
  return suggestionFromDb(row)
}

export const deleteSuggestion = async (id) =>
  unwrap(await supabase.from('suggestions').delete().eq('id', id))

// ---------- Profiles ----------
// Auth identity now lives in Supabase Auth; profiles holds the
// app-visible fields (id, name, email, role). Exported as getUsers so
// existing call sites that just want a directory of accounts keep working.
export const getUsers = async () =>
  unwrap(await supabase.from('profiles').select('*'))

// ---------- Seed (run once on first load if beans table is empty) ----------
let seedAttempted = false
export const seedBeansIfEmpty = async () => {
  if (seedAttempted) return
  seedAttempted = true
  try {
    const { count, error } = await supabase
      .from('beans')
      .select('*', { count: 'exact', head: true })
    if (error) throw error
    if (count && count > 0) return
    // Strip vestigial fields that aren't real columns in the recreated
    // schema (rating + comments live in their own tables; roastery_logo_url
    // is set later via the admin form, not seeded).
    const payload = seedBeansData.map((b) => {
      const allowed = {
        id: b.id,
        name: b.name,
        origin: b.origin,
        flag: b.flag,
        variety: b.variety,
        elevation: b.elevation,
        processing: b.processing,
        roastLevel: b.roastLevel,
        description: b.description,
        brew: b.brew,
      }
      return beanToDb(allowed)
    })
    const { error: insertError } = await supabase.from('beans').insert(payload)
    if (insertError) throw insertError
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[v60-vault] Bean seed skipped:', err.message ?? err)
  }
}
