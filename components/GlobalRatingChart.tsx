'use client'

// All-time per-platform rating history chart. Receives the full contest log set
// and a selected platform; filters and renders a simple line chart with no
// target trajectory (unlike RatingChart, which is mission-scoped).

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ContestLog } from '@/lib/types'
import { PLATFORM_COLORS } from '@/lib/types'

interface GlobalRatingChartProps {
  allContestLogs: ContestLog[]
  platform: string
}

interface DataPoint {
  label: string
  rating: number
}

function buildData(logs: ContestLog[], platform: string): DataPoint[] {
  return logs
    .filter((l) => l.platform === platform && l.new_rating !== null)
    .sort((a, b) => a.contest_date.localeCompare(b.contest_date))
    .map((l) => ({
      label: new Date(l.contest_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      }),
      rating: l.new_rating!,
    }))
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; color: string }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-xl"
      style={{ background: '#151F31', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="font-medium mb-1" style={{ color: '#9AA7BA' }}>
        {label}
      </p>
      <p style={{ color: payload[0].color }}>
        Rating: <span className="font-mono font-bold">{payload[0].value}</span>
      </p>
    </div>
  )
}

export function GlobalRatingChart({ allContestLogs, platform }: GlobalRatingChartProps) {
  const data = buildData(allContestLogs, platform)
  const lineColor = PLATFORM_COLORS[platform] ?? '#60A5FA'

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(59,130,246,0.1)' }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#60A5FA"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </div>
        <p className="text-[13px] text-[#9AA7BA] font-medium">No contest logs for {platform}</p>
        <p className="text-[12px] text-[#65738A]">Log a contest with a new rating to see your history</p>
      </div>
    )
  }

  // Y-axis domain with breathing room
  const ratings = data.map((d) => d.rating)
  const minRating = Math.min(...ratings)
  const maxRating = Math.max(...ratings)
  const pad = Math.max(50, Math.round((maxRating - minRating) * 0.15))
  const yMin = Math.max(0, minRating - pad)
  const yMax = maxRating + pad

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#65738A', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
          // Show at most 6 ticks to avoid clutter on large datasets
          interval={Math.max(0, Math.ceil(data.length / 6) - 1)}
        />
        <YAxis
          tick={{ fill: '#65738A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          domain={[yMin, yMax]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="rating"
          name="Rating"
          stroke={lineColor}
          strokeWidth={2.5}
          dot={data.length <= 20 ? { fill: lineColor, r: 4 } : false}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
