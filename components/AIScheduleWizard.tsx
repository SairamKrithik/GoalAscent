// Multi-step wizard for generating an AI-powered training schedule via Groq.
// Collects user preferences (role, goal, platform, duration), calls the
// /api/generate-schedule route, then ingests the result via useImportSchedule.
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useImportSchedule, useCreateMission, useMissions } from '@/lib/queries'
import { useAppStore } from '@/lib/store'
import type { ImportedMission } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = [
  'SDE-1',
  'SDE-2',
  'Frontend',
  'Backend',
  'Full-Stack',
  'Competitive Programmer',
] as const

const GOALS = [
  'Interview Prep',
  'Upskilling',
  'Competitive Programming',
  'Rating Push',
  'Foundation Building',
] as const

const PLATFORMS = [
  'LeetCode',
  'Codeforces',
  'AtCoder',
  'Both (LeetCode + Codeforces)',
  'All Platforms',
] as const

const DAY_PRESETS = [10, 21, 30, 45, 60, 90] as const

type Role = (typeof ROLES)[number]
type Goal = (typeof GOALS)[number]
type PlatformChoice = (typeof PLATFORMS)[number]

// ─── Helper styles ────────────────────────────────────────────────────────────

const chipBase =
  'rounded-[10px] border px-4 py-2.5 text-[13px] font-medium transition-all duration-150 cursor-pointer select-none active:scale-[0.97]'

function chipCls(selected: boolean): string {
  return selected
    ? `${chipBase} bg-[#1D3461] border-[#3B82F6] text-[#60A5FA]`
    : `${chipBase} border-[rgba(255,255,255,0.07)] text-[#9AA7BA] hover:border-[rgba(255,255,255,0.15)] hover:text-[#F5F7FA]`
}

// ─── Step labels ──────────────────────────────────────────────────────────────

const STEPS = ['Role', 'Goal', 'Platform', 'Duration', 'Generate'] as const
type Step = (typeof STEPS)[number]

