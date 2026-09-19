'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ContestLog } from '@/lib/types'

interface RatingChartProps {
  contestLogs: ContestLog[]
  baseline: number
  target: number
  durationDays: number
  startDate: string
}

interface DataPoint {
  label: string
  actual?: number
  target: number
}

function buildTargetCurve(
  baseline: number,
  target: number,
  durationDays: number,
  startDate: string,
  logs: ContestLog[],
): DataPoint[] {
  const points: DataPoint[] = []
  const start = new Date(startDate)

  // Generate weekly target checkpoints
  const weeks = Math.ceil(durationDays / 7)
  for (let w = 0; w <= weeks; w++) {
    const day = w * 7
    const pct = Math.min(day / durationDays, 1)
    const d = new Date(start)
    d.setDate(d.getDate() + day)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    points.push({ label, target: Math.round(baseline + (target - baseline) * pct) })
  }

  // Overlay actual contest logs
  logs
    .filter((l) => l.new_rating !== null)
    .sort((a, b) => a.contest_date.localeCompare(b.contest_date))
    .forEach((l) => {
      const label = new Date(l.contest_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      const existing = points.find((p) => p.label === label)
      if (existing) {
        existing.actual = l.new_rating!
      } else {
        points.push({ label, target: 0, actual: l.new_rating! })
      }
    })

  return points.sort((a, b) => a.label.localeCompare(b.label))
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-xl" style={{ background: '#151F31', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="font-medium mb-1" style={{ color: '#9AA7BA' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function RatingChart({ contestLogs, baseline, target, durationDays, startDate }: RatingChartProps) {
  const data = buildTargetCurve(baseline, target, durationDays, startDate, contestLogs)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#65738A', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
        />
        <YAxis
          tick={{ fill: '#65738A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          domain={[Math.max(0, baseline - 100), target + 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: '#65738A', paddingTop: '8px' }}
        />
        <Line
          type="monotone"
          dataKey="target"
          name="Target"
          stroke="#3B82F6"
          strokeDasharray="5 3"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="#10B981"
          strokeWidth={2.5}
          dot={{ fill: '#10B981', r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
