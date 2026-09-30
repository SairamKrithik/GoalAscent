'use client'

import { useMissions, useMission, useDayTasks, useContestLogs, useReviewQueue, useUserPlatformRatings, useProfile } from '@/lib/queries'
import { useAppStore } from '@/lib/store'
import { MissionSwitcher } from '@/components/MissionSwitcher'
import { KPICard } from '@/components/KPICard'
import { RatingChart } from '@/components/RatingChart'
import { Progress } from '@/components/ui/progress'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { ERROR_CATEGORIES, PLATFORM_COLORS } from '@/lib/types'
import { useEffect, useRef, useState, useCallback } from 'react'
import ReactConfetti from 'react-confetti'
import { toPng } from 'html-to-image'
import type { Mission, ContestLog } from '@/lib/types'
import { ExportCard, buildExportChartData } from '@/components/ExportCard'

const CELEBRATED_KEY = 'celebrated_missions'

function getCelebrated(): Set<string> {
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function markCelebrated(missionId: string) {
  try {
    const s = getCelebrated()
    s.add(missionId)
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...s]))
  } catch {
    // localStorage unavailable — non-fatal
  }
}

interface CelebrationModalProps {
  mission: Mission
  contestLogs: ContestLog[]
  achievedRating: number
  displayName: string
  avatarUrl: string | null
  onClose: () => void
}

function CelebrationModal({ mission, contestLogs, achievedRating, displayName, avatarUrl, onClose }: CelebrationModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [winSize, setWinSize] = useState({ w: 0, h: 0 })
  const [confettiRunning, setConfettiRunning] = useState(true)

  useEffect(() => {
    setWinSize({ w: window.innerWidth, h: window.innerHeight })
    const t = setTimeout(() => setConfettiRunning(false), 6000)
    return () => clearTimeout(t)
  }, [])

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `goalascent-${mission.platform.toLowerCase()}-${achievedRating}.png`
      a.click()
    } catch {
      // Download failed silently — non-fatal
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {confettiRunning && (
        <ReactConfetti
          width={winSize.w}
          height={winSize.h}
          recycle={confettiRunning}
          numberOfPieces={220}
          colors={['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#22C55E']}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 101, pointerEvents: 'none' }}
        />
      )}

      <div
        className="relative z-[102] mx-4 rounded-[20px] overflow-hidden shadow-2xl"
        style={{ maxWidth: 580, width: '100%', background: '#080D18', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.07)' }}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA7BA" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Celebration header */}
        <div className="px-7 pt-7 pb-5 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-[22px] font-bold text-[#F5F7FA] mb-1">Congratulations!</h2>
          <p className="text-[14px] text-[#9AA7BA]">
            You&apos;ve reached your target rating of{' '}
            <span className="text-[#60A5FA] font-bold">{mission.target_rating}</span> on {mission.platform}!
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
            <span>★</span>
            <span>{mission.baseline_rating} → {achievedRating} (+{achievedRating - (mission.baseline_rating ?? 0)})</span>
          </div>
        </div>

        {/* Export card preview */}
        <div className="px-7 pb-5">
          <p className="text-[11px] text-[#65738A] mb-3 font-medium">SHAREABLE CARD PREVIEW</p>
          <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div ref={cardRef} style={{ display: 'inline-block' }}>
              <ExportCard
                mission={mission}
                contestLogs={contestLogs}
                achievedRating={achievedRating}
                displayName={displayName}
                avatarUrl={avatarUrl}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-7 pb-7 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 rounded-[12px] py-3 text-[14px] font-semibold transition-opacity"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#fff', opacity: downloading ? 0.7 : 1 }}
          >
            {downloading ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" /> Generating…</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Export as Image</>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-5 rounded-[12px] py-3 text-[14px] font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9AA7BA', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}


const RATING_BUCKETS = [
  { label: '<1400',    min: 0,    max: 1399,    color: '#65738A' },
  { label: '1400–1700', min: 1400, max: 1699,   color: '#60A5FA' },
  { label: '1700–2000', min: 1700, max: 1999,   color: '#F59E0B' },
  { label: '2000+',    min: 2000, max: Infinity, color: '#EF4444' },
]

const ERROR_COLORS = ['#60A5FA','#F59E0B','#EF4444','#22C55E','#A78BFA','#FB923C','#F472B6','#818CF8']

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function EmptyChartState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(59,130,246,0.1)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="#60A5FA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
        </svg>
      </div>
      <p className="text-[13px] text-[#9AA7BA] font-medium">No data yet</p>
      <p className="text-[12px] text-[#65738A]">Complete problems to see your distribution</p>
    </div>
  )
}

