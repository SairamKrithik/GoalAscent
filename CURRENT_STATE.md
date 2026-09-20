# Current State — GoalAscent

Last updated: 2026-09-20

## Completed

### Core Infrastructure
- Next.js 16 App Router project scaffold with TypeScript
- Supabase Auth integration (SSR cookies, session refresh middleware)
- React Query v5 with localStorage persistence (`ReactQueryProvider`)
- Zustand store for client state (active mission, filters, timer)
- Full Supabase schema: profiles, missions, day_tasks, problem_items, contest_logs, review_queue
- RLS policies on all tables
- DB triggers: auto-create profile on signup, auto-enqueue review on RED/YELLOW tag
- `profile_stats` DB view with aggregated stats
- Capacitor Android project scaffolded

### Pages & Features
- **Login page** (`/login`) — Supabase Auth UI (Magic Link + Email/Password ONLY. GitHub auth removed)
- **Dashboard** (`/dashboard`) — Mission KPIs, rating progress bar, difficulty distribution chart (Recharts bar), contest error taxonomy (pie chart), rating trajectory chart
- **Schedule** (`/schedule`) — Day-by-day problem list with status filters (All/Pending/In Progress/Done/Skipped), search, rating range filter; contest day cards with log entry form
- **Contests** (`/contests`) — Contest log list per mission; manual contest log form with error taxonomy entries
- **Review** (`/review`) — Spaced repetition queue (due today, unresolved RED/YELLOW); resolve with new tag
- **Profile** (`/profile`) — User stats, mission list with create/delete; profile display name + avatar
- **Mission Switcher** — Dropdown to switch active mission across all pages
- **Struggle Timer** — Countdown timer modal (`StruggleTimerModal`) triggered from `ProblemCard`; writes `struggle_time_mins` to DB on completion
- **Problem Card** (`ProblemCard`) — Status toggle, GREEN/YELLOW/RED tag, struggle timer trigger, editorial flag, bottleneck note, external link
- **JSON Import** (`lib/importUtils.ts`) — Parses `plan.json` format and bulk-upserts day_tasks + problem_items
- **Rating Chart** (`RatingChart`) — Recharts line chart showing contest rating over time vs. target
- **Custom Confirm Dialog** (`ConfirmDialog`) — Reusable responsive modal replacing native browser `confirm()` prompts for destructive actions

### Data Layer
- All CRUD operations in `lib/queries.ts`:
  - `useMissions`, `useMission`, `useCreateMission`, `useDeleteMission`
  - `useDayTasks`, `useUpsertDayTask`
  - `useProblemItem`, `useUpdateProblem`
  - `useContestLogs`, `useCreateContestLog`
  - `useReviewQueue`, `useResolveReview`
  - `useProfile`, `useProfileStats`, `useUpdateProfile`
  - `useImportSchedule`, `useDeleteSchedule`

## In Progress

Not determined from repository. (No branch info or WIP indicators found.)

## Known Issues / Gaps

- **No tests** — zero test files exist anywhere in the project
- **`app/api/` routes** — directory exists but specific route handlers not inspected; scope unclear
- **`MissionTemplate` type** defined in `lib/types.ts` but no corresponding DB table in `schema.sql` — the `forked_from_template_id` column on `missions` references a table that doesn't appear in the schema
- **Env var naming mismatch** — `middleware.ts` uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` but README documents `NEXT_PUBLIC_SUPABASE_ANON_KEY` — could cause silent auth failures
- **`.env.local`** in the repo root of `goalascent/` (not gitignored at that level) — check `.gitignore` coverage
- **Utility scripts at root** — `generate_plan.js`, `patch_schedule.js`, `patch_schedule2.js`, `update-queries.js`, `fix_heatmap_type.js`, `goal.js` — one-off scripts left in root, not part of the app
- **`plan.json`** (75KB) committed to repo — likely a generated file for a specific mission, not general-purpose
- **`convert-icon.js`, `run-assets.js`** — asset generation scripts at root, not part of runtime app
- **No PWA manifest** discovered in `public/` yet (`manifest.json` referenced in `app/layout.tsx`)
- **Streak tracking** — `current_streak_days` and `last_active_date` columns exist on profiles but no code found that updates them
- **Share token** — `share_token` column exists on missions (for social sharing) but no share UI or API route found

## Important Decisions

- **Single schema file** (`supabase/schema.sql`) — no separate migrations; entire schema in one `IF NOT EXISTS` script
- **Client-only Supabase instance in `lib/queries.ts`** — module-level `createClient()` call; all React Query hooks use the same browser client
- **React Query persistence** — query cache persisted to localStorage via `@tanstack/query-sync-storage-persister` for offline/reload continuity
- **Dark theme only** — hardcoded color palette, no light mode
- **Monorepo-ish structure** — spec file, utility scripts, and `.env.txt` live in the parent directory (`../`) rather than inside `goalascent/`; `CLAUDE.md` at repo root delegates to `goalascent/AGENTS.md`

## Current Focus

Replaced native `confirm()` dialogs across the app with a styled `ConfirmDialog` component, and removed GitHub auth login option.
