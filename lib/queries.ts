import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  Mission, DayTask, ProblemItem, ContestLog, ReviewQueueItem, Profile, ProfileStats,
  ImportedMission, UserPlatformRating,
} from '@/lib/types'

const supabase = createClient()

// ─── Missions ────────────────────────────────────────────────────────────────

export function useMissions() {
  return useQuery({
    queryKey: ['missions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Mission[]
    },
  })
}

export function useMission(missionId: string | null) {
  return useQuery({
    queryKey: ['missions', missionId],
    enabled: !!missionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('mission_id', missionId!)
        .single()
      if (error) throw error
      return data as Mission
    },
  })
}

// ─── Day Tasks ────────────────────────────────────────────────────────────────

export function useDayTasks(missionId: string | null) {
  return useQuery({
    queryKey: ['day_tasks', missionId],
    enabled: !!missionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_tasks')
        .select('*, problem_items(*)')
        .eq('mission_id', missionId!)
        .order('day_number', { ascending: true })
      if (error) throw error
      return data as (DayTask & { problem_items: ProblemItem[] })[]
    },
  })
}

// ─── Problems ────────────────────────────────────────────────────────────────

export function useProblemItem(problemId: string) {
  return useQuery({
    queryKey: ['problem_items', problemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problem_items')
        .select('*')
        .eq('problem_id', problemId)
        .single()
      if (error) throw error
      return data as ProblemItem
    },
  })
}

export function useUpdateProblem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ problemId, patch }: { problemId: string; patch: Partial<ProblemItem> }) => {
      const { error } = await supabase
        .from('problem_items')
        .update(patch)
        .eq('problem_id', problemId)
      if (error) throw error
    },
    onSuccess: (_data, { patch }) => {
      qc.invalidateQueries({ queryKey: ['day_tasks'] })
      if (patch.tag) qc.invalidateQueries({ queryKey: ['review_queue'] })
    },
  })
}


export function useUserPlatformRatings() {
  return useQuery({
    queryKey: ['user_platform_ratings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('user_platform_ratings')
        .select('*')
        .eq('user_id', user.id)
      if (error) throw error
      return data as UserPlatformRating[]
    },
  })
}

// ─── Contest Logs ─────────────────────────────────────────────────────────────

export function useTogglePinRating() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ platform, is_pinned }: { platform: string; is_pinned: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('user_platform_ratings')
        .update({ is_pinned })
        .eq('user_id', user.id)
        .eq('platform', platform)

      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_platform_ratings'] }),
  })
}

export function useDeletePlatformHistory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (platform: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Delete user_platform_ratings entry
      const { error: ratingError, count } = await supabase
        .from('user_platform_ratings')
        .delete({ count: 'exact' })
        .eq('user_id', user.id)
        .eq('platform', platform)

      if (ratingError) throw ratingError

      console.log(`Deleted ${count} rating records for platform ${platform}`)

      // Delete contest logs for this platform
      // RLS safely ensures only the current user's contest logs are deleted
      const { error: logsError } = await supabase
        .from('contest_logs')
        .delete()
        .eq('platform', platform)
      if (logsError) throw logsError
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_platform_ratings'] })
      qc.invalidateQueries({ queryKey: ['contest_logs'] })
      qc.invalidateQueries({ queryKey: ['profile_stats'] })
    },
  })
}


export function useContestLogs(missionId: string | null) {
  return useQuery({
    queryKey: ['contest_logs', missionId],
    enabled: !!missionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contest_logs')
        .select('*')
        .eq('mission_id', missionId!)
        .order('contest_date', { ascending: true })
      if (error) throw error
      return data as ContestLog[]
    },
  })
}

export function useCreateContestLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (log: Omit<ContestLog, 'log_id'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('contest_logs').insert(log).select().single()
      if (error) throw error
      
      // Update rating for the platform if new_rating is provided
      if (log.new_rating != null && log.platform) {
         const { error: ratingError } = await supabase.from('user_platform_ratings').upsert({
           user_id: user.id,
           platform: log.platform,
           rating: log.new_rating,
         }, { onConflict: 'user_id,platform' })
         
         if (ratingError) throw ratingError
      }
      
      return data as ContestLog
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contest_logs'] })
      qc.invalidateQueries({ queryKey: ['user_platform_ratings'] })
    },
  })
}

// ─── Review Queue ─────────────────────────────────────────────────────────────

export function useReviewQueue() {
  return useQuery({
    queryKey: ['review_queue'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('review_queue')
        .select('*, problem_items(*)')
        .lte('due_date', today)
        .eq('resolved', false)
        .order('due_date', { ascending: true })
      if (error) throw error
      return data as ReviewQueueItem[]
    },
  })
}

export function useResolveReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ reviewId, resolvedTag }: { reviewId: string; resolvedTag: string }) => {
      const { error } = await supabase
        .from('review_queue')
        .update({ resolved: true, resolved_tag: resolvedTag })
        .eq('review_id', reviewId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['review_queue'] }),
  })
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      // maybeSingle() returns null (not an error) when no row exists
      if (error) throw error
      return data as Profile | null
    },
  })
}

export function useProfileStats() {
  return useQuery({
    queryKey: ['profile_stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_stats')
        .select('*')
        .single()
      if (error) throw error
      return data as ProfileStats
    },
  })
}

