'use client'

import * as React from 'react'

interface LogoMarkProps {
  size?: number
  className?: string
}

// Standalone icon mark — mountain + ascending arrow
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="#101827" />
      <path d="M4 26 L16 8 L20 14" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 14 L24 20 L28 26" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <path d="M13 17 L16 8" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
      <path d="M13.5 11 L16 8 L18.5 11" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="8" r="2.5" fill="#60A5FA" />
      <circle cx="16" cy="8" r="4" fill="rgba(96,165,250,0.2)" />
    </svg>
  )
}

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  iconOnly?: boolean
}

const sizeConfig = {
  sm: { icon: 22, textSize: '14px', gap: '8px' },
  md: { icon: 28, textSize: '17px', gap: '10px' },
  lg: { icon: 40, textSize: '26px', gap: '14px' },
}

// Full logo: icon mark + "GoalAscent" wordmark
export function Logo({ size = 'md', className, iconOnly = false }: LogoProps) {
  const cfg = sizeConfig[size]

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: cfg.gap }}
    >
      <LogoMark size={cfg.icon} />
      {!iconOnly && (
        <span
          style={{
            fontSize: cfg.textSize,
            fontWeight: 700,
            letterSpacing: '-0.4px',
            lineHeight: 1,
            color: '#F5F7FA',
          }}
        >
          Goal<span style={{ color: '#60A5FA' }}>Ascent</span>
        </span>
      )}
    </div>
  )
}
