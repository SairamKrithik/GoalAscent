import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none',
  {
    variants: {
      variant: {
        default: 'bg-[#1A263A] text-[#9AA7BA]',
        green:   'bg-[#22C55E]/12 text-[#22C55E] border border-[#22C55E]/20',
        yellow:  'bg-[#F59E0B]/12 text-[#F59E0B] border border-[#F59E0B]/20',
        red:     'bg-[#EF4444]/12 text-[#EF4444] border border-[#EF4444]/20',
        blue:    'bg-[#3B82F6]/12 text-[#60A5FA] border border-[#3B82F6]/20',
        gold:    'bg-[#FBBF24]/12 text-[#FBBF24] border border-[#FBBF24]/20',
        outline: 'border border-white/[0.1] text-[#65738A]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />
}
