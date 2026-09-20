'use client'

import { useState } from 'react'
import { useMissions, useContestLogs, useCreateContestLog } from '@/lib/queries'
import { useAppStore } from '@/lib/store'
import { MissionSwitcher } from '@/components/MissionSwitcher'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ERROR_CATEGORIES, PLATFORM_COLORS } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

const PLATFORMS = ['Codeforces', 'LeetCode', 'AtCoder', 'HackerRank', 'CodeChef', 'Other']

interface ErrorEntry {
  category: number
  note: string
}

interface ContestFormState {
  platform: string
  contest_name: string
  contest_date: string
  new_rating: string
  rating_delta: string
  problems_solved: string
  total_time_mins: string
  notes: string
  errors: ErrorEntry[]
}

const DEFAULT_FORM: ContestFormState = {
  platform: 'Codeforces',
  contest_name: '',
  contest_date: new Date().toISOString().slice(0, 10),
  new_rating: '',
  rating_delta: '',
  problems_solved: '',
  total_time_mins: '',
  notes: '',
  errors: [],
}

const inputCls = 'w-full rounded-[10px] border px-3 py-2 text-[13px] text-[#F5F7FA] outline-none transition-all duration-150 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 placeholder:text-[#65738A]'
const inputStyle = { background: '#080D18', borderColor: 'rgba(255,255,255,0.07)' }
const labelCls = 'block text-[11px] font-medium text-[#65738A] mb-1.5'

function EmptyContests() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="#60A5FA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4a2 2 0 0 1-2-2V5h4" />
          <path d="M18 9h2a2 2 0 0 0 2-2V5h-4" />
          <path d="M6 5v4a6 6 0 0 0 12 0V5H6Z" />
          <path d="M9 21h6M12 17v4" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-[#9AA7BA]">No contests yet</p>
        <p className="text-[13px] text-[#65738A] mt-1">Log your first contest to start tracking your progress</p>
      </div>
    </div>
  )
}

