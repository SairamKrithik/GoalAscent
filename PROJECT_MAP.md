# Project Architecture — GoalAscent

## Directory Structure
```
goalascent/
├── app/
│   ├── (app)/              → authenticated route group
│   │   ├── layout.tsx      → app shell with AppNav sidebar
│   │   ├── dashboard/      → mission KPIs, rating chart, difficulty dist, error taxonomy
│   │   ├── schedule/       → day-by-day problem list with filters, contest day cards
│   │   ├── contests/       → contest log list + manual contest entry form
│   │   ├── review/         → spaced repetition review queue
│   │   └── profile/        → user profile, stats, mission management (create/delete)
│   ├── api/                → Next.js API routes
│   ├── auth/               → Supabase auth callback handler
│   ├── login/              → unauthenticated login page
│   ├── layout.tsx          → root layout (ReactQueryProvider, Toaster, fonts)
│   ├── page.tsx            → root redirect (→ /dashboard or /login)
│   └── globals.css         → global styles + CSS animations
├── components/
│   ├── AppNav.tsx          → bottom-tab nav bar (mobile) / sidebar (desktop)
│   ├── MissionSwitcher.tsx → dropdown to switch active mission
│   ├── ProblemCard.tsx     → problem row with status toggle, tag, struggle timer
│   ├── StruggleTimerModal.tsx → countdown timer modal for problem solving
│   ├── RatingChart.tsx     → Recharts line chart for rating trajectory
│   ├── KPICard.tsx         → stat tile (label/value/subtext)
│   ├── Logo.tsx            → app logo SVG
│   ├── providers/
│   │   └── ReactQueryProvider.tsx → React Query + localStorage persistence setup
│   └── ui/                 → shadcn/ui primitives (button, dialog, badge, etc.)
├── lib/
│   ├── queries.ts          → ALL React Query hooks (useMissions, useDayTasks, etc.)
│   ├── types.ts            → TypeScript interfaces mirroring DB schema + constants
│   ├── store.ts            → Zustand store (activeMissionId, scheduleFilter, timer)
│   ├── utils.ts            → cn() helper (clsx + tailwind-merge)
│   ├── importUtils.ts      → JSON plan import parser/validator
│   └── supabase/           → Supabase client factories (browser + server)
├── supabase/
│   └── schema.sql          → Full schema, RLS policies, triggers, indexes
├── middleware.ts            → Auth routing guard (protected routes + redirects)
├── next.config.ts           → Next.js config (PWA via next-pwa)
└── capacitor.config.ts      → Capacitor config for Android packaging
```

## Important Files

| File | Purpose |
|---|---|
| `lib/queries.ts` | Single source of truth for all Supabase data access hooks |
| `lib/types.ts` | All TS types + `PLATFORM_COLORS`, `ERROR_CATEGORIES` constants |
| `lib/store.ts` | Zustand store — active mission, schedule filters, timer state |
| `supabase/schema.sql` | Full DB schema with RLS + DB triggers |
| `middleware.ts` | Supabase SSR auth guard; routes: `/dashboard`,`/schedule`,`/contests`,`/review`,`/profile` |
| `app/(app)/layout.tsx` | Authenticated app shell with `AppNav` |
| `components/ProblemCard.tsx` | Core interactive component — problem status, tags, struggle timer |
| `components/StruggleTimerModal.tsx` | Countdown timer that writes `struggle_time_mins` on completion |
| `lib/importUtils.ts` | Parses `plan.json` format into `ImportedMission` for bulk upload |

## Architecture Flow

```
User → middleware (auth check) → app/(app)/page
         → Page component
           → lib/queries.ts hook (React Query)
             → Supabase client (lib/supabase/client.ts)
               → Supabase Postgres (RLS-protected)
```

Client state (active mission, filters) lives in Zustand (`lib/store.ts`), persisted to localStorage.

## Module Dependencies

```
pages → lib/queries.ts → lib/supabase/client → Supabase
pages → lib/store.ts
pages → components/* → lib/types.ts
lib/queries.ts → lib/types.ts
```

## Database Schema

| Table | Key Fields | Notes |
|---|---|---|
| `profiles` | `user_id` (FK auth.users), `display_name`, `current_streak_days` | Auto-created on signup via trigger |
| `missions` | `mission_id`, `user_id`, `title`, `duration_days`, `start_date`, `status`, `baseline_rating`, `target_rating` | Status: Active/Archived/Completed |
| `day_tasks` | `day_task_id`, `mission_id`, `day_number`, `stage`, `topic`, `drill_type` | Unique (mission_id, day_number) |
| `problem_items` | `problem_id`, `day_task_id`, `mission_id`, `status`, `tag`, `struggle_time_mins` | Status: Pending/In Progress/Done/Skipped; Tag: GREEN/YELLOW/RED |
| `contest_logs` | `log_id`, `mission_id`, `contest_date`, `new_rating`, `rating_delta`, `error_entries` | `error_entries` is a JSONB array |
| `user_platform_ratings` | `user_id`, `platform`, `rating`, `updated_at`, `is_pinned` | Platform specific ratings (e.g. Codeforces 1200) |
| `review_queue` | `review_id`, `problem_id`, `user_id`, `due_date`, `origin_tag`, `resolved` | Auto-populated via `trg_enqueue_review` trigger |

**Key Relationships:** `missions` → (cascade) `day_tasks` → (cascade) `problem_items`; `problem_items` → (cascade) `review_queue`

**DB View:** `profile_stats` — aggregates total_solved, total_struggle_hours, flawless_solves, contest_count per user.

**DB Trigger:** `trg_enqueue_review` — fires on `problem_items.tag` update; enqueues RED (3-day) or YELLOW (7-day) review.

## API Routes

- `app/api/` — directory exists; specific routes not yet discovered (minimal surface seen so far)
- `app/auth/` — Supabase OAuth callback handler

## Authentication

- **Supabase Auth** (email/password + OAuth)
- `middleware.ts` — server-side session refresh on every request; redirects unauthenticated users to `/login`, authenticated users away from `/login`
- `lib/supabase/` — separate browser client (`createClient()`) and server client factories
- All DB tables protected by Row Level Security (RLS) — users can only access their own data

## External Services

- **Supabase** (`lib/supabase/`) — Postgres DB + Auth + RLS
- **Google Fonts** — Inter + JetBrains Mono (loaded in `app/layout.tsx`)
- **Capacitor** — Android packaging bridge (`capacitor.config.ts`, `android/`)

## Testing

No test files found in the repository. Not determined from repository.
