// Database types mirroring the GoalAscent Supabase schema.
// Keep in sync with migrations if the schema evolves.

export type ReviewTag = 'GREEN' | 'YELLOW' | 'RED'
export type ProblemStatus = 'Pending' | 'In Progress' | 'Done' | 'Skipped'
export type MissionStatus = 'Active' | 'Archived' | 'Completed'

export interface Profile {
  user_id: string
  display_name: string
  handle: string
  avatar_url: string | null
  timezone: string
  current_streak_days: number
  last_active_date: string | null
  notification_prefs: {
    push: boolean
    email: boolean
    quiet_hours: string | null
  }
  created_at: string
}

export interface MissionTemplate {
  template_id: string
  title: string
  description: string | null
  duration_days: number
  baseline_rating: number | null
  target_rating: number | null
  daily_time_budget: string | null
  is_public: boolean
  created_by: string | null
}

export interface Mission {
  mission_id: string
  user_id: string
  title: string
  description: string | null
  duration_days: number
  baseline_rating: number | null
  target_rating: number | null
  daily_time_budget: string | null
  start_date: string
  rest_days: number[]
  status: MissionStatus
  forked_from_mission_id: string | null
  forked_from_template_id: string | null
  share_token: string
  created_at: string
}

export interface DayTask {
  day_task_id: string
  mission_id: string
  day_number: number
  stage: string | null
  topic: string | null
  primary_skill: string | null
  time_target: string | null
  checkpoint: string | null
  drill_type: string | null
  is_completed: boolean
  problem_items?: ProblemItem[]
}

export interface ProblemItem {
  problem_id: string
  day_task_id: string
  mission_id: string
  slot: string | null
  platform: string
  title: string
  problem_number: string | null
  difficulty_rating: number | null
  url: string
  rationale: string | null
  topic_tags: string[]
  status: ProblemStatus
  tag: ReviewTag | null
  struggle_time_mins: number
  bottleneck_note: string | null
  viewed_editorial: boolean
  solved_at: string | null
  notes: string | null
}

export interface ContestLog {
  log_id: string
  mission_id: string
  platform: string
  contest_date: string
  contest_name: string | null
  problems_solved: number | null
  total_time_mins: number | null
  penalties: number
  rank_percentile: string | null
  rating_delta: number | null
  new_rating: number | null
  error_entries: ErrorEntry[]
}

export interface ErrorEntry {
  problem?: string
  category: number // 1-8
  note: string
}

export interface ReviewQueueItem {
  review_id: string
  problem_id: string
  user_id: string
  due_date: string
  origin_tag: 'RED' | 'YELLOW'
  attempt_number: number
  resolved: boolean
  resolved_tag: ReviewTag | null
  problem_items?: ProblemItem
}

export interface ProfileStats {
  user_id: string
  total_solved: number
  total_struggle_hours: number
  flawless_solves: number
  contest_count: number
}

// Import format types
export interface ImportedProblem {
  slot?: string
  title: string
  platform: string
  problem_number?: number | string
  difficulty_rating?: number
  url: string
  rationale?: string
  topic_tags?: string[]
}

export interface ImportedContest {
  platform?: string
  name?: string
  problems_solved?: number
  total_time_mins?: number
  penalties?: number
  rank_percentile?: string
  rating_delta?: number
  new_rating?: number
}

export interface ImportedDay {
  day_number: number
  stage?: string
  topic?: string
  primary_skill?: string
  time_target?: string
  checkpoint?: string
  drill_type?: string
  problems?: ImportedProblem[]
  contest?: ImportedContest
}

export interface ImportedMission {
  days: ImportedDay[]
}

// Platform color map
export const PLATFORM_COLORS: Record<string, string> = {
  LeetCode: '#FFA116',
  Codeforces: '#1F8DD6',
  AtCoder: '#808080',
  HackerRank: '#00EA64',
  CodeChef: '#5B4638',
}

export const ERROR_CATEGORIES = [
  "Didn't know technique",
  'Knew technique, failed recognition',
  'Had idea, couldn\'t implement',
  'Implementation bug / WA / TLE',
  'Too slow',
  'Mathematical observation missing',
  'Time-management failure',
  'None (Flawless Performance)',
] as const
