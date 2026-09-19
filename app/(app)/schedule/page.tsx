'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { differenceInCalendarDays, startOfDay, parseISO } from 'date-fns'
import { useMissions, useDayTasks, useContestLogs, useUpdateProblem, useUpsertDayTask, useCreateContestLog, useDeleteSchedule } from '@/lib/queries'
import { useAppStore } from '@/lib/store'
import { MissionSwitcher } from '@/components/MissionSwitcher'
import { ProblemCard } from '@/components/ProblemCard'
import { ImportDialog } from '@/components/ImportDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { DayTask, ProblemItem, ContestLog, ErrorEntry, Mission, ProblemStatus } from '@/lib/types'

const STATUS_OPTIONS: Array<{ value: ProblemStatus | 'All'; label: string }> = [
  { value: 'All', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Done', label: 'Done' },
  { value: 'Skipped', label: 'Skipped' },
]

const PLATFORMS = ['Codeforces', 'LeetCode', 'AtCoder', 'HackerRank', 'CodeChef', 'Other']

const inputCls = 'w-full rounded-[10px] border px-3 py-2 text-[13px] text-[#F5F7FA] outline-none transition-all duration-150 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 placeholder:text-[#65738A]'
const inputStyle = { background: '#080D18', borderColor: 'rgba(255,255,255,0.07)' }
const labelCls = 'block text-[11px] font-medium text-[#65738A] mb-1.5'

// ─── Utility ──────────────────────────────────────────────────────────────────

function dateForDay(startDate: string, dayNumber: number): string {
  const d = new Date(startDate)
  d.setDate(d.getDate() + dayNumber - 1)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isContestDay(day: DayTask): boolean {
  return day.drill_type === 'contest'
}

// ─── Contest Day Card ─────────────────────────────────────────────────────────

interface ContestDayCardProps {
  day: DayTask
  contestLogs: ContestLog[]
  missionId: string
  startDate: string
}

interface ProblemEntry {
  name: string
  url: string
}

function ContestDayCard({ day, contestLogs, missionId, startDate }: ContestDayCardProps) {
  const createContestLog = useCreateContestLog()
  const upsertDayTask = useUpsertDayTask()

  const existingLog = contestLogs.find((c) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + day.day_number - 1)
    return c.contest_date === d.toISOString().slice(0, 10)
  })

  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({
    platform: existingLog?.platform ?? 'Codeforces',
    contest_name: existingLog?.contest_name ?? '',
    problems_solved: existingLog?.problems_solved != null ? String(existingLog.problems_solved) : '',
    total_time_mins: existingLog?.total_time_mins != null ? String(existingLog.total_time_mins) : '',
    penalties: existingLog?.penalties != null ? String(existingLog.penalties) : '0',
    rank_percentile: existingLog?.rank_percentile ?? '',
    rating_delta: existingLog?.rating_delta != null ? String(existingLog.rating_delta) : '',
    new_rating: existingLog?.new_rating != null ? String(existingLog.new_rating) : '',
  })
  const [problems, setProblems] = useState<ProblemEntry[]>(
    existingLog
      ? (existingLog.error_entries as unknown as ProblemEntry[]).filter(
          (e): e is ProblemEntry => typeof e === 'object' && 'name' in e,
        )
      : [],
  )
  const [saving, setSaving] = useState(false)

  function addProblem() {
    setProblems((prev) => [...prev, { name: '', url: '' }])
  }

  function patchProblem(i: number, patch: Partial<ProblemEntry>) {
    setProblems((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }

  function removeProblem(i: number) {
    setProblems((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const contestDate = new Date(startDate)
      contestDate.setDate(contestDate.getDate() + day.day_number - 1)

      await createContestLog.mutateAsync({
        mission_id: missionId,
        platform: form.platform || 'Codeforces',
        contest_date: contestDate.toISOString().slice(0, 10),
        contest_name: form.contest_name || null,
        problems_solved: form.problems_solved ? Number(form.problems_solved) : null,
        total_time_mins: form.total_time_mins ? Number(form.total_time_mins) : null,
        penalties: Number(form.penalties) || 0,
        rank_percentile: form.rank_percentile || null,
        rating_delta: form.rating_delta ? Number(form.rating_delta) : null,
        new_rating: form.new_rating ? Number(form.new_rating) : null,
        error_entries: problems as unknown as ErrorEntry[],
      })

      await upsertDayTask.mutateAsync({
        missionId,
        dayNumber: day.day_number,
        patch: { is_completed: true },
      })

      toast.success('Contest logged!')
      setExpanded(false)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const FORM_FIELDS = [
    { label: 'Platform', key: 'platform', placeholder: 'Codeforces', isSelect: true },
    { label: 'Contest Name', key: 'contest_name', placeholder: 'Div. 3 Round ...' },
    { label: 'Problems Solved', key: 'problems_solved', placeholder: '4', type: 'number' },
    { label: 'Total Time (mins)', key: 'total_time_mins', placeholder: '120', type: 'number' },
    { label: 'Penalties', key: 'penalties', placeholder: '0', type: 'number' },
    { label: 'Rank Percentile', key: 'rank_percentile', placeholder: 'top 30%' },
    { label: 'Rating Δ', key: 'rating_delta', placeholder: '+45', type: 'number' },
    { label: 'New Rating', key: 'new_rating', placeholder: '1450', type: 'number' },
  ]

  return (
    <div
      className={`rounded-[14px] border transition-all duration-150 hover:border-white/[0.12] ${day.is_completed ? 'opacity-70' : ''}`}
      style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Trophy icon */}
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4a2 2 0 0 1-2-2V5h4" />
                <path d="M18 9h2a2 2 0 0 0 2-2V5h-4" />
                <path d="M6 5v4a6 6 0 0 0 12 0V5H6Z" />
                <path d="M9 21h6M12 17v4" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#F5F7FA]">
                Day {day.day_number} — Contest Day
                {day.topic && (
                  <span className="ml-2 text-[12px] font-normal text-[#65738A]">({day.topic})</span>
                )}
              </p>
            </div>
            {existingLog ? (
              <Badge variant="green">Logged</Badge>
            ) : day.is_completed ? (
              <Badge variant="blue">Done</Badge>
            ) : (
              <Badge variant="default">Upcoming</Badge>
            )}
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#65738A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="pt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FORM_FIELDS.map(({ label, key, placeholder, type, isSelect }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                {isSelect ? (
                  <select
                    className={inputCls}
                    style={inputStyle}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  >
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                ) : (
                  <input
                    type={type ?? 'text'}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={inputCls}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Contest problems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-[#65738A]">Contest Problems</p>
              <button
                onClick={addProblem}
                className="text-[12px] text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
              >
                + Add Problem
              </button>
            </div>
            {problems.length === 0 ? (
              <p className="text-[12px] text-[#65738A] italic">No problems added yet.</p>
            ) : (
              <div className="space-y-2">
                {problems.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      placeholder={`Problem ${i + 1} name`}
                      value={p.name}
                      onChange={(e) => patchProblem(i, { name: e.target.value })}
                      className={inputCls}
                      style={inputStyle}
                    />
                    <input
                      placeholder="URL (optional)"
                      value={p.url}
                      onChange={(e) => patchProblem(i, { url: e.target.value })}
                      className={inputCls}
                      style={inputStyle}
                    />
                    <button
                      onClick={() => removeProblem(i)}
                      className="text-[#65738A] hover:text-[#EF4444] transition-colors px-1 shrink-0"
                      title="Remove"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : existingLog ? 'Update Log' : 'Log Contest'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Problem Day Card ─────────────────────────────────────────────────────────

interface ProblemDayCardProps {
  day: DayTask & { problem_items: ProblemItem[] }
  missionId: string
  startDate: string
  statusFilter: ProblemStatus | 'All'
  search: string
  ratingMin: string
  ratingMax: string
}

function ProblemDayCard({ day, missionId, startDate, statusFilter, search, ratingMin, ratingMax }: ProblemDayCardProps) {
  const upsertDayTask = useUpsertDayTask()
  const updateProblem = useUpdateProblem()
  const [expanded, setExpanded] = useState(false)

  const filteredProblems = useMemo(() => {
    return day.problem_items.filter((p) => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
      if (ratingMin && p.difficulty_rating !== null && p.difficulty_rating < Number(ratingMin)) return false
      if (ratingMax && p.difficulty_rating !== null && p.difficulty_rating > Number(ratingMax)) return false
      return true
    })
  }, [day.problem_items, statusFilter, search, ratingMin, ratingMax])

  const doneCount = day.problem_items.filter((p) => p.status === 'Done').length
  const totalCount = day.problem_items.length
  const allDone = totalCount > 0 && doneCount === totalCount

  async function toggleDayComplete() {
    try {
      await upsertDayTask.mutateAsync({
        missionId,
        dayNumber: day.day_number,
        patch: { is_completed: !day.is_completed },
      })
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to update')
    }
  }

  async function markAllDone() {
    const pending = day.problem_items.filter((p) => p.status !== 'Done')
    for (const p of pending) {
      await updateProblem.mutateAsync({ problemId: p.problem_id, patch: { status: 'Done' } })
    }
    toast.success(`Marked ${pending.length} problems done`)
  }

  return (
    <div
      className={`rounded-[14px] border transition-all duration-150 hover:border-white/[0.12] ${day.is_completed ? 'border-green-500/20' : ''}`}
      style={{ background: '#101827', borderColor: day.is_completed ? undefined : 'rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center w-full">
        {/* Day completion checkbox */}
        <label
          className="flex items-center justify-center w-10 h-10 cursor-pointer shrink-0 ml-1"
          title={day.is_completed ? 'Mark incomplete' : 'Mark day complete'}
        >
          <input
            type="checkbox"
            checked={day.is_completed}
            onChange={toggleDayComplete}
            className="sr-only"
          />
          <span
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              day.is_completed
                ? 'border-[#22C55E] bg-[#22C55E]/20'
                : 'border-[#3A4A5E] hover:border-[#65738A]'
            }`}
          >
            {day.is_completed && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </span>
        </label>

        <button onClick={() => setExpanded((v) => !v)} className="flex-1 text-left">
          <div className="px-3 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-[13px] font-semibold text-[#F5F7FA]">
                Day {day.day_number}
                {day.topic && (
                  <span className="ml-2 text-[12px] font-normal text-[#65738A]">— {day.topic}</span>
                )}
                {day.checkpoint && (
                  <span className="ml-2 text-[11px] font-semibold text-[#F59E0B]">
                    [Checkpoint: {day.checkpoint}]
                  </span>
                )}
              </p>
              <span className="text-[11px] text-[#65738A]">{dateForDay(startDate, day.day_number)}</span>
              <Badge variant={allDone ? 'green' : doneCount > 0 ? 'blue' : 'default'}>
                {doneCount}/{totalCount}
              </Badge>
              {day.stage && <Badge variant="default">{day.stage}</Badge>}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#65738A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="pt-3 space-y-1">
            {day.primary_skill && (
              <p className="text-[12px] text-[#9AA7BA] italic border-l-2 pl-3"
                style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                Focus: {day.primary_skill}
              </p>
            )}
            {day.time_target && (
              <p className="text-[12px] text-[#65738A]">Target: {day.time_target}</p>
            )}
          </div>

          {filteredProblems.length > 0 ? (
            <>
              {filteredProblems.map((problem) => (
                <ProblemCard key={problem.problem_id} problem={problem} />
              ))}
              {doneCount < totalCount && (
                <button
                  onClick={markAllDone}
                  className="text-[12px] text-[#65738A] hover:text-[#22C55E] transition-colors"
                >
                  Mark all done
                </button>
              )}
            </>
          ) : (
            <p className="text-[12px] text-[#65738A] italic">
              {day.problem_items.length === 0
                ? 'No problems scheduled for this day.'
                : 'No problems match the active filters.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Rest Day Card ────────────────────────────────────────────────────────────

function RestDayCard({ day, startDate }: { day: DayTask; startDate: string }) {
  const upsertDayTask = useUpsertDayTask()

  async function toggle() {
    await upsertDayTask.mutateAsync({
      missionId: day.mission_id,
      dayNumber: day.day_number,
      patch: { is_completed: !day.is_completed },
    })
  }

  return (
    <div
      className={`rounded-[14px] border px-4 py-2.5 flex items-center gap-3 opacity-60 transition-colors ${day.is_completed ? 'border-green-500/20' : ''}`}
      style={{ background: '#101827', borderColor: day.is_completed ? undefined : 'rgba(255,255,255,0.05)' }}
    >
      <label className="flex items-center cursor-pointer" title="Mark rest day done">
        <input type="checkbox" checked={day.is_completed} onChange={toggle} className="sr-only" />
        <span
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
            day.is_completed ? 'border-[#22C55E] bg-[#22C55E]/20' : 'border-[#2A3A4E]'
          }`}
        >
          {day.is_completed && (
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none"
              stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </span>
      </label>
      <span className="text-[12px] text-[#65738A]">
        Day {day.day_number} · {dateForDay(startDate, day.day_number)}
      </span>
      {day.topic && <span className="text-[12px] text-[#3A4A5E]">— {day.topic}</span>}
      <Badge variant="default" className="text-[10px]">Rest</Badge>
    </div>
  )
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function ScheduleHeatmap({
  allDays,
  activeDayNumber,
  onSelectDay,
}: {
  allDays: (DayTask & { problem_items: ProblemItem[] })[]
  activeDayNumber: number
  onSelectDay: (day: number) => void
}) {
  return (
    <div className="rounded-[14px] border p-4 space-y-3"
      style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-[#F5F7FA]">Mission Journey</p>
        <span className="text-[12px] text-[#65738A]">Day {activeDayNumber}</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(24px,1fr))] gap-1.5">
        {allDays.map((d) => {
          const isVirtual = d.day_task_id.startsWith('virtual-')
          let bg = 'rgba(255,255,255,0.05)'
          let textColor = '#65738A'

          if (!isVirtual) {
            if (d.is_completed) {
              bg = 'rgba(34,197,94,0.25)'; textColor = '#22C55E'
            } else if (isContestDay(d)) {
              bg = 'rgba(245,158,11,0.25)'; textColor = '#F59E0B'
            } else if (d.problem_items && d.problem_items.length > 0) {
              const done = d.problem_items.filter(p => p.status === 'Done').length
              if (done > 0) {
                bg = 'rgba(34,197,94,0.12)'; textColor = '#4ADE80'
              } else {
                bg = 'rgba(59,130,246,0.15)'; textColor = '#60A5FA'
              }
            } else {
              bg = 'rgba(255,255,255,0.04)'; textColor = '#3A4A5E'
            }
          }

          const isActive = d.day_number === activeDayNumber

          return (
            <button
              key={d.day_number}
              onClick={() => onSelectDay(d.day_number)}
              title={`Day ${d.day_number}`}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-[4px] flex items-center justify-center text-[9px] sm:text-[10px] font-semibold transition-all duration-100 ${
                isActive ? 'ring-2 ring-[#3B82F6] ring-offset-1 scale-110 z-10' : 'hover:scale-105'
              }`}
              style={{
                background: bg,
                color: textColor,
                ringOffsetColor: '#080D18',
              } as any}
            >
              {d.day_number}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptySchedule({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="#60A5FA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-[#9AA7BA]">No schedule yet</p>
        <p className="text-[13px] text-[#65738A] mt-1">Import a schedule JSON to get started</p>
      </div>
      <Button variant="primary" size="sm" onClick={onImport}>Import Schedule JSON</Button>
    </div>
  )
}

// ─── Main Schedule Page ───────────────────────────────────────────────────────

export default function SchedulePage() {
  const { activeMissionId, setActiveMissionId } = useAppStore()
  const { data: missions = [] } = useMissions()
  const { data: dayTasks = [], isLoading } = useDayTasks(activeMissionId)
  const { data: contestLogs = [] } = useContestLogs(activeMissionId)
  const deleteSchedule = useDeleteSchedule()

  const [statusFilter, setStatusFilter] = useState<ProblemStatus | 'All'>('All')
  const [search, setSearch] = useState('')
  const [ratingMin, setRatingMin] = useState('')
  const [ratingMax, setRatingMax] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)
  const [showRestDays, setShowRestDays] = useState(false)
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single')

  if (!activeMissionId && missions.length > 0) {
    const first = missions.find((m) => m.status === 'Active') ?? missions[0]
    setActiveMissionId(first.mission_id)
  }

  async function handleDeleteSchedule() {
    if (!activeMissionId) return
    if (!window.confirm('Are you sure you want to delete the schedule? This will remove all day tasks, problems, and contests for this mission. The mission itself will remain.')) return
    try {
      await deleteSchedule.mutateAsync(activeMissionId)
      toast.success('Schedule deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete schedule')
    }
  }

  const activeMission: Mission | undefined = missions.find((m) => m.mission_id === activeMissionId)

  const dayTaskMap = useMemo(() => {
    const map = new Map<number, (typeof dayTasks)[number]>()
    for (const d of dayTasks) map.set(d.day_number, d)
    return map
  }, [dayTasks])

  const allDays = useMemo(() => {
    if (!activeMission) return dayTasks
    const days: typeof dayTasks = []
    for (let n = 1; n <= activeMission.duration_days; n++) {
      const existing = dayTaskMap.get(n)
      if (existing) {
        days.push(existing)
      } else {
        days.push({
          day_task_id: `virtual-${n}`,
          mission_id: activeMission.mission_id,
          day_number: n,
          stage: null,
          topic: null,
          primary_skill: null,
          time_target: null,
          checkpoint: null,
          drill_type: null,
          is_completed: false,
          problem_items: [],
        })
      }
    }
    return days
  }, [activeMission, dayTasks, dayTaskMap])

  const currentMissionDay = useMemo(() => {
    if (!activeMission) return 1
    const start = parseISO(activeMission.start_date)
    const diff = differenceInCalendarDays(startOfDay(new Date()), startOfDay(start)) + 1
    return Math.max(1, Math.min(activeMission.duration_days, diff))
  }, [activeMission])

  useEffect(() => {
    if (activeMission && selectedDayNum === null) {
      setSelectedDayNum(currentMissionDay)
    }
  }, [activeMission, currentMissionDay, selectedDayNum])

  const activeDayNumber = selectedDayNum ?? currentMissionDay

  const allProblems = dayTasks.flatMap((d) => d.problem_items ?? [])
  const doneCount = allProblems.filter((p) => p.status === 'Done').length
  const filtersActive = search || ratingMin || ratingMax || statusFilter !== 'All'
  const hasRealDays = allDays.some(d => !d.day_task_id.startsWith('virtual-'))

  return (
    <div className="flex flex-col h-full page-enter">
      {/* ── Sticky Header ──────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-6 pt-6 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Title */}
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] sm:text-[28px] font-bold text-[#F5F7FA] tracking-tight leading-none">Schedule</h1>
          <p className="text-[13px] text-[#65738A] mt-1">
            {doneCount} / {allProblems.length} problems solved
          </p>
        </div>

        {/* Mission switcher */}
        <div className="shrink-0">
          <MissionSwitcher missions={missions} activeMissionId={activeMissionId} onSelect={setActiveMissionId} />
        </div>

        {/* Actions kebab — only when a mission is active */}
        {activeMissionId && (
          <div className="relative shrink-0" ref={actionsRef}>
            <button
              onClick={() => setActionsOpen((o) => !o)}
              className="flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors duration-150"
              style={{
                background: actionsOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.09)',
                color: '#65738A',
              }}
              aria-label="Schedule actions"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>

            {actionsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                <div
                  className="absolute right-0 top-full z-20 mt-1.5 rounded-[12px] py-1.5 overflow-hidden"
                  style={{
                    background: '#101827',
                    border: '1px solid rgba(255,255,255,0.09)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    minWidth: '10rem',
                  }}
                >
                  <button
                    onClick={() => { setActionsOpen(false); setShowImport(true) }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-[#9AA7BA] hover:bg-white/[0.04] transition-colors duration-100"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Import Schedule
                  </button>
                  {hasRealDays && (
                    <button
                      onClick={() => { setActionsOpen(false); handleDeleteSchedule() }}
                      disabled={deleteSchedule.isPending}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-[#EF4444] hover:bg-[#EF4444]/[0.06] transition-colors duration-100 disabled:opacity-50"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                      {deleteSchedule.isPending ? 'Deleting…' : 'Delete Schedule'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable Body ────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="p-6 space-y-5">

      {/* Filter bar */}
      <div className="rounded-[14px] border p-4 space-y-3"
        style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}>
        {/* Status pills + view toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors duration-150 active:scale-[0.97] ${
                statusFilter === opt.value
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[#65738A] hover:text-[#9AA7BA] hover:bg-white/[0.04]'
              }`}
            >
              {opt.label}
            </button>
          ))}

          <div className="ml-auto flex items-center rounded-[8px] p-0.5 gap-0.5"
            style={{ background: '#080D18', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['single', 'all'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-[12px] font-semibold rounded-[6px] transition-colors ${
                  viewMode === mode
                    ? 'bg-[#1A263A] text-[#F5F7FA]'
                    : 'text-[#65738A] hover:text-[#9AA7BA]'
                }`}
              >
                {mode === 'single' ? 'Heatmap' : 'List All'}
              </button>
            ))}
          </div>

          {viewMode === 'all' && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showRestDays}
                onChange={(e) => setShowRestDays(e.target.checked)}
                style={{ accentColor: '#3B82F6' }}
              />
              <span className="text-[12px] text-[#65738A]">Show rest days</span>
            </label>
          )}
        </div>

        {/* Search + rating inputs */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search problems…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls + ' flex-1 min-w-[180px]'}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="Min rating"
            value={ratingMin}
            onChange={(e) => setRatingMin(e.target.value)}
            className={inputCls + ' w-28'}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="Max rating"
            value={ratingMax}
            onChange={(e) => setRatingMax(e.target.value)}
            className={inputCls + ' w-28'}
            style={inputStyle}
          />
          {filtersActive && (
            <button
              onClick={() => { setSearch(''); setRatingMin(''); setRatingMax(''); setStatusFilter('All') }}
              className="rounded-[10px] px-3 py-2 text-[12px] text-[#65738A] hover:text-[#9AA7BA] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Heatmap */}
      {viewMode === 'single' && !isLoading && allDays.length > 0 && (
        <ScheduleHeatmap
          allDays={allDays}
          activeDayNumber={activeDayNumber}
          onSelectDay={setSelectedDayNum}
        />
      )}

      {/* Day list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 border-[#3B82F6]/30 border-t-[#3B82F6] animate-spin" />
        </div>
      ) : allDays.length === 0 || !hasRealDays ? (
        <EmptySchedule onImport={() => setShowImport(true)} />
      ) : (
        <div className="space-y-2">
          {allDays
            .filter((day) => viewMode === 'single' ? day.day_number === activeDayNumber : true)
            .map((day) => {
              const isVirtual = day.day_task_id.startsWith('virtual-')
              const isRest = !isVirtual && day.problem_items.length === 0 && !isContestDay(day)

              if (filtersActive && !isContestDay(day) && day.problem_items.length > 0) {
                const matchCount = day.problem_items.filter((p) => {
                  if (statusFilter !== 'All' && p.status !== statusFilter) return false
                  if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
                  if (ratingMin && p.difficulty_rating !== null && p.difficulty_rating < Number(ratingMin)) return false
                  if (ratingMax && p.difficulty_rating !== null && p.difficulty_rating > Number(ratingMax)) return false
                  return true
                }).length
                if (matchCount === 0) return null
              }

              if (isVirtual) {
                if (!showRestDays) return null
                return (
                  <div
                    key={day.day_task_id}
                    className="px-4 py-2.5 rounded-[12px]"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <span className="text-[12px] text-[#3A4A5E]">
                      Day {day.day_number} · {dateForDay(activeMission!.start_date, day.day_number)} — no tasks imported
                    </span>
                  </div>
                )
              }

              if (isContestDay(day)) {
                return (
                  <ContestDayCard
                    key={day.day_task_id}
                    day={day}
                    contestLogs={contestLogs}
                    missionId={activeMissionId!}
                    startDate={activeMission!.start_date}
                  />
                )
              }

              if (isRest) {
                if (!showRestDays) return null
                return (
                  <RestDayCard
                    key={day.day_task_id}
                    day={day}
                    startDate={activeMission!.start_date}
                  />
                )
              }

              return (
                <ProblemDayCard
                  key={day.day_task_id}
                  day={day as DayTask & { problem_items: ProblemItem[] }}
                  missionId={activeMissionId!}
                  startDate={activeMission!.start_date}
                  statusFilter={statusFilter}
                  search={search}
                  ratingMin={ratingMin}
                  ratingMax={ratingMax}
                />
              )
            })}
        </div>
      )}

      {/* Import dialog */}
      {activeMission && (
        <ImportDialog
          open={showImport}
          onClose={() => setShowImport(false)}
          missionId={activeMission.mission_id}
          startDate={activeMission.start_date}
        />
      )}
      </div>
      </div>
    </div>
  )
}
