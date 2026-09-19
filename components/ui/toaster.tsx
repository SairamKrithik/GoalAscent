'use client'

import * as React from 'react'
import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#1E293B',
          border: '1px solid #334155',
          color: '#F8FAFC',
        },
      }}
    />
  )
}
