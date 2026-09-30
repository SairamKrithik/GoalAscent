// ExportCard — shareable mission-achievement card.
// Used in the celebration modal (dashboard) and the Achievements page.
// All recharts animations are disabled so html-to-image can snapshot immediately.

import { format } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import type { ContestLog, Mission } from '@/lib/types'

export function buildExportChartData(
  baseline: number,
  target: number,
  durationDays: number,
  startDate: string,
  logs: ContestLog[],
): { label: string; target: number; actual?: number }[] {
  const points: { label: string; target: number; actual?: number }[] = []
  const start = new Date(startDate)
  const weeks = Math.ceil(durationDays / 7)
  for (let w = 0; w <= weeks; w++) {
    const day = w * 7
    const pct = Math.min(day / durationDays, 1)
    const d = new Date(start)
    d.setDate(d.getDate() + day)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    points.push({ label, target: Math.round(baseline + (target - baseline) * pct) })
  }
  logs
    .filter((l) => l.new_rating !== null)
    .sort((a, b) => a.contest_date.localeCompare(b.contest_date))
    .forEach((l) => {
      const label = new Date(l.contest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const existing = points.find((p) => p.label === label)
      if (existing) existing.actual = l.new_rating!
      else points.push({ label, target: 0, actual: l.new_rating! })
    })
  return points.sort((a, b) => a.label.localeCompare(b.label))
}

export interface ExportCardProps {
  mission: Mission
  contestLogs: ContestLog[]
  achievedRating: number
  displayName: string
  avatarUrl: string | null
}

export function ExportCard({
  mission,
  contestLogs,
  achievedRating,
  displayName,
  avatarUrl,
}: ExportCardProps) {
  const chartData = buildExportChartData(
    mission.baseline_rating ?? 0,
    mission.target_rating ?? 0,
    mission.duration_days,
    mission.start_date,
    contestLogs,
  )
  const baseline = mission.baseline_rating ?? 0
  const target = mission.target_rating ?? 0
  const gained = achievedRating - baseline

  return (
    <div
      style={{
        width: 540,
        background: 'linear-gradient(135deg, #080D18 0%, #0F172A 50%, #0A1628 100%)',
        padding: '36px 36px 32px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow accents */}
      <div style={{
        position: 'absolute', top: -60, right: -60, width: 200, height: 200,
        borderRadius: '50%', background: 'rgba(59,130,246,0.08)', filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -40, left: -40, width: 160, height: 160,
        borderRadius: '50%', background: 'rgba(16,185,129,0.07)', filter: 'blur(35px)',
        pointerEvents: 'none',
      }} />

      {/* Header: avatar + name + achieved badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.4)', objectFit: 'cover' }}
            crossOrigin="anonymous"
          />
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6, #10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#fff',
          }}>
            {displayName.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F7FA', marginBottom: 2 }}>{displayName}</div>
          <div style={{ fontSize: 12, color: '#65738A' }}>Goal Reached · {format(new Date(), 'MMM d, yyyy')}</div>
        </div>
        {/* Trophy badge */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 10, padding: '6px 12px',
          fontSize: 12, fontWeight: 600, color: '#FCD34D',
        }}>
          🏆 Goal Reached
        </div>
      </div>

      {/* Mission title */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10, padding: '10px 14px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: '#65738A', marginBottom: 4 }}>MISSION</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F7FA' }}>{mission.title}</div>
      </div>

      {/* Rating stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Started', value: String(baseline), color: '#9AA7BA' },
          { label: 'Achieved', value: String(achievedRating), color: '#10B981' },
          { label: 'Target', value: String(target), color: '#60A5FA' },
          { label: 'Gained', value: `+${gained}`, color: '#22C55E' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#65738A', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 11, color: '#65738A', marginBottom: 8 }}>RATING TRAJECTORY</div>
        <LineChart width={468} height={130} data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="label" tick={{ fill: '#65738A', fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#65738A', fontSize: 9 }} tickLine={false} axisLine={false}
            domain={[Math.max(0, baseline - 50), target + 50]} />
          <Line type="monotone" dataKey="target" stroke="#3B82F6" strokeDasharray="4 3" strokeWidth={1.5}
            dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2}
            dot={{ fill: '#10B981', r: 3 }} isAnimationActive={false} connectNulls={false} />
        </LineChart>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 10, color: '#65738A' }}>goalascent.app</div>
        <div style={{
          fontSize: 10, color: '#65738A',
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: 6, padding: '2px 8px',
        }}>
          {mission.platform} · {mission.duration_days}d mission
        </div>
      </div>
    </div>
  )
}
