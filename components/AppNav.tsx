'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logo, LogoMark } from '@/components/Logo'

import { useReviewQueue } from '@/lib/queries'

function IconDashboard() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconTrophy() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a2 2 0 0 1-2-2V5h4" />
      <path d="M18 9h2a2 2 0 0 0 2-2V5h-4" />
      <path d="M6 5v4a6 6 0 0 0 12 0V5H6Z" />
      <path d="M9 21h6M12 17v4" />
    </svg>
  )
}

function IconBrain() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.142 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.142 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/schedule',  label: 'Schedule',  Icon: IconCalendar  },
  { href: '/contests',  label: 'Contests',  Icon: IconTrophy    },
  { href: '/review',    label: 'Review',    Icon: IconBrain     },
  { href: '/profile',   label: 'Profile',   Icon: IconUser      },
]

export function AppNav() {
  const pathname = usePathname()
  const { data: reviewQueue = [] } = useReviewQueue()
  const reviewCount = reviewQueue.length

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex w-[232px] flex-shrink-0 flex-col h-screen sticky top-0"
        style={{ background: '#080D18', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-5 flex-none">
          <Logo size="md" />
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5 px-2 flex-1">
          {navItems.map(({ href, label, Icon }) => {
            const active = href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group flex items-center gap-2.5 rounded-[10px] px-3 py-[8px] text-sm transition-all duration-150',
                  active
                    ? 'font-semibold text-[#F5F7FA]'
                    : 'font-[450] text-[#65738A] hover:text-[#9AA7BA] hover:bg-white/[0.04]',
                )}
                style={active ? { background: 'rgba(59,130,246,0.12)', color: '#F5F7FA' } : {}}
              >
                <span className={cn('flex-none transition-colors duration-150',
                  active ? 'text-[#60A5FA]' : 'text-[#65738A] group-hover:text-[#9AA7BA]')}>
                  <Icon />
                </span>
                {label}
                {href === '/review' && reviewCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow-sm ring-2 ring-[#080D18]">
                    {reviewCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LogoMark size={16} />
          <span className="text-[11px] text-[#65738A]">GoalAscent v1</span>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex pb-safe"
        style={{
          background: 'rgba(8,13,24,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
        {navItems.map(({ href, label, Icon }) => {
          const active = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors duration-150',
                active ? 'text-[#60A5FA]' : 'text-[#65738A]',
              )}
            >
              <div className="relative">
                <Icon />
                {href === '/review' && reviewCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-[#080D18]">
                    {reviewCount > 99 ? '99+' : reviewCount}
                  </span>
                )}
              </div>
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
