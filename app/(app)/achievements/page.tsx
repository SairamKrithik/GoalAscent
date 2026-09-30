'use client'

// Achievements page — shows all completed missions as a grid of compact cards.
// Clicking a card opens a detail modal with the full ExportCard and deeper stats.
// Accessible via Profile → View Achievements. Not in the main nav.

import { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { toPng } from 'html-to-image'
import { format, parseISO } from 'date-fns'
import { useProfile, useProfileStats, useMissions, useAllContestLogs } from '@/lib/queries'
import { ExportCard } from '@/components/ExportCard'
import type { Mission, ContestLog } from '@/lib/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const CARD_BG = '#101827'
const BORDER = 'rgba(255,255,255,0.07)'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAchievement(mission: Mission, logs: ContestLog[]): boolean {
  if (mission.status === 'Completed') return true
  if (!mission.target_rating) return false
  return logs.some((l) => l.new_rating !== null && l.new_rating >= mission.target_rating!)
}

function maxRating(logs: ContestLog[]): number {
  return logs.reduce((best, l) => (l.new_rating !== null && l.new_rating > best ? l.new_rating : best), 0)
}

// ─── Compact Grid Card ────────────────────────────────────────────────────────

interface AchievementCardProps {
  mission: Mission
  logs: ContestLog[]
  onClick: () => void
}

function AchievementCard({ mission, logs, onClick }: AchievementCardProps) {
  const achieved = maxRating(logs)
  const gained = achieved - (mission.baseline_rating ?? 0)
  const startDate = parseISO(mission.start_date)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + mission.duration_days - 1)

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-[16px] border overflow-hidden transition-all duration-200 hover:border-white/15"
      style={{ background: CARD_BG, borderColor: BORDER }}
    >
      {/* Golden top bar */}
      <div
        className="h-1 w-full"
        style={{ background: 'linear-gradient(90deg, #F59E0B, #FCD34D, #FBBF24)' }}
      />

      <div className="p-4">
        {/* Badge + title */}
        <div className="mb-3">
          <span
            className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mb-1.5"
            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)', color: '#FCD34D' }}
          >
            🏆 Achieved
          </span>
          <p className="text-[14px] font-bold text-[#F5F7FA] leading-snug line-clamp-2">
            {mission.title}
          </p>
        </div>

        {/* Platform + dates */}
        <p className="text-[11px] text-[#65738A] mb-4">
          {mission.platform} · {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
        </p>

        {/* Rating stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[10px] p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-[9px] text-[#65738A] mb-0.5">Baseline</p>
            <p className="text-[14px] font-bold font-mono text-[#9AA7BA]">
              {mission.baseline_rating ?? '—'}
            </p>
          </div>
          <div className="rounded-[10px] p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-[9px] text-[#65738A] mb-0.5">Target</p>
            <p className="text-[14px] font-bold font-mono text-[#F5F7FA]">
              {mission.target_rating ?? '—'}
            </p>
          </div>
          <div className="rounded-[10px] p-2.5" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <p className="text-[9px] text-[#65738A] mb-0.5">Gained</p>
            <p className="text-[14px] font-bold font-mono text-[#10B981]">
              {gained >= 0 ? '+' : ''}{gained}
            </p>
          </div>
        </div>

        {/* Tap hint */}
        <div
          className="mt-3 flex items-center justify-center gap-1.5 rounded-[8px] py-2 text-[11px] font-medium transition-colors group-hover:text-[#60A5FA]"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#65738A' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          View details & export
        </div>
      </div>
    </button>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  mission: Mission
  logs: ContestLog[]
  displayName: string
  avatarUrl: string | null
  onClose: () => void
}

