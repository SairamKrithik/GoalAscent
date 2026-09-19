'use client'

import { useState, useRef } from 'react'
import { useProfile, useProfileStats, useCreateMission, useUpdateProfile, type CreateMissionInput } from '@/lib/queries'
import { useQueryClient } from '@tanstack/react-query'
import { KPICard } from '@/components/KPICard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface NewMissionForm {
  title: string
  description: string
  duration_days: string
  baseline_rating: string
  target_rating: string
  daily_time_budget: string
  start_date: string
}

const DEFAULT_MISSION_FORM: NewMissionForm = {
  title: '',
  description: '',
  duration_days: '90',
  baseline_rating: '',
  target_rating: '',
  daily_time_budget: '',
  start_date: new Date().toISOString().slice(0, 10),
}

const inputCls = 'w-full rounded-[10px] border px-3 py-2 text-[13px] text-[#F5F7FA] outline-none transition-all duration-150 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 placeholder:text-[#65738A]'
const inputStyle = { background: '#080D18', borderColor: 'rgba(255,255,255,0.07)' }

const labelCls = 'block text-[11px] font-medium text-[#65738A] mb-1.5'

export default function ProfilePage() {
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: stats } = useProfileStats()
  const createMission = useCreateMission()
  const updateProfile = useUpdateProfile()
  const router = useRouter()

  const qc = useQueryClient()
  const [showNewMission, setShowNewMission] = useState(false)
  const [missionForm, setMissionForm] = useState<NewMissionForm>(DEFAULT_MISSION_FORM)
  const [signingOut, setSigningOut] = useState(false)

  // Profile editing state
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function patchMission(patch: Partial<NewMissionForm>) {
    setMissionForm((prev) => ({ ...prev, ...patch }))
  }

  async function handleCreateMission() {
    if (!missionForm.title) { toast.error('Mission title is required'); return }
    if (!missionForm.duration_days || Number(missionForm.duration_days) < 1) {
      toast.error('Duration must be at least 1 day'); return
    }

    try {
      await createMission.mutateAsync({
        title: missionForm.title,
        description: missionForm.description || null,
        duration_days: Number(missionForm.duration_days),
        baseline_rating: missionForm.baseline_rating ? Number(missionForm.baseline_rating) : null,
        target_rating: missionForm.target_rating ? Number(missionForm.target_rating) : null,
        daily_time_budget: missionForm.daily_time_budget || null,
        start_date: missionForm.start_date,
        rest_days: [],
        status: 'Active',
        forked_from_mission_id: null,
        forked_from_template_id: null,
      } satisfies CreateMissionInput)
      toast.success('Mission created!')
      setShowNewMission(false)
      setMissionForm(DEFAULT_MISSION_FORM)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create mission')
    }
  }

  async function handleSaveName() {
    const trimmed = nameValue.trim()
    if (!trimmed) { toast.error('Name cannot be empty'); return }
    try {
      await updateProfile.mutateAsync({ display_name: trimmed })
      setEditingName(false)
      toast.success('Name updated')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update name')
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, WebP, or GIF image')
      e.target.value = ''
      return
    }
    const maxBytes = 2 * 1024 * 1024
    if (file.size > maxBytes) {
      toast.error('Image must be under 2 MB')
      e.target.value = ''
      return
    }

    // Show local preview immediately while upload runs
    const localPreview = URL.createObjectURL(file)
    setAvatarPreview(localPreview)
    setUploadingAvatar(true)

    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/upload-avatar', { method: 'POST', body })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      // Server already saved avatar_url to profiles — refetch to update the UI
      setAvatarPreview(json.url)
      qc.refetchQueries({ queryKey: ['profile'] })
      toast.success('Avatar updated')
    } catch (err: unknown) {
      setAvatarPreview(null)
      const msg = err instanceof Error ? err.message : 'Failed to upload avatar'
      toast.error(msg)
    } finally {
      setUploadingAvatar(false)
      URL.revokeObjectURL(localPreview)
      e.target.value = ''
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-5 h-5 rounded-full border-2 border-[#3B82F6]/30 border-t-[#3B82F6] animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full page-enter">
      {/* ── Sticky Header ──────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-3 px-6 pt-6 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 className="text-[24px] sm:text-[28px] font-bold text-[#F5F7FA] tracking-tight leading-none flex-1">Profile</h1>
        <Button variant="secondary" size="sm" onClick={handleSignOut} disabled={signingOut} className="self-start sm:self-auto">
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </Button>
      </div>

      {/* ── Scrollable Body ────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="p-6 space-y-5">

      {/* Identity card */}
      <div className="rounded-[16px] border p-5"
        style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-start gap-4">
          {/* Avatar + upload trigger */}
          <div className="relative flex-none group">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative block h-16 w-16 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              style={{ border: '2px solid rgba(255,255,255,0.1)' }}
              title="Change photo"
            >
              {avatarPreview || profile?.avatar_url ? (
                <img
                  src={avatarPreview ?? profile!.avatar_url!}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center"
                  style={{ background: '#151F31' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="#65738A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.55)' }}>
                {uploadingAvatar ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className={inputCls + ' flex-1'}
                  style={inputStyle}
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  maxLength={80}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveName}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? '…' : 'Save'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditingName(false)}>
                  ✕
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/name">
                <p className="text-[16px] font-semibold text-[#F5F7FA]">
                  {profile?.display_name || 'Unnamed'}
                </p>
                <button
                  type="button"
                  onClick={() => { setNameValue(profile?.display_name ?? ''); setEditingName(true) }}
                  className="opacity-0 group-hover/name:opacity-100 transition-opacity text-[#65738A] hover:text-[#F5F7FA]"
                  title="Edit name"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            )}
            {profile?.handle && (
              <p className="text-[13px] text-[#65738A] mt-0.5">@{profile.handle}</p>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge variant="blue">{profile?.timezone ?? 'UTC'}</Badge>
              {(profile?.current_streak_days ?? 0) > 0 && (
                <Badge variant="gold">{profile?.current_streak_days}d streak</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KPICard
            label="Total Solved"
            value={stats.total_solved}
            subtext="problems"
            accentColor="green"
          />
          <KPICard
            label="Struggle Time"
            value={`${Math.round(stats.total_struggle_hours)}h`}
            subtext="deep work"
            accentColor="amber"
          />
          <KPICard
            label="Flawless"
            value={stats.flawless_solves}
            subtext="GREEN solves"
            accentColor="blue"
          />
          <KPICard
            label="Contests"
            value={stats.contest_count}
            subtext="logged"
            accentColor="red"
          />
        </div>
      )}

      {/* New mission CTA */}
      <div className="rounded-[16px] border p-5 flex items-center justify-between gap-4"
        style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div>
          <p className="text-[14px] font-semibold text-[#F5F7FA]">New Mission</p>
          <p className="text-[12px] text-[#65738A] mt-0.5">
            Create a time-boxed training plan with a rating target
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => { setMissionForm(DEFAULT_MISSION_FORM); setShowNewMission(true) }}
          className="flex-none"
        >
          + New Mission
        </Button>
      </div>

      {/* New Mission Dialog */}
      <Dialog
        open={showNewMission}
        onClose={() => setShowNewMission(false)}
        title="Create New Mission"
        size="md"
      >
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className={labelCls}>Mission Title *</label>
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="e.g. Codeforces 1200 → 1600 in 90 Days"
              value={missionForm.title}
              onChange={(e) => patchMission({ title: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows={2}
              className={inputCls + ' resize-none'}
              style={inputStyle}
              placeholder="Optional goal statement…"
              value={missionForm.description}
              onChange={(e) => patchMission({ description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <input
                type="date"
                className={inputCls}
                style={inputStyle}
                value={missionForm.start_date}
                onChange={(e) => patchMission({ start_date: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Duration (days)</label>
              <input
                type="number"
                className={inputCls}
                style={inputStyle}
                placeholder="90"
                value={missionForm.duration_days}
                onChange={(e) => patchMission({ duration_days: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Baseline Rating</label>
              <input
                type="number"
                className={inputCls}
                style={inputStyle}
                placeholder="1200"
                value={missionForm.baseline_rating}
                onChange={(e) => patchMission({ baseline_rating: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Target Rating</label>
              <input
                type="number"
                className={inputCls}
                style={inputStyle}
                placeholder="1600"
                value={missionForm.target_rating}
                onChange={(e) => patchMission({ target_rating: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Daily Time Budget</label>
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="e.g. 2 hours"
              value={missionForm.daily_time_budget}
              onChange={(e) => patchMission({ daily_time_budget: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setShowNewMission(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreateMission}
              disabled={createMission.isPending}
            >
              {createMission.isPending ? 'Creating…' : 'Create Mission'}
            </Button>
          </div>
        </div>
      </Dialog>
      </div>
      </div>
    </div>
  )
}
