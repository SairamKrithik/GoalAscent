'use client'

import { useState } from 'react'
import { useReviewQueue, useResolveReview } from '@/lib/queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PLATFORM_COLORS } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

const TAG_OPTIONS: Array<{ value: string; label: string; color: string; bg: string; border: string }> = [
  { value: 'GREEN',  label: 'Solved cleanly',      color: '#22C55E', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)'  },
  { value: 'YELLOW', label: 'Got it with hints',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  { value: 'RED',    label: 'Needed full solution', color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)'  },
]

function EmptyQueue() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.15)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="#22C55E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[17px] font-semibold text-[#F5F7FA]">All caught up</p>
        <p className="text-[13px] text-[#65738A] mt-1.5 max-w-xs">
          No reviews due today. Problems tagged RED or YELLOW will appear here on their scheduled dates.
        </p>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const { data: reviewQueue = [], isLoading } = useReviewQueue()
  const resolveReview = useResolveReview()
  const [resolving, setResolving] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<Record<string, string>>({})

  async function handleResolve(reviewId: string) {
    const tag = selectedTag[reviewId]
    if (!tag) { toast.error('Select an outcome tag before marking resolved'); return }

    setResolving(reviewId)
    try {
      await resolveReview.mutateAsync({ reviewId, resolvedTag: tag })
      toast.success('Review marked resolved')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to resolve review')
    } finally {
      setResolving(null)
    }
  }

  function setTag(reviewId: string, tag: string) {
    setSelectedTag((prev) => ({ ...prev, [reviewId]: prev[reviewId] === tag ? '' : tag }))
  }

  return (
    <div className="flex flex-col h-full page-enter">
      {/* ── Sticky Header ──────────────────── */}
      <div className="shrink-0 px-6 pt-6 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 className="text-[28px] font-bold text-[#F5F7FA] tracking-tight leading-none">Review</h1>
        <p className="text-[13px] text-[#65738A] mt-1.5">
          {isLoading
            ? 'Loading…'
            : reviewQueue.length === 0
            ? 'All caught up — nothing due today'
            : `${reviewQueue.length} problem${reviewQueue.length === 1 ? '' : 's'} due for review`}
        </p>
      </div>

      {/* ── Scrollable Body ────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="p-6 space-y-5">

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 border-[#3B82F6]/30 border-t-[#3B82F6] animate-spin" />
        </div>
      ) : reviewQueue.length === 0 ? (
        <EmptyQueue />
      ) : (
        <div className="space-y-3">
          {reviewQueue.map((item) => {
            const problem = (item as any).problem_items
            if (!problem) return null
            const platformColor = PLATFORM_COLORS[problem.platform] ?? '#6B7280'
            const chosen = selectedTag[item.review_id] ?? ''

            return (
              <div
                key={item.review_id}
                className="rounded-[14px] border p-5 space-y-4 transition-all duration-150 hover:border-white/[0.12]"
                style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                {/* Problem header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                        style={{ background: platformColor + '20', color: platformColor }}
                      >
                        {problem.platform}
                      </span>
                      <Badge variant={item.origin_tag === 'RED' ? 'red' : 'yellow'}>
                        {item.origin_tag}
                      </Badge>
                    </div>

                    <p className="text-[15px] font-semibold text-[#F5F7FA] leading-snug">
                      {problem.title}
                    </p>

                    <div className="flex flex-wrap gap-3 text-[12px] text-[#65738A]">
                      {problem.difficulty_rating && (
                        <span>CF {problem.difficulty_rating}</span>
                      )}
                      <span>Due {format(parseISO(item.due_date), 'MMM d, yyyy')}</span>
                      {item.attempt_number && <span>Attempt #{item.attempt_number}</span>}
                    </div>

                    {problem.url && (
                      <a
                        href={problem.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-[#60A5FA] hover:underline"
                      >
                        Open problem
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 7h10v10M7 17 17 7" />
                        </svg>
                      </a>
                    )}

                    {problem.rationale && (
                      <p className="text-[12px] text-[#9AA7BA] italic border-l-2 pl-3"
                        style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                        {problem.rationale}
                      </p>
                    )}
                  </div>
                </div>

                {/* Outcome selector */}
                <div>
                  <p className="text-[11px] text-[#65738A] mb-2.5 font-medium">How did the re-attempt go?</p>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map((opt) => {
                      const isChosen = chosen === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setTag(item.review_id, opt.value)}
                          className="rounded-full px-3 py-1.5 text-[12px] font-semibold border transition-all duration-150 active:scale-[0.97]"
                          style={isChosen
                            ? { background: opt.bg, color: opt.color, borderColor: opt.border }
                            : { background: 'transparent', color: '#65738A', borderColor: 'rgba(255,255,255,0.08)' }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleResolve(item.review_id)}
                    disabled={!chosen || resolving === item.review_id}
                  >
                    {resolving === item.review_id ? 'Saving…' : 'Mark Resolved'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
      </div>
    </div>
  )
}