export default function ContestsPage() {
  const { activeMissionId, setActiveMissionId } = useAppStore()
  const { data: missions = [] } = useMissions()
  const { data: contestLogs = [], isLoading } = useContestLogs(activeMissionId)
  const createLog = useCreateContestLog()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ContestFormState>(DEFAULT_FORM)

  if (!activeMissionId && missions.length > 0) {
    const first = missions.find((m) => m.status === 'Active') ?? missions[0]
    setActiveMissionId(first.mission_id)
  }

  function patchForm(patch: Partial<ContestFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function toggleError(categoryIdx: number) {
    const cat = categoryIdx + 1
    setForm((prev) => {
      const existing = prev.errors.findIndex((e) => e.category === cat)
      if (existing >= 0) {
        return { ...prev, errors: prev.errors.filter((_, i) => i !== existing) }
      }
      return { ...prev, errors: [...prev.errors, { category: cat, note: '' }] }
    })
  }

  function patchErrorNote(categoryIdx: number, note: string) {
    const cat = categoryIdx + 1
    setForm((prev) => ({
      ...prev,
      errors: prev.errors.map((e) => (e.category === cat ? { ...e, note } : e)),
    }))
  }

  async function handleSubmit() {
    if (!activeMissionId) { toast.error('Select a mission first'); return }
    if (!form.contest_name || !form.contest_date) { toast.error('Contest name and date are required'); return }

    try {
      await createLog.mutateAsync({
        mission_id: activeMissionId,
        platform: form.platform,
        contest_name: form.contest_name,
        contest_date: form.contest_date,
        new_rating: form.new_rating ? Number(form.new_rating) : null,
        rating_delta: form.rating_delta ? Number(form.rating_delta) : null,
        rank_percentile: null,
        problems_solved: form.problems_solved ? Number(form.problems_solved) : null,
        total_time_mins: form.total_time_mins ? Number(form.total_time_mins) : null,
        penalties: 0,
        error_entries: form.errors,
      } as any)
      toast.success('Contest log saved')
      setShowForm(false)
      setForm(DEFAULT_FORM)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save contest log')
    }
  }

  const totalRatingDelta = contestLogs.reduce((acc, log) => acc + (log.rating_delta ?? 0), 0)

  return (
    <div className="flex flex-col h-full page-enter">
      {/* ── Sticky Header ──────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-start gap-3 px-6 pt-6 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] sm:text-[28px] font-bold text-[#F5F7FA] tracking-tight leading-none">Contests</h1>
          <p className="text-[13px] text-[#65738A] mt-1.5">
            {contestLogs.length} logged · Net rating{' '}
            <span className={totalRatingDelta >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
              {totalRatingDelta >= 0 ? '+' : ''}{totalRatingDelta}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <MissionSwitcher missions={missions} activeMissionId={activeMissionId} onSelect={setActiveMissionId} />
          <Button variant="primary" size="sm" onClick={() => {
            const m = missions.find(m => m.mission_id === activeMissionId);
            setForm({ ...DEFAULT_FORM, platform: m?.platform || 'Codeforces' }); 
            setShowForm(true) 
          }}>
            + Log Contest
          </Button>
        </div>
      </div>

      {/* ── Scrollable Body ────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="p-6 space-y-5">

      {/* Contest list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 border-[#3B82F6]/30 border-t-[#3B82F6] animate-spin" />
        </div>
      ) : contestLogs.length === 0 ? (
        <EmptyContests />
      ) : (
        <div className="space-y-2">
          {[...contestLogs].reverse().map((log) => {
            const delta = log.rating_delta
            const platformColor = PLATFORM_COLORS[log.platform] ?? '#6B7280'

            return (
              <div
                key={log.log_id}
                className="rounded-[14px] border p-4 flex items-start justify-between gap-3 transition-colors duration-150 hover:border-white/[0.12]"
                style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                      style={{ background: platformColor + '20', color: platformColor }}
                    >
                      {log.platform}
                    </span>
                    <span className="text-[14px] font-semibold text-[#F5F7FA] truncate">
                      {log.contest_name}
                    </span>
                  </div>

                  <p className="text-[12px] text-[#65738A]">
                    {format(parseISO(log.contest_date), 'MMM d, yyyy')}
                    {log.problems_solved !== null && ` · ${log.problems_solved} solved`}
                    {log.total_time_mins !== null && ` · ${log.total_time_mins}m`}
                  </p>

                  {(log.error_entries ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {(log.error_entries ?? []).map((e, ei) => (
                        <Badge key={ei} variant="red">
                          {ERROR_CATEGORIES[(e.category ?? 1) - 1] ?? `Cat ${e.category}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {delta !== null ? (
                    <>
                      <p className={`text-[16px] font-mono font-bold ${delta >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {delta >= 0 ? '+' : ''}{delta}
                      </p>
                      {log.new_rating !== null && (
                        <p className="text-[11px] text-[#65738A] font-mono mt-0.5">{log.new_rating}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-[13px] text-[#65738A]">—</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Log Contest Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Log a Contest" size="lg">
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Contest Name *</label>
              <input
                className={inputCls}
                style={inputStyle}
                placeholder="Codeforces Round 900"
                value={form.contest_name}
                onChange={(e) => patchForm({ contest_name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Platform</label>
              <select
                className={inputCls}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                value={form.platform}
                onChange={(e) => patchForm({ platform: e.target.value })}
              >
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date *</label>
              <input
                type="date"
                className={inputCls}
                style={inputStyle}
                value={form.contest_date}
                onChange={(e) => patchForm({ contest_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Rating Delta</label>
              <input
                type="number"
                className={inputCls}
                style={inputStyle}
                placeholder="+60 or -30"
                value={form.rating_delta}
                onChange={(e) => patchForm({ rating_delta: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>New Rating</label>
              <input
                type="number"
                className={inputCls}
                style={inputStyle}
                placeholder="1560"
                value={form.new_rating}
                onChange={(e) => patchForm({ new_rating: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Problems Solved</label>
              <input
                type="number"
                className={inputCls}
                style={inputStyle}
                placeholder="2"
                value={form.problems_solved}
                onChange={(e) => patchForm({ problems_solved: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Time (minutes)</label>
              <input
                type="number"
                className={inputCls}
                style={inputStyle}
                placeholder="120"
                value={form.total_time_mins}
                onChange={(e) => patchForm({ total_time_mins: e.target.value })}
              />
            </div>
          </div>

          {/* Error taxonomy */}
          <div>
            <p className="text-[11px] font-medium text-[#65738A] mb-2.5">Error Categories</p>
            <div className="space-y-2">
              {ERROR_CATEGORIES.map((cat, i) => {
                const entry = form.errors.find((e) => e.category === i + 1)
                return (
                  <div key={i}>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!entry}
                        onChange={() => toggleError(i)}
                        className="w-3.5 h-3.5 rounded"
                        style={{ accentColor: '#3B82F6' }}
                      />
                      <span className="text-[13px] text-[#9AA7BA]">{cat}</span>
                    </label>
                    {entry && (
                      <input
                        className={inputCls + ' mt-1.5 ml-6 w-[calc(100%-1.75rem)]'}
                        style={inputStyle}
                        placeholder="Describe the specific mistake…"
                        value={entry.note}
                        onChange={(e) => patchErrorNote(i, e.target.value)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>General Notes</label>
            <textarea
              rows={3}
              className={inputCls + ' resize-none'}
              style={inputStyle}
              placeholder="What went well? What would you do differently?"
              value={form.notes}
              onChange={(e) => patchForm({ notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={createLog.isPending}>
              {createLog.isPending ? 'Saving…' : 'Save Contest'}
            </Button>
          </div>
        </div>
      </Dialog>
      </div>
      </div>
    </div>
  )
}
