'use client'

import { useState } from 'react'
import type { Mission } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MissionSwitcherProps {
  missions: Mission[]
  activeMissionId: string | null
  onSelect: (missionId: string) => void
  dropdownAlignClass?: string
}

const statusStyle: Record<Mission['status'], { color: string; bg: string }> = {
  Active:    { color: '#22C55E', bg: 'rgba(34,197,94,0.15)'   },
  Archived:  { color: '#65738A', bg: 'rgba(101,115,138,0.15)' },
  Completed: { color: '#60A5FA', bg: 'rgba(96,165,250,0.15)'  },
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className="flex-none transition-transform duration-150"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function MissionSwitcher({ missions, activeMissionId, onSelect, dropdownAlignClass = 'right-0' }: MissionSwitcherProps) {
  const [open, setOpen] = useState(false)
  const active = missions.find((m) => m.mission_id === activeMissionId)

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-[9px] px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 max-w-[160px] sm:max-w-[220px]"
        style={{
          background: '#101827',
          border: '1px solid rgba(255,255,255,0.09)',
          color: '#9AA7BA',
        }}
      >
        <span className="truncate" style={{ maxWidth: '100px' }}>
          {active?.title ?? 'Select Mission'}
        </span>
        {active && (
          <span
            className="hidden sm:inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
            style={statusStyle[active.status]}
          >
            {active.status}
          </span>
        )}
        <span style={{ color: '#65738A' }}>
          <ChevronDown open={open} />
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-full z-20 mt-1.5 rounded-[12px] py-1.5 shadow-2xl overflow-hidden ${dropdownAlignClass}`}
            style={{
              background: '#101827',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              width: '18rem',
              maxWidth: '90vw',
            }}
          >
            {missions.length === 0 && (
              <p className="px-4 py-3 text-[13px]" style={{ color: '#65738A' }}>No missions yet.</p>
            )}
            {missions.map((m) => {
              const isActive = m.mission_id === activeMissionId
              const st = statusStyle[m.status]
              return (
                <button
                  key={m.mission_id}
                  onClick={() => { onSelect(m.mission_id); setOpen(false) }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors duration-100 hover:bg-white/[0.04]"
                  style={{
                    background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                    color: isActive ? '#F5F7FA' : '#9AA7BA',
                  }}
                >
                  <span className={cn('flex-1 truncate', isActive ? '' : 'pl-3')}>
                    {isActive && (
                      <span className="inline-block w-1 h-1 rounded-full mr-2 -mb-0.5" style={{ background: '#60A5FA' }} />
                    )}
                    {m.title}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={st}
                  >
                    {m.status}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
