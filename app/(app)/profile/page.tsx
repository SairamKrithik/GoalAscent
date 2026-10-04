'use client'

import { useState, useRef, useEffect } from 'react'
import { useProfile, useProfileStats, useMissions, useCreateMission, useUpdateProfile, useImportSchedule, useUserPlatformRatings, useUpsertUserPlatformRating, useTogglePinRating, useDeletePlatformHistory, useUpdateMissionStatus, useSharedMissions, useToggleMissionShare, useSharedMissionSchedule, type CreateMissionInput } from '@/lib/queries'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { KPICard } from '@/components/KPICard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Dialog } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { validateImport, IMPORT_EXAMPLE } from '@/lib/importUtils'
import type { ImportedMission } from '@/lib/types'
import { PLATFORMS } from '@/lib/types'
import { useAllContestLogs } from '@/lib/queries'
import { GlobalRatingChart } from '@/components/GlobalRatingChart'

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
  const { data: allContestLogs = [] } = useAllContestLogs()
  const createMission = useCreateMission()
  const updateProfile = useUpdateProfile()
  const togglePinRating = useTogglePinRating()
  const upsertRating = useUpsertUserPlatformRating()
  const deletePlatformHistory = useDeletePlatformHistory()
  const updateMissionStatus = useUpdateMissionStatus()
  const importSchedule = useImportSchedule()
  const toggleMissionShare = useToggleMissionShare()
  const router = useRouter()
  const searchParams = useSearchParams()

  const { activeMissionId, setActiveMissionId } = useAppStore()

  const qc = useQueryClient()
  const [showNewMission, setShowNewMission] = useState(false)
  const [missionForm, setMissionForm] = useState<NewMissionForm>(DEFAULT_MISSION_FORM)
  const [scheduleSource, setScheduleSource] = useState<'ai' | 'json'>('ai')
  const [scheduleJson, setScheduleJson] = useState('')
  const [showExample, setShowExample] = useState(false)
  const [aiRole, setAiRole] = useState('SDE-1')
  const [aiGoal, setAiGoal] = useState('Interview Prep')
  const [aiPlatform, setAiPlatform] = useState('LeetCode')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiGeneratedSchedule, setAiGeneratedSchedule] = useState<ImportedMission | null>(null)

  const [showBrowseModal, setShowBrowseModal] = useState(false)
  const [browseSearch, setBrowseSearch] = useState('')
  const [browsePage, setBrowsePage] = useState(0)
  const [selectedSharedMissionId, setSelectedSharedMissionId] = useState<string | null>(null)

  const { data: sharedMissionsData } = useSharedMissions(browseSearch, browsePage, 10)
  const sharedMissions = sharedMissionsData?.data
  const sharedMissionsCount = sharedMissionsData?.count || 0
  const { data: sharedMissionSchedule } = useSharedMissionSchedule(selectedSharedMissionId)

  const [signingOut, setSigningOut] = useState(false)
  const [showRatingsModal, setShowRatingsModal] = useState(false)
  const [addRatingPlatform, setAddRatingPlatform] = useState('Codeforces')
  const [addRatingValue, setAddRatingValue] = useState('')
  const [showAddRatingForm, setShowAddRatingForm] = useState(false)
  const [editingRatingPlatform, setEditingRatingPlatform] = useState<string | null>(null)
  const [editingRatingValue, setEditingRatingValue] = useState('')
  const [selectedChartPlatform, setSelectedChartPlatform] = useState<string>('')

  // Profile editing state
  const [deletePlatformInfo, setDeletePlatformInfo] = useState<{ platform: string } | null>(null)
  const [abandonMissionInfo, setAbandonMissionInfo] = useState<{ missionId: string; title: string } | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')

  // Sync profile name when loaded
  useEffect(() => {
    if (profile?.display_name) {
      setNameValue(profile.display_name)
    }
  }, [profile?.display_name])

  // Auto-populate baseline rating when platform changes
  useEffect(() => {
    if (ratings && showNewMission) {
      const ratingObj = ratings.find((r) => r.platform.toLowerCase() === missionForm.platform.toLowerCase());
      if (ratingObj && missionForm.baseline_rating === '') {
        setMissionForm((prev) => ({ ...prev, baseline_rating: ratingObj.rating.toString() }));
      }
    }
  }, [missionForm.platform, ratings, showNewMission]);

  // Open new mission dialog when navigated here with ?newMission=1
  useEffect(() => {
    if (searchParams.get('newMission') === '1') {
      setMissionForm(DEFAULT_MISSION_FORM)
      setScheduleJson('')
      setShowExample(false)
      setShowNewMission(true)
      router.replace('/profile')
    }
  }, [searchParams, router])

  // Default the chart platform to the first platform that has any contest log with a rating,
  // falling back to the first entry in ratings if no logs exist yet.
  useEffect(() => {
    if (selectedChartPlatform) return
    const firstWithLog = allContestLogs.find((l) => l.new_rating !== null)?.platform
    if (firstWithLog) {
      setSelectedChartPlatform(firstWithLog)
      return
    }
    if (ratings && ratings.length > 0) {
      setSelectedChartPlatform(ratings[0].platform)
    }
  }, [allContestLogs, ratings, selectedChartPlatform])

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
    setDeletePlatformInfo({ platform })
  }

  async function performDeletePlatform() {
    if (!deletePlatformInfo) return
    const platform = deletePlatformInfo.platform
    try {
      await deletePlatformHistory.mutateAsync(platform)
      toast.success(`${platform} history deleted`)
      setDeletePlatformInfo(null)
    } catch (err: any) {
      toast.error(err?.message ?? `Failed to delete ${platform} history`)
    }
  }

  async function handleAddRating() {
    const rating = Number(addRatingValue)
    if (!addRatingValue || isNaN(rating) || rating < 0) {
      toast.error('Enter a valid rating')
      return
    }
    try {
      await upsertRating.mutateAsync({ platform: addRatingPlatform, rating })
      toast.success(`${addRatingPlatform} rating saved`)
      setAddRatingValue('')
      setShowAddRatingForm(false)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save rating')
    }
  }

  async function handleSaveEditRating(platform: string) {
    const rating = Number(editingRatingValue)
    if (!editingRatingValue || isNaN(rating) || rating < 0) {
      toast.error('Enter a valid rating')
      return
    }
    try {
      await upsertRating.mutateAsync({ platform, rating })
      toast.success(`${platform} rating updated`)
      setEditingRatingPlatform(null)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update rating')
    }
  }

  function patchMission(patch: Partial<NewMissionForm>) {
    setMissionForm((prev) => ({ ...prev, ...patch }))
  }

  async function handleGenerateAISchedule() {
    if (!aiRole || !aiGoal || !aiPlatform) {
      toast.error('Please select role, goal, and platform')
      return
    }
    const days = parseInt(missionForm.duration_days, 10)
    if (isNaN(days) || days < 10) {
      toast.error('Set a duration of at least 10 days in the mission form above')
      return
    }
    setAiGenerating(true)
    setAiGeneratedSchedule(null)
    try {
      const res = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: aiRole,
          goal: aiGoal,
          platform: aiPlatform,
          numDays: days,
          startDate: missionForm.start_date,
          ...(missionForm.baseline_rating ? { baselineRating: Number(missionForm.baseline_rating) } : {}),
          ...(missionForm.target_rating ? { targetRating: Number(missionForm.target_rating) } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'AI generation failed')
      setAiGeneratedSchedule(data.schedule)
      setMissionForm((prev) => ({ ...prev, duration_days: String(data.schedule.days.length) }))
      toast.success(`Schedule generated: ${data.schedule.days.length} days ready!`)
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setAiGenerating(false)
    }
  }

  async function handleCreateMission() {
    if (!missionForm.title) { toast.error('Mission title is required'); return }
    if (!missionForm.duration_days || Number(missionForm.duration_days) < 1) {
      toast.error('Duration must be at least 1 day'); return
    }

    let validatedSchedule: ImportedMission | null = null

    if (scheduleSource === 'ai') {
      if (!aiGeneratedSchedule) {
        toast.error('Generate a schedule first using the AI assistant')
        return
      }
      validatedSchedule = aiGeneratedSchedule
    } else {
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
        is_shared: false,
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
      setScheduleSource('ai')
      setAiRole('SDE-1')
      setAiGoal('Interview Prep')
      setAiPlatform('LeetCode')
      setAiGeneratedSchedule(null)
      setActiveMissionId(newMission.mission_id)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create mission')
    }
  }

  async function handleLockInMission() {
    if (!selectedSharedMissionId) {
      toast.error('Select a shared mission to fork')
      return
    }
    const sharedMissionData = sharedMissions?.find(sm => sm.mission_id === selectedSharedMissionId)
    if (!sharedMissionData) {
      toast.error('Mission data not found')
      return
    }
    if (!sharedMissionSchedule || sharedMissionSchedule.length === 0) {
      toast.error('Selected mission has no schedule to fork')
      return
    }

    const validatedSchedule: ImportedMission = {
      days: sharedMissionSchedule.map((dt) => ({
        day_number: dt.day_number,
        stage: dt.stage ?? undefined,
        topic: dt.topic ?? undefined,
        primary_skill: dt.primary_skill ?? undefined,
        time_target: dt.time_target ?? undefined,
        checkpoint: dt.checkpoint ?? undefined,
        drill_type: dt.drill_type ?? undefined,
        problems: (dt.problem_items ?? []).map((p) => ({
          slot: p.slot ?? undefined,
          title: p.title,
          platform: p.platform,
          problem_number: p.problem_number ?? undefined,
          difficulty_rating: p.difficulty_rating ?? undefined,
          url: p.url,
          rationale: p.rationale ?? undefined,
          topic_tags: p.topic_tags,
        })),
      })),
    }

    try {
      const newMission = await createMission.mutateAsync({
        title: sharedMissionData.title + ' (Forked)',
        description: sharedMissionData.description,
        duration_days: sharedMissionData.duration_days,
        baseline_rating: sharedMissionData.baseline_rating,
        target_rating: sharedMissionData.target_rating,
        daily_time_budget: sharedMissionData.daily_time_budget,
        start_date: new Date().toISOString().slice(0, 10), // start today
        rest_days: [],
        status: 'Active',
        forked_from_mission_id: selectedSharedMissionId,
        forked_from_template_id: null,
        is_shared: false,
        platform: sharedMissionData.platform,
      } satisfies CreateMissionInput)

      await importSchedule.mutateAsync({
        missionId: newMission.mission_id,
        startDate: newMission.start_date,
        imported: validatedSchedule,
      })

      toast.success('Forked mission successfully!')
      setShowBrowseModal(false)
      setBrowseSearch('')
      setSelectedSharedMissionId(null)
      setActiveMissionId(newMission.mission_id)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to fork mission')
    }
  }

  async function handleToggleShare(missionId: string, currentIsShared: boolean) {
    try {
      await toggleMissionShare.mutateAsync({ missionId, isShared: !currentIsShared })
      toast.success(!currentIsShared ? 'Mission shared publicly' : 'Mission unshared')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update share status')
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
    qc.clear() // Clear all React Query data to prevent crossover between accounts
    setActiveMissionId(null) // Reset local mission selection
    // Use window.location to force a full hard reload, entirely wiping JS memory,
    // Next.js router cache, React Query cache, and singletons.
    window.location.href = '/login'
  }

  async function handleAbandonMission(missionId: string, title: string) {
    setAbandonMissionInfo({ missionId, title })
  }

  async function performAbandonMission() {
    if (!abandonMissionInfo) return
    const { missionId } = abandonMissionInfo
    try {
      await updateMissionStatus.mutateAsync({ missionId, status: 'Archived' })
      if (activeMissionId === missionId) {
        setActiveMissionId(null)
      }
      toast.success('Mission abandoned')
      setAbandonMissionInfo(null)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to abandon mission')
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

      {/* Global Rating Chart */}
      {(() => {
        const logPlatforms = Array.from(
          new Set(allContestLogs.filter((l) => l.new_rating !== null).map((l) => l.platform))
        )
        const ratingPlatforms = (ratings ?? []).map((r) => r.platform)
        const platformOptions = Array.from(new Set([...logPlatforms, ...ratingPlatforms]))

        if (platformOptions.length === 0) return null

        const activePlatform = selectedChartPlatform || platformOptions[0]

        return (
          <div
            className="rounded-[16px] border p-5"
            style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <p className="text-[14px] font-semibold text-[#F5F7FA]">Global Rating History</p>
              {platformOptions.length > 1 && (
                <select
                  className="rounded-[8px] border px-2.5 py-1 text-[12px] text-[#F5F7FA] outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{
                    background: '#080D18',
                    borderColor: 'rgba(255,255,255,0.10)',
                    colorScheme: 'dark',
                  }}
                  value={activePlatform}
                  onChange={(e) => setSelectedChartPlatform(e.target.value)}
                >
                  {platformOptions.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              )}
              {platformOptions.length === 1 && (
                <span className="text-[12px] text-[#65738A]">{activePlatform}</span>
              )}
            </div>
            <GlobalRatingChart allContestLogs={allContestLogs} platform={activePlatform} />
          </div>
        )
      })()}

      {/* New mission CTA */}
      <div className="rounded-[16px] border p-5 flex items-center justify-between gap-4"
        style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div>
          <p className="text-[14px] font-semibold text-[#F5F7FA]">New Mission</p>
          <p className="text-[12px] text-[#65738A] mt-0.5">
            {missions?.some((m) => m.status === 'Active')
              ? 'Abandon your active mission before starting a new one'
              : 'Create a time-boxed training plan with a rating target'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (missions?.some((m) => m.status === 'Active')) {
                toast.error('Abandon your active mission first before starting a new one')
                return
              }
              setBrowseSearch('')
              setBrowsePage(0)
              setSelectedSharedMissionId(null)
              setShowBrowseModal(true)
            }}
            className="flex-none"
            disabled={missions?.some((m) => m.status === 'Active')}
          >
            Browse Shared
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (missions?.some((m) => m.status === 'Active')) {
                toast.error('Abandon your active mission first before creating a new one')
                return
              }
              setMissionForm(DEFAULT_MISSION_FORM)
              setScheduleJson('')
              setShowExample(false)
              setShowNewMission(true)
            }}
            className="flex-none"
            disabled={missions?.some((m) => m.status === 'Active')}
          >
            + New Mission
          </Button>
        </div>
      </div>

      {/* Achievements link */}
      <div className="rounded-[16px] border p-5 flex items-center justify-between gap-4"
        style={{ background: '#101827', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div>
          <p className="text-[14px] font-semibold text-[#F5F7FA]">Achievements</p>
          <p className="text-[12px] text-[#65738A] mt-0.5">
            View completed missions and export shareable achievement cards
          </p>
        </div>
        <Link
          href="/achievements"
          className="flex-none inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))', border: '1px solid rgba(251,191,36,0.25)', color: '#FCD34D' }}
        >
          🏆 View Achievements
        </Link>
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
                {m.status === 'Active' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAbandonMission(m.mission_id, m.title)}
                    disabled={updateMissionStatus.isPending}
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/30 border-red-900/30"
                  >
                    Abandon Mission
                  </Button>
                )}
                {!m.forked_from_mission_id && (
                  <button
                    onClick={() => handleToggleShare(m.mission_id, m.is_shared)}
                    disabled={toggleMissionShare.isPending}
                    className="flex-none text-[12px] font-medium px-3 py-1.5 rounded-[8px] transition-all"
                    style={m.is_shared
                      ? { background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }
                      : { background: 'rgba(255,255,255,0.04)', color: '#65738A', border: '1px solid rgba(255,255,255,0.07)' }
                    }
                  >
                    {m.is_shared ? 'Shared' : 'Share'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      
      {/* Confirm Dialogs */}
      {deletePlatformInfo && (
        <ConfirmDialog
          isOpen={!!deletePlatformInfo}
          onOpenChange={(open) => !open && setDeletePlatformInfo(null)}
          title={`Delete ${deletePlatformInfo.platform} History`}
          description={`Are you sure you want to completely delete all rating history and contest logs for ${deletePlatformInfo.platform}? This cannot be undone.`}
          onConfirm={performDeletePlatform}
          isLoading={deletePlatformHistory.isPending}
        />
      )}
      {abandonMissionInfo && (
        <ConfirmDialog
          isOpen={!!abandonMissionInfo}
          onOpenChange={(open) => !open && setAbandonMissionInfo(null)}
          title={`Abandon Mission: ${abandonMissionInfo.title}`}
          description="Are you sure you want to abandon this mission? It will be archived and you will be able to start a new mission. Your schedule data, problem logs, and contest logs will be preserved."
          onConfirm={performAbandonMission}
          isLoading={updateMissionStatus.isPending}
        />
      )}

      {/* Manage Ratings Modal */}
      <Dialog
        open={showRatingsModal}
        onClose={() => { setShowRatingsModal(false); setEditingRatingPlatform(null); setShowAddRatingForm(false) }}
        title="Manage Platform Ratings"
        size="md"
      >
        <div className="p-6 space-y-5">
          <p className="text-[13px] text-[#65738A]">Pin up to 2 platforms to display on your dashboard.</p>

          {/* Existing ratings list */}
          {(ratings ?? []).length > 0 && (
            <div className="space-y-2">
              {ratings!.map(r => (
                <div key={r.platform} className="rounded-[12px] border p-4 flex items-center justify-between gap-4"
                  style={{ background: '#0F1523', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#F5F7FA] truncate">{r.platform}</p>
                    {editingRatingPlatform === r.platform ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          autoFocus
                          type="number"
                          className={inputCls + ' w-28'}
                          style={inputStyle}
                          value={editingRatingValue}
                          onChange={(e) => setEditingRatingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditRating(r.platform)
                            if (e.key === 'Escape') setEditingRatingPlatform(null)
                          }}
                        />
                        <Button variant="primary" size="sm" onClick={() => handleSaveEditRating(r.platform)} disabled={upsertRating.isPending}>
                          {upsertRating.isPending ? '…' : 'Save'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setEditingRatingPlatform(null)}>✕</Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-[13px] text-[#65738A] mt-0.5 hover:text-[#F5F7FA] transition-colors text-left"
                        title="Click to edit"
                        onClick={() => { setEditingRatingPlatform(r.platform); setEditingRatingValue(r.rating.toString()) }}
                      >
                        Rating: <span className="font-bold text-[#E2E8F0]">{r.rating}</span> <span className="text-[11px] text-[#65738A]">(click to edit)</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleTogglePin(r.platform, !!r.is_pinned)}
                      className="p-2 transition-colors hover:bg-white/5 rounded-full outline-none"
                      title={r.is_pinned ? 'Unpin platform' : 'Pin platform'}
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

          {/* Add new platform rating */}
          {showAddRatingForm ? (
            <div className="rounded-[12px] border p-4 space-y-3"
              style={{ background: '#0A1020', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-[#65738A]">Add / update a platform rating</p>
                <button
                  type="button"
                  onClick={() => { setShowAddRatingForm(false); setAddRatingValue('') }}
                  className="text-[#65738A] hover:text-[#F5F7FA] transition-colors"
                  title="Cancel"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  className={inputCls + ' flex-1 min-w-[140px]'}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                  value={addRatingPlatform}
                  onChange={(e) => setAddRatingPlatform(e.target.value)}
                >
                  {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </select>
                <input
                  type="number"
                  className={inputCls + ' w-28'}
                  style={inputStyle}
                  placeholder="Rating"
                  value={addRatingValue}
                  onChange={(e) => setAddRatingValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddRating() }}
                  autoFocus
                />
                <Button variant="primary" size="sm" onClick={handleAddRating} disabled={upsertRating.isPending}>
                  {upsertRating.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowAddRatingForm(true)}>
              + Add Rating
            </Button>
          )}
        </div>
      </Dialog>

      {/* Browse Shared Missions Dialog */}
      <Dialog
        open={showBrowseModal}
        onClose={() => setShowBrowseModal(false)}
        title="Browse Shared Missions"
        size="md"
      >
        <div className="space-y-4 px-6 py-5 flex flex-col h-[500px]">
          <div className="flex-none">
            <input
              type="text"
              className={inputCls}
              style={inputStyle}
              placeholder="Search by title or description…"
              value={browseSearch}
              onChange={(e) => {
                setBrowseSearch(e.target.value)
                setBrowsePage(0)
                setSelectedSharedMissionId(null)
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {!sharedMissions || sharedMissions.length === 0 ? (
              <p className="text-[13px] text-[#65738A] text-center mt-10">
                {browseSearch.trim() ? 'No missions match your search.' : 'No shared missions available.'}
              </p>
            ) : (
              sharedMissions.map((sm) => {
                const isSelected = selectedSharedMissionId === sm.mission_id
                return (
                  <button
                    key={sm.mission_id}
                    onClick={() => setSelectedSharedMissionId(isSelected ? null : sm.mission_id)}
                    className="text-left rounded-[10px] p-3 transition-all outline-none"
                    style={{
                      background: isSelected ? 'rgba(29,78,216,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSelected ? 'rgba(29,78,216,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <p className="text-[14px] font-medium text-[#F5F7FA]">{sm.title}</p>
                    {sm.description && (
                      <p className="text-[12px] text-[#9AA7BA] mt-1 line-clamp-2">{sm.description}</p>
                    )}
                    <p className="text-[11px] text-[#65738A] mt-2 font-medium">
                      {sm.duration_days} days
                      {sm.baseline_rating ? ` • ${sm.baseline_rating}` : ''}
                      {sm.target_rating ? ` → ${sm.target_rating}` : ''}
                      {sm.platform ? ` • ${sm.platform}` : ''}
                      {sm.profiles?.display_name ? ` • by ${sm.profiles.display_name}` : ''}
                    </p>
                  </button>
                )
              })
            )}
          </div>

          {/* Pagination Controls */}
          {sharedMissionsCount > 10 && (
            <div className="flex-none flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[11px] text-[#65738A]">
                Showing {browsePage * 10 + 1}-{Math.min((browsePage + 1) * 10, sharedMissionsCount)} of {sharedMissionsCount}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={browsePage === 0}
                  onClick={() => setBrowsePage(p => p - 1)}
                  className="px-2 py-1 text-[11px] font-medium text-[#9AA7BA] disabled:opacity-30 hover:text-white"
                >
                  Prev
                </button>
                <button
                  disabled={(browsePage + 1) * 10 >= sharedMissionsCount}
                  onClick={() => setBrowsePage(p => p + 1)}
                  className="px-2 py-1 text-[11px] font-medium text-[#9AA7BA] disabled:opacity-30 hover:text-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="flex-none flex justify-end gap-2 pt-2 border-t border-white/5">
            <Button variant="secondary" onClick={() => setShowBrowseModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleLockInMission}
              disabled={!selectedSharedMissionId || createMission.isPending || importSchedule.isPending}
            >
              {createMission.isPending || importSchedule.isPending ? 'Forking…' : 'Lock In'}
            </Button>
          </div>
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

          {/* Schedule source toggle */}
          <div>
            <label className={labelCls}>Schedule Source *</label>
            <div className="flex rounded-[10px] p-0.5 gap-0.5" style={{ background: '#080D18', border: '1px solid rgba(255,255,255,0.07)' }}>
              {(['ai', 'json'] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setScheduleSource(src)}
                  className="flex-1 py-1.5 rounded-[8px] text-[12px] font-medium transition-all duration-150"
                  style={scheduleSource === src
                    ? { background: '#1D4ED8', color: '#F5F7FA' }
                    : { color: '#65738A' }
                  }
                >
                  {src === 'ai' ? '✦ Generate with AI' : 'Import JSON'}
                </button>
              ))}
            </div>
          </div>

          {scheduleSource === 'ai' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Role</label>
                  <select className={inputCls} style={inputStyle} value={aiRole} onChange={(e) => setAiRole(e.target.value)}>
                    {['SDE-1', 'SDE-2', 'Frontend', 'Backend', 'Full-Stack', 'Competitive Programmer'].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Goal</label>
                  <select className={inputCls} style={inputStyle} value={aiGoal} onChange={(e) => setAiGoal(e.target.value)}>
                    {['Interview Prep', 'Upskilling', 'Competitive Programming', 'Rating Push', 'Foundation Building'].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Platform</label>
                  <select className={inputCls} style={inputStyle} value={aiPlatform} onChange={(e) => setAiPlatform(e.target.value)}>
                    {['LeetCode', 'Codeforces', 'AtCoder', 'Both (LeetCode + Codeforces)', 'All Platforms'].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateAISchedule}
                disabled={aiGenerating}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#fff' }}
              >
                {aiGenerating ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Generate Schedule
                  </>
                )}
              </button>

              {aiGeneratedSchedule && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-[8px]"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-[12px] text-[#22C55E] font-medium">
                    {aiGeneratedSchedule.days.length}-day schedule ready — click Create Mission to import
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-[#65738A]">Schedule JSON *</label>
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
          )}

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
