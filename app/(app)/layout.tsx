import { AppNav } from '@/components/AppNav'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#080D18' }}>
      <AppNav />

      {/* Main content area — overflow managed per-page so page headers can be sticky */}
      <main className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
