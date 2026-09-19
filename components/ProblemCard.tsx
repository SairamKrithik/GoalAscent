'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ProblemItem, ProblemStatus, ReviewTag } from '@/lib/types'
import { PLATFORM_COLORS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { StruggleTimerModal } from '@/components/StruggleTimerModal'

interface ProblemCardProps {
  problem: ProblemItem
  onUpdate?: (updated: ProblemItem) => void
}

const STATUS_CYCLE: Record<ProblemStatus, ProblemStatus> = {
  'Pending': 'In Progress',
  'In Progress': 'Done',
  'Done': 'Skipped',
  'Skipped': 'Pending',
}

const TAG_LABELS: Record<ReviewTag, string> = {
  GREEN: '✅ GREEN',
  YELLOW: '🟡 YELLOW',
  RED: '🔴 RED',
}

const TAG_VARIANT_MAP: Record<ReviewTag, 'green' | 'yellow' | 'red'> = {
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
}

export function ProblemCard({ problem: initial, onUpdate }: ProblemCardProps) {
  const [problem, setProblem] = useState(initial)
  const [timerOpen, setTimerOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const supabase = createClient()

  async function patchProblem(patch: Partial<ProblemItem>) {
    const updated = { ...problem, ...patch } as ProblemItem
    setProblem(updated) // optimistic

    const { error } = await supabase
      .from('problem_items')
      .update(patch)
      .eq('problem_id', problem.problem_id)

    if (error) {
      setProblem(problem) // rollback
      toast.error('Failed to update: ' + error.message)
    } else {
      onUpdate?.(updated)
    }
  }

  async function cycleStatus() {
    const next = STATUS_CYCLE[problem.status]
    const patch: Partial<ProblemItem> = {
      status: next,
      solved_at: next === 'Done' ? new Date().toISOString() : null,
    }
    await patchProblem(patch)
  }

  async function setTag(tag: ReviewTag | null) {
    await patchProblem({ tag })
  }

  const statusColors: Record<ProblemStatus, string> = {
    'Pending':     'bg-[#1A263A] text-[#65738A]',
    'In Progress': 'bg-blue-500/20 text-blue-400',
    'Done':        'bg-emerald-500/20 text-emerald-400',
    'Skipped':     'bg-white/[0.05] text-[#65738A]',
  }

  const platformColor = PLATFORM_COLORS[problem.platform] ?? '#94A3B8'

  return (
    <>
      <div className="rounded-[14px] border p-4 transition-colors hover:border-white/[0.12]"
        style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-start gap-3">
          {/* Status toggle */}
          <button
            onClick={cycleStatus}
            title="Cycle status"
            className={cn(
              'mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs transition-colors',
              problem.status === 'Done'
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                : 'border-white/[0.12] text-[#65738A] hover:border-blue-500',
            )}
          >
            {problem.status === 'Done' ? '✓' : ''}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Platform badge */}
              <span
                className="rounded px-1.5 py-0.5 text-xs font-bold uppercase"
                style={{ backgroundColor: platformColor + '22', color: platformColor }}
              >
                {problem.platform}
              </span>
              {problem.problem_number && (
                <span className="font-mono text-xs text-[#65738A]">
                  #{problem.problem_number}
                </span>
              )}
              {problem.difficulty_rating && (
                <span className="font-mono text-xs text-[#9AA7BA]">
                  ★ {problem.difficulty_rating}
                </span>
              )}
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-xs font-medium', statusColors[problem.status])}>
                {problem.status}
              </span>
            </div>

            {/* Title */}
            <a
              href={problem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm font-medium text-[#F5F7FA] hover:text-blue-400 hover:underline"
            >
              {problem.slot && <span className="text-[#65738A] mr-1">{problem.slot}.</span>}
              {problem.title}
            </a>

            {/* Tags row */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(['GREEN', 'YELLOW', 'RED'] as ReviewTag[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(problem.tag === t ? null : t)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                    problem.tag === t
                      ? t === 'GREEN'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : t === 'YELLOW'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                        : 'border-red-500 bg-red-500/20 text-red-400'
                      : 'border-white/[0.09] text-[#65738A] hover:border-white/[0.20]',
                  )}
                >
                  {TAG_LABELS[t]}
                </button>
              ))}

              <button
                onClick={() => setTimerOpen(true)}
                className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs transition-colors hover:border-blue-500 hover:text-blue-400"
                style={{ border: '1px solid rgba(255,255,255,0.09)', color: '#65738A' }}
              >
                ⏱ {problem.struggle_time_mins > 0 ? `${problem.struggle_time_mins}m` : 'Timer'}
              </button>
            </div>

            {/* Rationale */}
            {problem.rationale && (
              <p className="mt-2 text-xs italic" style={{ color: '#65738A' }}>{problem.rationale}</p>
            )}
          </div>
        </div>
      </div>

      <StruggleTimerModal
        open={timerOpen}
        onClose={() => setTimerOpen(false)}
        problem={problem}
        onComplete={(mins, note, viewedEditorial) => {
          patchProblem({
            struggle_time_mins: mins,
            bottleneck_note: note || null,
            viewed_editorial: viewedEditorial,
            tag: viewedEditorial ? 'RED' : problem.tag,
          })
          setTimerOpen(false)
        }}
      />
    </>
  )
}
