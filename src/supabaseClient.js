import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// eslint-disable-next-line no-console
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
// eslint-disable-next-line no-console
console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

export const supabase = createClient(supabaseUrl, supabaseKey)

fetch('https://hzysnhnyqvupyrevmflc.supabase.co/rest/v1/', {
  headers: {
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
  }
}).then(r => console.log("Supabase reachable:", r.status)).catch(e => console.log("Supabase unreachable:", e.message))