// ─── Profile mutations ────────────────────────────────────────────────────────

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: { display_name?: string; avatar_url?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      // upsert so the row is created if the signup trigger never fired for this user.
      // display_name is NOT NULL — provide a default when only avatar_url is in patch.
      const row = {
        user_id: user.id,
        display_name: '',
        ...patch,
      }
      const { error } = await supabase
        .from('profiles')
        .upsert(row, { onConflict: 'user_id' })
      if (error) throw error
    },
    // refetchQueries forces an immediate network fetch rather than just marking stale
    onSuccess: () => qc.refetchQueries({ queryKey: ['profile'] }),
  })
}

// ─── Mission creation ─────────────────────────────────────────────────────────

export type CreateMissionInput = Omit<Mission, 'mission_id' | 'user_id' | 'share_token' | 'created_at'>

export function useCreateMission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateMissionInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('missions')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data as Mission
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] }),
  })
}

export function useDeleteMission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (missionId: string) => {
      // Due to CASCADE constraints, this automatically deletes the related day_tasks,
      // problem_items, contest_logs, and review_queue items.
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('mission_id', missionId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missions'] })
      qc.invalidateQueries({ queryKey: ['profile_stats'] })
      // Some other queries that may be affected by the mission going away
      qc.invalidateQueries({ queryKey: ['day_tasks'] })
      qc.invalidateQueries({ queryKey: ['contest_logs'] })
      qc.invalidateQueries({ queryKey: ['review_queue'] })
    }
  })
}

// ─── Schedule import ──────────────────────────────────────────────────────────

export function useImportSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      missionId,
      startDate,
      imported,
    }: {
      missionId: string
      startDate: string // ISO date string, e.g. '2026-09-18'
      imported: ImportedMission
    }) => {
      const start = new Date(startDate)

      for (const day of imported.days) {
        if (day.day_number < 1) continue

        const dayDate = new Date(start)
        dayDate.setDate(start.getDate() + day.day_number - 1)

        // Upsert the day_task row
        const { data: dayTask, error: dtErr } = await supabase
          .from('day_tasks')
          .upsert(
            {
              mission_id: missionId,
              day_number: day.day_number,
              stage: day.stage ?? null,
              topic: day.topic ?? null,
              primary_skill: day.primary_skill ?? null,
              time_target: day.time_target ?? null,
              checkpoint: day.checkpoint ?? null,
              drill_type: day.drill_type ?? null,
              is_completed: false,
            },
            { onConflict: 'mission_id,day_number', ignoreDuplicates: false },
          )
          .select()
          .single()

        if (dtErr) throw new Error(`Day ${day.day_number}: ${dtErr.message}`)

        // Insert problems if present
        if (day.problems && day.problems.length > 0) {
          const rows = day.problems.map((p, i) => ({
            day_task_id: dayTask.day_task_id,
            mission_id: missionId,
            slot: p.slot ?? String(i + 1),
            platform: p.platform ?? 'Codeforces',
            title: p.title,
            problem_number: p.problem_number != null ? String(p.problem_number) : null,
            difficulty_rating: p.difficulty_rating ?? null,
            url: p.url,
            rationale: p.rationale ?? null,
            topic_tags: p.topic_tags ?? [],
            status: 'Pending' as const,
            tag: null,
            struggle_time_mins: 0,
            bottleneck_note: null,
            viewed_editorial: false,
            solved_at: null,
            notes: null,
          }))

          const { error: piErr } = await supabase.from('problem_items').insert(rows)
          if (piErr) throw new Error(`Day ${day.day_number} problems: ${piErr.message}`)
        }

        // Removed auto-inserting of contest logs to prevent blank logs.
        // Contests are now only logged when the user manually submits a log for a contest drill.
      }
    },
    onSuccess: (_data, { missionId }) => {
      qc.invalidateQueries({ queryKey: ['day_tasks', missionId] })
      qc.invalidateQueries({ queryKey: ['contest_logs', missionId] })
    },
  })
}


// ─── Delete Schedule ──────────────────────────────────────────────────────────

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (missionId: string) => {
      // Deleting day tasks cascades to problem_items
      const { error: dtError } = await supabase.from('day_tasks').delete().eq('mission_id', missionId)
      if (dtError) throw dtError

      const { error: clError } = await supabase.from('contest_logs').delete().eq('mission_id', missionId)
      if (clError) throw clError
    },
    onSuccess: (_, missionId) => {
      qc.invalidateQueries({ queryKey: ['day_tasks', missionId] })
      qc.invalidateQueries({ queryKey: ['contest_logs', missionId] })
      qc.invalidateQueries({ queryKey: ['review_queue'] }) 
    }
  })
}

// ─── Day task bulk-upsert (single day) ───────────────────────────────────────

export function useUpsertDayTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      missionId,
      dayNumber,
      patch,
    }: {
      missionId: string
      dayNumber: number
      patch: Partial<Omit<DayTask, 'day_task_id' | 'mission_id' | 'problem_items'>>
    }) => {
      const { data, error } = await supabase
        .from('day_tasks')
        .upsert(
          { mission_id: missionId, day_number: dayNumber, ...patch },
          { onConflict: 'mission_id,day_number', ignoreDuplicates: false },
        )
        .select()
        .single()
      if (error) throw error
      return data as DayTask
    },
    onSuccess: (_data, { missionId }) =>
      qc.invalidateQueries({ queryKey: ['day_tasks', missionId] }),
  })
}

// ─── Add contest log for a specific date ─────────────────────────────────────
// useCreateContestLog is defined above in the Contest Logs section
