'use client'

import { useState, useRef } from 'react'
import { useProfile, useProfileStats, useMissions, useCreateMission, useUpdateProfile, useDeleteMission, useImportSchedule, useUserPlatformRatings, useTogglePinRating, useDeletePlatformHistory, type CreateMissionInput } from '@/lib/queries'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { KPICard } from '@/components/KPICard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { validateImport, IMPORT_EXAMPLE } from '@/lib/importUtils'
import type { ImportedMission } from '@/lib/types'

interface NewMissionForm {
  platform: string
  title: string
  description: string
  duration_days: string
  baseline_rating: string
  target_rating: string
  daily_time_budget: string
  start_date: string
}

const DEFAULT_MISSION_FORM: NewMissionForm = {
  platform: 'Codeforces',
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
  const { data: ratings } = useUserPlatformRatings()
  const { data: missions } = useMissions()
  const createMission = useCreateMission()
  const updateProfile = useUpdateProfile()
  const togglePinRating = useTogglePinRating()
  const deletePlatformHistory = useDeletePlatformHistory()
  const deleteMission = useDeleteMission()
  const importSchedule = useImportSchedule()
  const router = useRouter()

  const { activeMissionId, setActiveMissionId } = useAppStore()

  const qc = useQueryClient()
  const [showNewMission, setShowNewMission] = useState(false)
  const [missionForm, setMissionForm] = useState<NewMissionForm>(DEFAULT_MISSION_FORM)
  const [scheduleJson, setScheduleJson] = useState('')
  const [showExample, setShowExample] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [showRatingsModal, setShowRatingsModal] = useState(false)

  // Profile editing state
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  
  async function handleTogglePin(platform: string, currentState: boolean) {
    if (!currentState) {
      const pinnedCount = (ratings || []).filter(r => r.is_pinned).length
      if (pinnedCount >= 2) {
        toast.error('You can only pin up to 2 platforms.')
        return
      }
    }
    try {
      await togglePinRating.mutateAsync({ platform, is_pinned: !currentState })
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update pin status')
    }
  }

  async function handleDeletePlatform(platform: string) {
    if (!confirm(`Are you sure you want to completely delete all rating history and contest logs for ${platform}? This cannot be undone.`)) {
      return
    }
    try {
      await deletePlatformHistory.mutateAsync(platform)
      toast.success(`${platform} history deleted`)
    } catch (err: any) {
      toast.error(err?.message ?? `Failed to delete ${platform} history`)
    }
  }

  function patchMission(patch: Partial<NewMissionForm>) {
    setMissionForm((prev) => ({ ...prev, ...patch }))
  }

  async function handleCreateMission() {
    if (!missionForm.title) { toast.error('Mission title is required'); return }
    if (!missionForm.duration_days || Number(missionForm.duration_days) < 1) {
      toast.error('Duration must be at least 1 day'); return
    }

    let validatedSchedule: ImportedMission | null = null
    if (!scheduleJson.trim()) {
      toast.error('Schedule JSON is required to create a mission')
      return
    }

    try {
      const parsed = JSON.parse(scheduleJson)
      validatedSchedule = validateImport(parsed)
    } catch (err: unknown) {
      toast.error(`Schedule JSON error: ${(err as Error).message}`)
      return
    }

    try {
      const newMission = await createMission.mutateAsync({
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
        platform: missionForm.platform,
      } satisfies CreateMissionInput)

      if (validatedSchedule) {
        await importSchedule.mutateAsync({
          missionId: newMission.mission_id,
          startDate: newMission.start_date,
          imported: validatedSchedule,
        })
      }

      toast.success('Mission created' + (validatedSchedule ? ' with schedule!' : '!'))
      setShowNewMission(false)
      setMissionForm(DEFAULT_MISSION_FORM)
      setScheduleJson('')
      setActiveMissionId(newMission.mission_id)
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

  async function handleDeleteMission(missionId: string, title: string) {
    if (!confirm(`Are you sure you want to delete the mission "${title}"? This will permanently delete all associated schedule data, problem logs, and contest logs.`)) {
      return
    }
    try {
      await deleteMission.mutateAsync(missionId)
      if (activeMissionId === missionId) {
        setActiveMissionId(null)
      }
      toast.success('Mission deleted completely')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete mission')
    }
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
        <Button variant="secondary" size="sm" onClick={() => setShowRatingsModal(true)} className="self-start sm:self-auto">
          Manage Ratings
        </Button>
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
          onClick={() => {
            setMissionForm(DEFAULT_MISSION_FORM)
            setScheduleJson('')
            setShowExample(false)
            setShowNewMission(true)
          }}
          className="flex-none"
        >
          + New Mission
        </Button>
      </div>

      {/* Your Missions */}
      <div className="mt-8">
        <h2 className="text-[16px] font-semibold text-[#F5F7FA] mb-4">Your Missions</h2>
        <div className="space-y-3">
          {missions?.length === 0 ? (
            <p className="text-[13px] text-[#65738A]">No missions created yet.</p>
          ) : (
            missions?.map((m) => (
              <div key={m.mission_id} className="rounded-[12px] border p-4 flex items-center justify-between gap-4"
                style={{ background: '#0F1523', borderColor: 'rgba(255,255,255,0.05)' }}>
                <div>
                  <p className="text-[14px] font-medium text-[#F5F7FA]">{m.title}</p>
                  <p className="text-[12px] text-[#65738A] mt-1">
                    {m.status} • {m.duration_days} Days • {m.start_date.slice(0, 10)} • {m.platform || 'Codeforces'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDeleteMission(m.mission_id, m.title)}
                  disabled={deleteMission.isPending}
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30 border-red-900/30"
                >
                  Delete Mission
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      
      {/* Manage Ratings Modal */}
      <Dialog
        open={showRatingsModal}
        onClose={() => setShowRatingsModal(false)}
        title="Manage Platform Ratings"
        size="md"
      >
        <div className="p-6">
          <p className="text-[13px] text-[#65738A] mb-4">Pin up to 2 platforms to display on your dashboard.</p>
          {(!ratings || ratings.length === 0) ? (
            <div className="text-center py-8">
              <p className="text-[14px] text-[#9AA7BA]">No ratings yet.</p>
              <p className="text-[12px] text-[#65738A] mt-1">Log contests to track your ratings.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ratings.map(r => (
                <div key={r.platform} className="rounded-[12px] border p-4 flex items-center justify-between gap-4"
                  style={{ background: '#0F1523', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex-1 min-w-0">
                     <p className="text-[15px] font-semibold text-[#F5F7FA] truncate">{r.platform}</p>
                     <p className="text-[13px] text-[#65738A] mt-0.5">Rating: <span className="font-bold text-[#E2E8F0]">{r.rating}</span></p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleTogglePin(r.platform, !!r.is_pinned)}
                      className="p-2 transition-colors hover:bg-white/5 rounded-full outline-none"
                      title={r.is_pinned ? "Unpin platform" : "Pin platform"}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill={r.is_pinned ? '#EAB308' : 'none'} stroke={r.is_pinned ? '#EAB308' : '#65738A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeletePlatform(r.platform)}
                      disabled={deletePlatformHistory.isPending}
                      className="p-2 transition-colors hover:bg-red-500/10 rounded-full outline-none text-[#65738A] hover:text-red-400"
                      title="Delete platform history"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>


      {/* New Mission Dialog */}
      <Dialog
        open={showNewMission}
        onClose={() => setShowNewMission(false)}
        title="Create New Mission"
        size="md"
      >
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className={labelCls}>Platform *</label>
            <select
              className={inputCls}
              style={inputStyle}
              value={missionForm.platform}
              onChange={(e) => patchMission({ platform: e.target.value })}
            >
              <option value="Codeforces">Codeforces</option>
              <option value="LeetCode">LeetCode</option>
              <option value="AtCoder">AtCoder</option>
              <option value="HackerRank">HackerRank</option>
              <option value="CodeChef">CodeChef</option>
            </select>
          </div>

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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-[#65738A]">Initial Schedule JSON *</label>
              <button
                className="text-blue-400 hover:text-blue-300 underline text-[11px]"
                onClick={() => setShowExample((v) => !v)}
              >
                {showExample ? 'Hide example' : 'View format'}
              </button>
            </div>
            {showExample && (
              <pre className="mb-2 overflow-x-auto rounded-[8px] p-3 text-[10px] leading-relaxed font-mono"
                style={{ background: '#080D18', border: '1px solid rgba(255,255,255,0.07)', color: '#9AA7BA' }}>
                {IMPORT_EXAMPLE}
              </pre>
            )}
            <textarea
              rows={4}
              className={inputCls + ' resize-y font-mono text-[11px]'}
              style={inputStyle}
              placeholder={'{\n  "days": [\n    { "day_number": 1, "topic": "...", "problems": [...] }\n  ]\n}'}
              value={scheduleJson}
              onChange={(e) => setScheduleJson(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => { setShowNewMission(false); setScheduleJson(''); setShowExample(false); }}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreateMission}
              disabled={createMission.isPending || importSchedule.isPending}
            >
              {createMission.isPending || importSchedule.isPending ? 'Creating…' : 'Create Mission'}
            </Button>
          </div>
        </div>
      </Dialog>
      </div>
      </div>
    </div>
  )
}