export default function DashboardPage() {
  const { activeMissionId, setActiveMissionId } = useAppStore()
  const { data: missions = [] } = useMissions()
  const { data: mission } = useMission(activeMissionId)
  const { data: dayTasks = [] } = useDayTasks(activeMissionId)
  const { data: contestLogs = [] } = useContestLogs(activeMissionId)
  const { data: reviewQueue = [] } = useReviewQueue()
  const { data: ratings = [] } = useUserPlatformRatings()
  const { data: profile } = useProfile()

  const [showCelebration, setShowCelebration] = useState(false)

  const pinnedRatings = ratings.filter(r => r.is_pinned).slice(0, 2)

  // Auto-select first active mission if none set
  useEffect(() => {
    if (!activeMissionId && missions.length > 0) {
      const firstActive = missions.find((m) => m.status === 'Active') ?? missions[0]
      setActiveMissionId(firstActive.mission_id)
    }
  }, [activeMissionId, missions, setActiveMissionId])

  // Celebration: fire once when the user reaches target rating for a given mission
  useEffect(() => {
    if (!mission || !mission.target_rating || contestLogs.length === 0) return
    const latestRating = contestLogs[contestLogs.length - 1].new_rating
    if (latestRating === null || latestRating < mission.target_rating) return
    if (getCelebrated().has(mission.mission_id)) return
    setShowCelebration(true)
  }, [mission, contestLogs])

  // KPI computations
  const allProblems = dayTasks.flatMap((d) => d.problem_items ?? [])
  const totalProblems = allProblems.length
  const solvedProblems = allProblems.filter((p) => p.status === 'Done').length
  const completionPct = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0
  const flawlessSolves = allProblems.filter((p) => p.tag === 'GREEN').length

  const currentDay = mission
    ? differenceInCalendarDays(new Date(), parseISO(mission.start_date)) + 1
    : 0

  const diffBuckets = RATING_BUCKETS.map((b) => ({
    ...b,
    count: allProblems.filter(
      (p) =>
        p.status === 'Done' &&
        p.difficulty_rating !== null &&
        p.difficulty_rating >= b.min &&
        p.difficulty_rating <= b.max,
    ).length,
  }))

  const hasAnyDiffData = diffBuckets.some((b) => b.count > 0)

  const errorCounts = Array(8).fill(0)
  contestLogs.forEach((log) => {
    ;(log.error_entries ?? []).forEach((e) => {
      const idx = (e.category ?? 1) - 1
      if (idx >= 0 && idx < 8) errorCounts[idx]++
    })
  })
  const errorPieData = ERROR_CATEGORIES.map((cat, i) => ({
    name: cat.length > 25 ? cat.slice(0, 25) + '…' : cat,
    value: errorCounts[i],
  })).filter((d) => d.value > 0)

  const missionPct = mission
    ? Math.round((currentDay / mission.duration_days) * 100)
    : 0
  const onPace = completionPct >= missionPct

  const ratingDelta = mission
    ? (contestLogs.length > 0
        ? (contestLogs[contestLogs.length - 1].new_rating ?? 0) - (mission.baseline_rating ?? 0)
        : 0)
    : 0

  const handleCloseCelebration = useCallback(() => {
    if (mission) markCelebrated(mission.mission_id)
    setShowCelebration(false)
  }, [mission])

  const achievedRating = contestLogs.length > 0 ? (contestLogs[contestLogs.length - 1].new_rating ?? 0) : 0
  const displayName = profile?.display_name || profile?.handle || 'Achiever'
  const avatarUrl = profile?.avatar_url ?? null

  return (
    <div className="flex flex-col h-full page-enter">
      {showCelebration && mission && (
        <CelebrationModal
          mission={mission}
          contestLogs={contestLogs}
          achievedRating={achievedRating}
          displayName={displayName}
          avatarUrl={avatarUrl}
          onClose={handleCloseCelebration}
        />
      )}

      {/* ── Sticky Header ──────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-start gap-3 px-6 pt-6 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] sm:text-[28px] font-bold text-[#F5F7FA] tracking-tight leading-none truncate">
            {mission ? mission.title : 'Mission Dashboard'}
          </h1>
          <p className="text-[13px] text-[#65738A] mt-1.5">
            {mission
              ? `Started ${format(parseISO(mission.start_date), 'MMM d, yyyy')} · ${mission.duration_days}-day mission`
              : 'Select a mission to begin'}
          </p>
        </div>
        <div className="flex items-center shrink-0">
          <MissionSwitcher
            missions={missions}
            activeMissionId={activeMissionId}
            onSelect={setActiveMissionId}
            dropdownAlignClass="left-0 sm:left-auto sm:right-0"
          />
        </div>
      </div>

      {/* ── Scrollable Body ────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="p-6 space-y-5">

      {/* ── Pinned Platforms ───────────────── */}
      {pinnedRatings.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {pinnedRatings.map(r => (
            <div key={r.platform} className="flex-1 rounded-[16px] p-4 flex items-center justify-between" style={{ background: '#101827', border: '1px solid rgba(255,255,255,0.07)' }}>
               <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 rounded-full" style={{ background: PLATFORM_COLORS[r.platform] || '#60A5FA' }} />
                 <span className="text-[14px] font-semibold text-[#F5F7FA]">{r.platform}</span>
               </div>
               <span className="text-[18px] font-bold font-mono text-[#F5F7FA]">{r.rating}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Rating progress banner ────────── */}
      {mission && (
        <div className="rounded-[16px] p-5 space-y-4"
          style={{ background: '#101827', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Rating endpoints + pace badge */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[11px] text-[#65738A] mb-1">Baseline</p>
                <p className="text-[22px] font-bold font-mono text-[#9AA7BA] leading-none">
                  {mission.baseline_rating ?? '—'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-[#65738A]">
                <ChevronRight />
                {ratingDelta !== 0 && (
                  <span className={`text-[12px] font-semibold ${ratingDelta > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {ratingDelta > 0 ? '+' : ''}{ratingDelta}
                  </span>
                )}
                <ChevronRight />
              </div>

              <div>
                <p className="text-[11px] text-[#65738A] mb-1">Target</p>
                <p className="text-[22px] font-bold font-mono text-[#60A5FA] leading-none">
                  {mission.target_rating ?? '—'}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                onPace
                  ? 'bg-[#22C55E]/12 text-[#22C55E]'
                  : 'bg-[#EF4444]/12 text-[#EF4444]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${onPace ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
              {onPace ? 'On Pace' : 'Behind Pace'}
            </span>
          </div>

          {/* Day + completion bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#65738A]">Day {currentDay} of {mission.duration_days}</span>
              <span className="text-[#9AA7BA] font-medium">{completionPct}% complete</span>
            </div>
            <div className="relative">
              <Progress value={missionPct} color="amber" className="h-1.5" />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${completionPct}%`, height: '6px' }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#65738A]">
              <span>Timeline ({missionPct}%)</span>
              <span>Completion ({completionPct}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI grid ─────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard
          label="Completion"
          value={`${completionPct}%`}
          subtext={`${solvedProblems} / ${totalProblems}`}
          accentColor="blue"
        />
        <KPICard
          label="Current Day"
          value={mission ? `Day ${currentDay}` : '—'}
          subtext={mission ? `of ${mission.duration_days}` : ''}
          accentColor="amber"
        />
        <KPICard
          label="Flawless"
          value={flawlessSolves}
          subtext="GREEN solves"
          accentColor="green"
        />
        <KPICard
          label="Review Queue"
          value={reviewQueue.length}
          subtext={reviewQueue.length > 0 ? 'due today' : 'all clear'}
          accentColor={reviewQueue.length > 0 ? 'red' : 'green'}
        />
      </div>

      {/* ── Charts row ────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Rating Trajectory */}
        <div className="rounded-[14px] border p-5"
          style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-[14px] font-semibold text-[#F5F7FA] mb-4 text-center">Rating Trajectory</p>
          {mission ? (
            <RatingChart
              contestLogs={contestLogs}
              baseline={mission.baseline_rating ?? 0}
              target={mission.target_rating ?? 0}
              durationDays={mission.duration_days}
              startDate={mission.start_date}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <IconTarget />
              <p className="text-[13px] text-[#65738A]">No mission selected</p>
            </div>
          )}
        </div>

        {/* Difficulty Distribution */}
        <div className="rounded-[14px] border p-5"
          style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-[14px] font-semibold text-[#F5F7FA] mb-4 text-center">Difficulty Distribution</p>
          {hasAnyDiffData ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={diffBuckets} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#65738A', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: '#65738A', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#151F31',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10,
                    fontSize: 12,
                    color: '#F5F7FA',
                  }}
                  labelStyle={{ color: '#9AA7BA' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="count" name="Solved" radius={[5, 5, 0, 0]}>
                  {diffBuckets.map((b) => (
                    <Cell key={b.label} fill={b.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState />
          )}
        </div>
      </div>

      {/* ── Error Taxonomy ────────────────── */}
      {errorPieData.length > 0 && (
        <div className="rounded-[14px] border p-5"
          style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-[14px] font-semibold text-[#F5F7FA] mb-4 text-center">Contest Error Taxonomy</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={errorPieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                dataKey="value"
                paddingAngle={2}
              >
                {errorPieData.map((_entry, i) => (
                  <Cell key={i} fill={ERROR_COLORS[i % ERROR_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#151F31',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  fontSize: 12,
                  color: '#F5F7FA',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#65738A' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      </div>
      </div>
    </div>
  )
}
