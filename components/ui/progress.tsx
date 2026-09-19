'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number // 0-100
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gold'
}

const colorMap = {
  blue:  'bg-blue-500',
  green: 'bg-[#22C55E]',
  amber: 'bg-[#F59E0B]',
  red:   'bg-[#EF4444]',
  gold:  'bg-[#FBBF24]',
}

export function Progress({ value, color = 'blue', className, ...props }: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full rounded-full', className)}
      style={{ background: 'rgba(255,255,255,0.06)' }}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', colorMap[color])}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  )
}
