'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setInfo('Check your email for a confirmation link.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    }

    setLoading(false)
  }

  async function handleGitHub() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) { setError(error.message) } else { setInfo('Magic link sent — check your inbox.') }
  }

  const inputCls = 'w-full rounded-[10px] px-4 py-2.5 text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 placeholder:text-[#65738A]'
  const inputStyle = { background: '#080D18', border: '1px solid rgba(255,255,255,0.07)', color: '#F5F7FA' }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: '#080D18' }}>
      <div className="w-full max-w-md">
        {/* Logo / branding */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Logo size="lg" />
          <p className="text-[13px]" style={{ color: '#65738A' }}>
            Contest &amp; Skill Mastery Engine
          </p>
        </div>

        <div className="rounded-[16px] p-8 shadow-2xl" style={{ background: '#101827', border: '1px solid rgba(255,255,255,0.09)' }}>
          {/* Mode tabs */}
          <div className="mb-6 flex rounded-[10px] p-1" style={{ background: '#080D18' }}>
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setInfo(null) }}
                className={`flex-1 rounded-[8px] py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-blue-600 text-white'
                    : 'hover:opacity-80'
                }`}
                style={mode !== m ? { color: '#65738A' } : undefined}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: '#9AA7BA' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: '#9AA7BA' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className={inputCls}
                style={inputStyle}
              />
            </div>

            {error && (
              <p className="rounded-[10px] bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-[10px] bg-green-500/10 px-3 py-2 text-sm text-green-400">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[10px] bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? 'Loading…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-xs" style={{ color: '#65738A' }}>or</span>
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGitHub}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ background: '#151F31', border: '1px solid rgba(255,255,255,0.07)', color: '#F5F7FA' }}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>

            <button
              onClick={handleMagicLink}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ background: '#151F31', border: '1px solid rgba(255,255,255,0.07)', color: '#9AA7BA' }}
            >
              ✉️ Send Magic Link
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: '#65738A' }}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
