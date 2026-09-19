'use client'

import { cn } from '@/lib/utils'

interface KPICardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  accentColor?: 'blue' | 'green' | 'amber' | 'red' | 'gold'
  className?: string
}

const accentTextMap = {
  blue:  'text-[#60A5FA]',
  green: 'text-[#22C55E]',
  amber: 'text-[#F59E0B]',
  red:   'text-[#EF4444]',
  gold:  'text-[#FBBF24]',
}

const accentDotMap = {
  blue:  'bg-[#3B82F6]',
  green: 'bg-[#22C55E]',
  amber: 'bg-[#F59E0B]',
  red:   'bg-[#EF4444]',
  gold:  'bg-[#FBBF24]',
}

export function KPICard({ label, value, subtext, accentColor = 'blue', className }: KPICardProps) {
  return (
    <div
      className={cn('flex flex-col gap-3 p-4 rounded-[14px] border', className)}
      style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center gap-2">
        <span className={cn('w-1.5 h-1.5 rounded-full flex-none', accentDotMap[accentColor])} />
        <span className="text-[12px] font-medium text-[#65738A]">{label}</span>
      </div>
      <div className="count-up">
        <p className={cn('text-[26px] font-bold font-mono leading-none tracking-tight', accentTextMap[accentColor])}>
          {value}
        </p>
        {subtext && (
          <p className="mt-1.5 text-[12px] text-[#65738A]">{subtext}</p>
        )}
      </div>
    </div>
  )
}