const STEP_INDEX: Record<Step, number> = {
  Role: 0,
  Goal: 1,
  Platform: 2,
  Duration: 3,
  Generate: 4,
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

interface WizardState {
  role: Role | null
  goal: Goal | null
  platform: PlatformChoice | null
  numDays: number
  customDays: string
  useCustom: boolean
}

interface AIScheduleWizardProps {
  onClose: () => void
  /** If provided, generate a schedule for this mission instead of creating a new one */
  missionId?: string
  startDate?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AIScheduleWizard({ onClose, missionId: existingMissionId, startDate: existingStartDate }: AIScheduleWizardProps) {
  const { setActiveMissionId } = useAppStore()
  const importSchedule = useImportSchedule()
  const createMission = useCreateMission()
  const { data: missions = [] } = useMissions()

  const [currentStep, setCurrentStep] = useState<Step>('Role')
  const [state, setState] = useState<WizardState>({
    role: null,
    goal: null,
    platform: null,
    numDays: 30,
    customDays: '',
    useCustom: false,
  })
  const [generating, setGenerating] = useState(false)
  const [generatedSchedule, setGeneratedSchedule] = useState<ImportedMission | null>(null)

  const stepIdx = STEP_INDEX[currentStep]

  function next() {
    const steps = Object.keys(STEP_INDEX) as Step[]
    const nextStep = steps[stepIdx + 1]
    if (nextStep) setCurrentStep(nextStep)
  }

  function back() {
    const steps = Object.keys(STEP_INDEX) as Step[]
    const prevStep = steps[stepIdx - 1]
    if (prevStep) setCurrentStep(prevStep)
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case 'Role': return state.role !== null
      case 'Goal': return state.goal !== null
      case 'Platform': return state.platform !== null
      case 'Duration': {
        if (state.useCustom) {
          const n = parseInt(state.customDays, 10)
          return !isNaN(n) && n >= 10 && n <= 365
        }
        return true
      }
      case 'Generate': return false
    }
  }

  function effectiveNumDays(): number {
    if (state.useCustom) {
      const n = parseInt(state.customDays, 10)
      return isNaN(n) ? 30 : Math.max(10, Math.min(365, n))
    }
    return state.numDays
  }

  async function handleGenerate() {
    if (!state.role || !state.goal || !state.platform) return

    const numDays = effectiveNumDays()
    const today = new Date().toISOString().slice(0, 10)

    setGenerating(true)
    setCurrentStep('Generate')

    try {
      // Call the server-side Groq route
      const res = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: state.role,
          goal: state.goal,
          platform: state.platform,
          numDays,
          startDate: existingStartDate ?? today,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Generation failed')
      }

      const schedule = data.schedule as ImportedMission
      setGeneratedSchedule(schedule)

      // Determine which mission to import into
      let targetMissionId = existingMissionId
      let targetStartDate = existingStartDate ?? today

      if (!targetMissionId) {
        // Create a new mission for this schedule
        const platformLabel =
          state.platform === 'Both (LeetCode + Codeforces)' ? 'LeetCode'
          : state.platform === 'All Platforms' ? 'LeetCode'
          : state.platform

        const newMission = await createMission.mutateAsync({
          title: `${state.goal} — ${state.role} (${numDays}d)`,
          description: `AI-generated schedule: ${state.goal} for ${state.role} on ${state.platform} over ${numDays} days.`,
          platform: platformLabel,
          duration_days: numDays,
          baseline_rating: null,
          target_rating: null,
          daily_time_budget: null,
          start_date: today,
          rest_days: [],
          status: 'Active',
          forked_from_mission_id: null,
          forked_from_template_id: null,
          is_shared: false,
        })
        targetMissionId = newMission.mission_id
        targetStartDate = today
        setActiveMissionId(newMission.mission_id)
      }

      // Ingest the schedule
      await importSchedule.mutateAsync({
        missionId: targetMissionId,
        startDate: targetStartDate,
        imported: schedule,
      })

      toast.success(`${numDays}-day schedule generated and imported!`)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(message)
      // Return to Duration step so the user can retry or adjust
      setCurrentStep('Duration')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !generating) onClose() }}
    >
      <div
        className="relative w-full max-w-lg rounded-[20px] overflow-hidden shadow-2xl"
        style={{ background: '#101827', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        {/* Close button */}
        {!generating && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            aria-label="Close"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9AA7BA" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Progress bar */}
        <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${((stepIdx) / (STEPS.length - 1)) * 100}%`,
              background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
            }}
          />
        </div>

        <div className="p-7">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: i < stepIdx ? '#22C55E' : i === stepIdx ? '#3B82F6' : 'rgba(255,255,255,0.07)',
                    color: i <= stepIdx ? '#fff' : '#65738A',
                  }}
                >
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-6 h-px"
                    style={{ background: i < stepIdx ? '#22C55E' : 'rgba(255,255,255,0.1)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          {currentStep === 'Role' && (
            <StepRole
              selected={state.role}
              onSelect={(role) => setState((s) => ({ ...s, role }))}
            />
          )}
          {currentStep === 'Goal' && (
            <StepGoal
              selected={state.goal}
              onSelect={(goal) => setState((s) => ({ ...s, goal }))}
            />
          )}
          {currentStep === 'Platform' && (
            <StepPlatform
              selected={state.platform}
              onSelect={(platform) => setState((s) => ({ ...s, platform }))}
            />
          )}
          {currentStep === 'Duration' && (
            <StepDuration
              numDays={state.numDays}
              customDays={state.customDays}
              useCustom={state.useCustom}
              onSelectPreset={(n) => setState((s) => ({ ...s, numDays: n, useCustom: false }))}
              onToggleCustom={() => setState((s) => ({ ...s, useCustom: !s.useCustom }))}
              onCustomChange={(v) => setState((s) => ({ ...s, customDays: v }))}
            />
          )}
          {currentStep === 'Generate' && (
            <StepGenerate
              role={state.role!}
              goal={state.goal!}
              platform={state.platform!}
              numDays={effectiveNumDays()}
              generating={generating}
            />
          )}

          {/* Navigation buttons */}
          {currentStep !== 'Generate' && (
            <div className="flex items-center justify-between mt-7">
              <button
                onClick={back}
                disabled={stepIdx === 0}
                className="px-4 py-2.5 rounded-[10px] text-[13px] font-medium transition-colors disabled:opacity-30"
                style={{ color: '#9AA7BA', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                Back
              </button>

              {currentStep === 'Duration' ? (
                <button
                  onClick={handleGenerate}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#fff' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Generate Schedule
                </button>
              ) : (
                <button
                  onClick={next}
                  disabled={!canProceed()}
                  className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#fff' }}
                >
                  Continue
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step: Role ───────────────────────────────────────────────────────────────

function StepRole({ selected, onSelect }: { selected: Role | null; onSelect: (r: Role) => void }) {
  return (
    <div>
      <h2 className="text-[18px] font-bold text-[#F5F7FA] mb-1">What&apos;s your role?</h2>
      <p className="text-[13px] text-[#65738A] mb-5">This shapes the problem types and progression curve.</p>
      <div className="flex flex-wrap gap-2.5">
        {ROLES.map((r) => (
          <button key={r} onClick={() => onSelect(r)} className={chipCls(selected === r)}>
            {r}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step: Goal ───────────────────────────────────────────────────────────────

function StepGoal({ selected, onSelect }: { selected: Goal | null; onSelect: (g: Goal) => void }) {
  const GOAL_DESCRIPTIONS: Record<Goal, string> = {
    'Interview Prep': 'Focus on common patterns, FAANG-style problems',
    'Upskilling': 'Broaden your algorithmic toolkit',
    'Competitive Programming': 'Deep dive into CP techniques and contests',
    'Rating Push': 'Targeted ladder to boost your rating',
    'Foundation Building': 'Start from basics, build strong fundamentals',
  }
  return (
    <div>
      <h2 className="text-[18px] font-bold text-[#F5F7FA] mb-1">What&apos;s your goal?</h2>
      <p className="text-[13px] text-[#65738A] mb-5">Defines the topic mix and difficulty progression.</p>
      <div className="flex flex-col gap-2">
        {GOALS.map((g) => (
          <button
            key={g}
            onClick={() => onSelect(g)}
            className={`text-left rounded-[12px] border px-4 py-3 transition-all duration-150 cursor-pointer active:scale-[0.98] ${
              selected === g
                ? 'bg-[#1D3461] border-[#3B82F6]'
                : 'border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.15)]'
            }`}
          >
            <p className={`text-[13px] font-semibold ${selected === g ? 'text-[#60A5FA]' : 'text-[#F5F7FA]'}`}>{g}</p>
            <p className="text-[12px] text-[#65738A] mt-0.5">{GOAL_DESCRIPTIONS[g]}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step: Platform ───────────────────────────────────────────────────────────

function StepPlatform({ selected, onSelect }: { selected: PlatformChoice | null; onSelect: (p: PlatformChoice) => void }) {
  return (
    <div>
      <h2 className="text-[18px] font-bold text-[#F5F7FA] mb-1">Which platform?</h2>
      <p className="text-[13px] text-[#65738A] mb-5">Problems will be sourced from your preferred platform.</p>
      <div className="flex flex-wrap gap-2.5">
        {PLATFORMS.map((p) => (
          <button key={p} onClick={() => onSelect(p)} className={chipCls(selected === p)}>
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step: Duration ───────────────────────────────────────────────────────────

interface StepDurationProps {
  numDays: number
  customDays: string
  useCustom: boolean
  onSelectPreset: (n: number) => void
  onToggleCustom: () => void
  onCustomChange: (v: string) => void
}

function StepDuration({ numDays, customDays, useCustom, onSelectPreset, onToggleCustom, onCustomChange }: StepDurationProps) {
  return (
    <div>
      <h2 className="text-[18px] font-bold text-[#F5F7FA] mb-1">How many days?</h2>
      <p className="text-[13px] text-[#65738A] mb-5">Minimum 10 days. Choose a preset or enter your own.</p>

      <div className="flex flex-wrap gap-2.5 mb-5">
        {DAY_PRESETS.map((n) => (
          <button
            key={n}
            onClick={() => { onSelectPreset(n); if (useCustom) onToggleCustom() }}
            className={chipCls(!useCustom && numDays === n)}
          >
            {n}d
          </button>
        ))}
        <button
          onClick={onToggleCustom}
          className={chipCls(useCustom)}
        >
          Custom
        </button>
      </div>

      {useCustom && (
        <div>
          <label className="block text-[11px] font-medium text-[#65738A] mb-1.5">
            Enter number of days (10 – 365)
          </label>
          <input
            type="number"
            min={10}
            max={365}
            value={customDays}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="e.g. 42"
            className="w-full rounded-[10px] border px-3 py-2.5 text-[13px] text-[#F5F7FA] outline-none transition-all focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 placeholder:text-[#65738A]"
            style={{ background: '#080D18', borderColor: 'rgba(255,255,255,0.07)' }}
            autoFocus
          />
          {customDays && (parseInt(customDays, 10) < 10 || parseInt(customDays, 10) > 365) && (
            <p className="text-[11px] text-[#EF4444] mt-1.5">Must be between 10 and 365 days</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step: Generate (loading/confirmation) ─────────────────────────────────────

interface StepGenerateProps {
  role: Role
  goal: Goal
  platform: PlatformChoice
  numDays: number
  generating: boolean
}

function StepGenerate({ role, goal, platform, numDays, generating }: StepGenerateProps) {
  return (
    <div className="text-center py-4">
      {generating ? (
        <>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="w-6 h-6 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
          </div>
          <p className="text-[16px] font-semibold text-[#F5F7FA] mb-1.5">Generating your schedule…</p>
          <p className="text-[13px] text-[#65738A]">
            AI is crafting a {numDays}-day plan for {role} · {goal}
          </p>
          <p className="text-[12px] text-[#3A4A5E] mt-2">This may take 15–30 seconds</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold text-[#F5F7FA] mb-1.5">Schedule generated!</p>
          <p className="text-[13px] text-[#65738A]">Importing {numDays} days into your mission…</p>
        </>
      )}

      {/* Summary chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
        {[role, goal, platform, `${numDays} days`].map((label) => (
          <span
            key={label}
            className="rounded-full px-3 py-1 text-[12px] font-medium"
            style={{ background: 'rgba(59,130,246,0.10)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
