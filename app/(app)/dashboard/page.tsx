'use client'

import { useMissions, useMission, useDayTasks, useContestLogs, useProfileStats, useReviewQueue } from '@/lib/queries'
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
import { ERROR_CATEGORIES } from '@/lib/types'

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
  const { data: stats } = useProfileStats()
  const { data: reviewQueue = [] } = useReviewQueue()

  // Auto-select first active mission if none set
  if (!activeMissionId && missions.length > 0) {
    const firstActive = missions.find((m) => m.status === 'Active') ?? missions[0]
    setActiveMissionId(firstActive.mission_id)
  }

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

  return (
    <div className="flex flex-col h-full page-enter">
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
          />
        </div>
      </div>

      {/* ── Scrollable Body ────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="p-6 space-y-5">

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
          <p className="text-[14px] font-semibold text-[#F5F7FA] mb-4">Rating Trajectory</p>
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
          <p className="text-[14px] font-semibold text-[#F5F7FA] mb-4">Difficulty Distribution</p>
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
          <p className="text-[14px] font-semibold text-[#F5F7FA] mb-4">Contest Error Taxonomy</p>
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
