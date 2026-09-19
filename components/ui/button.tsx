import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[9px] text-[13px] font-semibold transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary:   'bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-900/40',
        secondary: 'bg-[#151F31] text-[#9AA7BA] hover:bg-[#1A263A] hover:text-[#F5F7FA] border border-white/[0.07]',
        ghost:     'text-[#65738A] hover:text-[#9AA7BA] hover:bg-white/[0.04]',
        danger:    'bg-red-600 text-white hover:bg-red-500 shadow-sm shadow-red-900/40',
        gold:      'bg-amber-400 text-slate-900 font-bold hover:bg-amber-300',
      },
      size: {
        sm:   'h-8 px-3 text-[12px]',
        md:   'h-9 px-4',
        lg:   'h-11 px-6 text-[14px]',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
)
Button.displayName = 'Button'
