'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Dialog({ open, onClose, title, children, className, size = 'md' }: DialogProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          'relative flex w-full flex-col rounded-2xl shadow-xl',
          'max-h-[min(90vh,780px)]',
          sizeMap[size],
          className,
        )}
        style={{ background: '#101827', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        {/* Header — never scrolls away */}
        {title && (
          <div
            className="flex shrink-0 items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-[15px] font-semibold" style={{ color: '#F5F7FA' }}>{title}</h2>
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-full text-sm transition-opacity hover:opacity-60"
              style={{ color: '#65738A' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