function DetailModal({ mission, logs, displayName, avatarUrl, onClose }: DetailModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const achieved = maxRating(logs)
  const gained = achieved - (mission.baseline_rating ?? 0)
  const startDate = parseISO(mission.start_date)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + mission.duration_days - 1)
  const targetMet = mission.target_rating ? achieved >= mission.target_rating : false

  const sortedLogs = [...logs].sort((a, b) =>
    a.contest_date.localeCompare(b.contest_date)
  )

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `goalascent-${mission.platform.toLowerCase()}-${achieved}.png`
      a.click()
    } catch {
      // html-to-image failure is non-fatal; user can retry
    } finally {
      setDownloading(false)
    }
  }, [mission.platform, achieved])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full sm:max-w-[600px] rounded-t-[24px] sm:rounded-[20px] overflow-y-auto"
        style={{
          background: '#0D1724',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '92dvh',
        }}
      >
        {/* Drag pill (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)', color: '#FCD34D' }}
            >
              🏆 Achieved
            </span>
            <h2 className="text-[15px] font-bold text-[#F5F7FA] truncate">{mission.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="#9AA7BA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Rating stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Baseline', value: mission.baseline_rating ?? '—', color: '#9AA7BA' },
              { label: 'Target', value: mission.target_rating ?? '—', color: '#F5F7FA' },
              { label: 'Achieved', value: achieved, color: '#10B981' },
              { label: 'Gained', value: (gained >= 0 ? '+' : '') + gained, color: gained >= 0 ? '#10B981' : '#EF4444' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-[12px] p-3"
                style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
              >
                <p className="text-[9px] text-[#65738A] mb-1">{label}</p>
                <p className="text-[16px] font-bold font-mono leading-none" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Meta grid */}
          <div
            className="rounded-[12px] px-4 py-3 grid grid-cols-3 gap-3 text-center"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            {[
              { label: 'Platform', value: mission.platform },
              { label: 'Duration', value: `${mission.duration_days} days` },
              { label: 'Contests', value: String(logs.length) },
              { label: 'Started', value: format(startDate, 'MMM d, yyyy') },
              { label: 'Ended', value: format(endDate, 'MMM d, yyyy') },
              { label: 'Target hit', value: targetMet ? 'Yes' : 'No', color: targetMet ? '#10B981' : '#9AA7BA' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-[9px] text-[#65738A] mb-0.5">{label}</p>
                <p className="text-[12px] font-semibold" style={{ color: color ?? '#F5F7FA' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Contest log table */}
          {sortedLogs.length > 0 && (
            <div className="rounded-[12px] overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
              <div
                className="grid text-[10px] font-semibold text-[#65738A] px-4 py-2.5"
                style={{
                  gridTemplateColumns: '1fr 72px 72px 60px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <span>Date</span>
                <span className="text-right">Old</span>
                <span className="text-right">New</span>
                <span className="text-right">Δ</span>
              </div>
              {sortedLogs.map((log, i) => {
                const delta = log.rating_delta ?? null
                const oldRating =
                  log.new_rating !== null && log.rating_delta !== null
                    ? log.new_rating - log.rating_delta
                    : null
                return (
                  <div
                    key={log.log_id}
                    className="grid px-4 py-2.5 text-[12px]"
                    style={{
                      gridTemplateColumns: '1fr 72px 72px 60px',
                      borderBottom: i < sortedLogs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                      background: i % 2 === 0 ? CARD_BG : 'transparent',
                    }}
                  >
                    <span className="text-[#9AA7BA]">{format(parseISO(log.contest_date), 'MMM d, yyyy')}</span>
                    <span className="text-right font-mono text-[#65738A]">{oldRating ?? '—'}</span>
                    <span className="text-right font-mono text-[#F5F7FA]">{log.new_rating ?? '—'}</span>
                    <span
                      className="text-right font-mono font-semibold"
                      style={{ color: delta === null ? '#65738A' : delta >= 0 ? '#10B981' : '#EF4444' }}
                    >
                      {delta === null ? '—' : (delta >= 0 ? '+' : '') + delta}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* ExportCard preview */}
          <div>
            <p className="text-[10px] font-semibold text-[#65738A] mb-2.5 uppercase tracking-wider">
              Shareable Card Preview
            </p>
            <div className="overflow-x-auto">
              <div
                className="rounded-[10px] overflow-hidden inline-block"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div ref={cardRef} style={{ display: 'inline-block' }}>
                  <ExportCard
                    mission={mission}
                    contestLogs={logs}
                    achievedRating={achieved}
                    displayName={displayName}
                    avatarUrl={avatarUrl}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={downloading}
            className="flex items-center justify-center gap-2 w-full rounded-[12px] py-3 text-[13px] font-semibold transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              color: '#fff',
              opacity: downloading ? 0.7 : 1,
            }}
          >
            {downloading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                Generating…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export as Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AchievementsPage() {
  const { data: profile } = useProfile()
  const { data: stats } = useProfileStats()
  const { data: missions = [] } = useMissions()
  const { data: allLogs = [], isLoading } = useAllContestLogs()

  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)

  const displayName = profile?.display_name || profile?.handle || 'Achiever'
  const avatarUrl = profile?.avatar_url ?? null

  const logsByMission = allLogs.reduce<Record<string, ContestLog[]>>((acc, log) => {
    if (!acc[log.mission_id]) acc[log.mission_id] = []
    acc[log.mission_id].push(log)
    return acc
  }, {})

  const achievements = missions.filter((m) =>
    isAchievement(m, logsByMission[m.mission_id] ?? [])
  )

  return (
    <div className="flex flex-col h-full page-enter">
      {/* ── Sticky Header ──────────────────── */}
      <div
        className="shrink-0 flex items-center gap-4 px-6 pt-6 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Link
          href="/profile"
          className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          aria-label="Back to profile"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#9AA7BA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-[#F5F7FA] tracking-tight leading-none">
            Achievements
          </h1>
          <p className="text-[13px] text-[#65738A] mt-1">
            {achievements.length} mission{achievements.length !== 1 ? 's' : ''} completed
          </p>
        </div>
      </div>

      {/* ── Scrollable Body ────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 space-y-6">

          {/* Stats strip */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Missions Completed', value: achievements.length, color: '#FCD34D' },
                { label: 'Total Solved', value: stats.total_solved ?? 0, color: '#60A5FA' },
                { label: 'Flawless Solves', value: stats.flawless_solves ?? 0, color: '#22C55E' },
                { label: 'Contests Logged', value: stats.contest_count ?? 0, color: '#A78BFA' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-[14px] p-4"
                  style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
                >
                  <p className="text-[11px] text-[#65738A] mb-1.5">{label}</p>
                  <p className="text-[26px] font-bold font-mono leading-none" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 rounded-full border-2 border-[#3B82F6]/30 border-t-[#3B82F6] animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && achievements.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}
              >
                🏆
              </div>
              <div className="text-center">
                <p className="text-[15px] font-semibold text-[#9AA7BA]">No achievements yet</p>
                <p className="text-[13px] text-[#65738A] mt-1 max-w-[260px]">
                  Reach your target rating on any mission to earn an achievement card
                </p>
              </div>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13px] font-semibold"
                style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', color: '#60A5FA' }}
              >
                Start a Mission
              </Link>
            </div>
          )}

          {/* Achievement grid */}
          {!isLoading && achievements.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {achievements.map((mission) => (
                <AchievementCard
                  key={mission.mission_id}
                  mission={mission}
                  logs={logsByMission[mission.mission_id] ?? []}
                  onClick={() => setSelectedMission(mission)}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Detail Modal ─────────────────── */}
      {selectedMission && (
        <DetailModal
          mission={selectedMission}
          logs={logsByMission[selectedMission.mission_id] ?? []}
          displayName={displayName}
          avatarUrl={avatarUrl}
          onClose={() => setSelectedMission(null)}
        />
      )}
    </div>
  )
}
