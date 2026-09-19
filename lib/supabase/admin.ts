import { createClient } from '@supabase/supabase-js'

// Server-only admin client. NEVER import this in client components or lib/queries.ts.
// The service key bypasses RLS — only use it for infrastructure tasks (bucket setup).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin env vars')
  return createClient(url, key, { auth: { persistSession: false } })
}
