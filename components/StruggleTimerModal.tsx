'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ProblemItem } from '@/lib/types'
import { cn } from '@/lib/utils'

// Default durations by difficulty rating bucket
function defaultDuration(rating: number | null): number {
  if (!rating) return 30
  if (rating < 1400) return 20
  if (rating < 1700) return 30
  if (rating < 2000) return 40
  if (rating < 2300) return 50
  return 60
}

interface StruggleTimerModalProps {
  open: boolean
  onClose: () => void
  problem: ProblemItem
  onComplete: (elapsedMins: number, bottleneckNote: string, viewedEditorial: boolean) => void
}

type Phase = 'idle' | 'running' | 'paused' | 'expired'

export function StruggleTimerModal({ open, onClose, problem, onComplete }: StruggleTimerModalProps) {
  const totalSecs = defaultDuration(problem.difficulty_rating) * 60
  const [remaining, setRemaining] = useState(totalSecs)
  const [phase, setPhase] = useState<Phase>('idle')
  const [bottleneckNote, setBottleneckNote] = useState('')
  const [viewedEditorial, setViewedEditorial] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)

  // Reset when opened
  useEffect(() => {
    if (open) {
      setRemaining(totalSecs)
      setPhase('idle')
      setBottleneckNote('')
      setViewedEditorial(false)
      elapsedRef.current = 0
    }
  }, [open, totalSecs])

  const tick = useCallback(() => {
    setRemaining((prev) => {
      if (prev <= 1) {
        setPhase('expired')
        return 0
      }
      return prev - 1
    })
    elapsedRef.current += 1
  }, [])

  useEffect(() => {
    if (phase === 'running') {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase, tick])

  // Visual color shifts blue → amber → red
  const pct = remaining / totalSecs
  const ringColor = pct > 0.5 ? '#3B82F6' : pct > 0.2 ? '#F59E0B' : '#EF4444'

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`

  function handleSubmit() {
    const elapsedMins = Math.ceil(elapsedRef.current / 60)
    onComplete(elapsedMins, bottleneckNote, viewedEditorial)
  }

  // SVG ring math
  const r = 70
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - pct)

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <div className="p-6">
        <h3 className="font-semibold mb-1" style={{ color: '#F5F7FA' }}>{problem.title}</h3>
        <p className="text-xs mb-6" style={{ color: '#65738A' }}>
          Struggle Timer — {defaultDuration(problem.difficulty_rating)} min
        </p>

        {/* Ring */}
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center">
            <svg width="180" height="180">
              <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle
                cx="90"
                cy="90"
                r={r}
                fill="none"
                stroke={ringColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 90 90)"
                className="transition-all duration-1000"
                style={{ filter: `drop-shadow(0 0 8px ${ringColor})` }}
              />
            </svg>
            <span
              className="absolute font-mono text-4xl font-bold"
              style={{ color: ringColor }}
            >
              {timeStr}
            </span>
          </div>
        </div>

        {/* Controls */}
        {phase !== 'expired' && (
          <div className="flex justify-center gap-3 mb-6">
            {phase === 'idle' && (
              <Button onClick={() => setPhase('running')}>▶ Start</Button>
            )}
            {phase === 'running' && (
              <Button variant="secondary" onClick={() => setPhase('paused')}>⏸ Pause</Button>
            )}
            {phase === 'paused' && (
              <Button onClick={() => setPhase('running')}>▶ Resume</Button>
            )}
            <Button
              variant="ghost"
              onClick={() => { setPhase('expired') }}
            >
              ⏹ Give Up
            </Button>
          </div>
        )}

        {/* Post-expiry: bottleneck note */}
        {phase === 'expired' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#9AA7BA' }}>
                What specifically blocked you? <span className="text-red-400">*</span>
              </label>
              <textarea
                value={bottleneckNote}
                onChange={(e) => setBottleneckNote(e.target.value)}
                rows={3}
                placeholder="e.g. Couldn't figure out the DP state formulation…"
                className="w-full rounded-[10px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 resize-none placeholder:text-[#65738A]"
                style={{ background: '#080D18', border: '1px solid rgba(255,255,255,0.07)', color: '#F5F7FA' }}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={viewedEditorial}
                onChange={(e) => setViewedEditorial(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: '#9AA7BA' }}>
                I viewed the editorial/solution{' '}
                <span className="text-red-400 text-xs">(auto-assigns RED tag)</span>
              </span>
            </label>

            <Button
              onClick={handleSubmit}
              disabled={!bottleneckNote.trim()}
              className="w-full"
            >
              Save & Close
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  )
}
