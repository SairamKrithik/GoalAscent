'use client'

import React from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  onCancel?: () => void
  isLoading?: boolean
  confirmText?: string
  cancelText?: string
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onClose={() => onOpenChange(false)} title={title} className="sm:max-w-[425px]">
      <div className="px-6 py-4">
        <p className="text-[14px]" style={{ color: '#9CA3AF' }}>{description}</p>
      </div>
      <div
        className="flex shrink-0 items-center justify-end gap-3 px-6 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <Button
          variant="ghost"
          onClick={() => {
            onCancel?.()
            onOpenChange(false)
          }}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm()
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Processing…' : confirmText}
        </Button>
      </div>
    </Dialog>
  )
}
