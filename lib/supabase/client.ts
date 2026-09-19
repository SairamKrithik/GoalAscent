import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. Safe to instantiate multiple times — module
// caching means it resolves to the same instance per tab.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
