# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose
Mission-driven competitive programming tracker. Users create multi-day "missions" with daily problem sets, log contest results, track rating trajectory, and review RED/YELLOW-tagged problems via spaced repetition.

## Commands
```bash
npm run dev     # Start dev server (localhost:3000)
npm run build   # Production build + typecheck
npm run lint    # ESLint
npx cap open android   # Open Android Studio
npx cap sync android   # Sync web assets to Android
```
No test runner is configured — zero test files exist.

## Env Vars
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — **not** `ANON_KEY`; middleware uses this name
- `GROQ_API_KEY` — server-side only (no `NEXT_PUBLIC_` prefix), used by `/api/generate-schedule`

## Architecture

```
app/(app)/          → authenticated app pages (layout wraps with AppNav)
app/login/          → unauthenticated login page
app/api/            → Next.js API routes (generate-schedule, upload-avatar, setup-storage)
components/         → page-level components + ui/ (shadcn/Radix primitives)
lib/queries.ts      → ALL React Query hooks — single source of truth for Supabase data access
lib/store.ts        → Zustand store (activeMissionId, scheduleFilter, activeTimerProblemId)
lib/types.ts        → TypeScript types mirroring DB schema + PLATFORM_COLORS, ERROR_CATEGORIES constants
lib/supabase/       → Supabase client factories: client.ts (browser), server.ts, admin.ts
supabase/schema.sql → Full DB schema + RLS policies + triggers + indexes (single file, no migrations)
middleware.ts       → Auth routing guard (server-side session refresh + redirect logic)
```

### Data flow
```
Page → lib/queries.ts hook (React Query) → Supabase client → Supabase Postgres (RLS)
Page → lib/store.ts (Zustand, persisted to localStorage)
```

### Key component roles
| Component | Role |
|---|---|
| `components/MissionSwitcher.tsx` | Dropdown to switch `activeMissionId` across all pages |
| `components/ProblemCard.tsx` | Problem row: status toggle, GREEN/YELLOW/RED tag, struggle timer trigger, editorial flag |
| `components/StruggleTimerModal.tsx` | Countdown timer; writes `struggle_time_mins` to DB on completion |
| `components/ConfirmDialog.tsx` | App-wide custom confirm modal — use this for all destructive action confirmations |
| `components/ExportCard.tsx` | Shareable PNG achievement card (html-to-image); used by Achievements page |
| `lib/importUtils.ts` | Validates + parses the `plan.json` / AI-generated `ImportedMission` JSON format |

## Critical Rules

- **Read PROJECT_MAP.md before exploring.** Use it to find files directly.
- **Read CURRENT_STATE.md** for what's built vs. in progress.
- Do not scan `node_modules/`, `.next/`, `android/`, or root-level utility scripts (`generate_plan.js`, `patch_schedule.js`, etc.) — these are not part of the app.
- All data access goes through `lib/queries.ts` hooks — never write raw Supabase calls in pages or components.
- All types live in `lib/types.ts` — extend there, not inline.
- Schema changes require updating both `supabase/schema.sql` and `lib/types.ts`.
- Auth is handled entirely by `middleware.ts` + Supabase SSR — do not add client-side auth guards.
- Mission status transitions (`Active → Completed`, `Active → Archived`, etc.) must go through `useUpdateMissionStatus` in `lib/queries.ts` — the only sanctioned mutation point.
- Naming: camelCase in TS/JS, snake_case in DB columns. Never mix within one layer.
- Color palette is hardcoded dark theme — `#080D18`, `#101827`, `#0F172A` backgrounds; `#F5F7FA` primary text; `#65738A` muted text.
- The `supabase` client in `lib/queries.ts` is a module-level singleton (`const supabase = createClient()`). All hooks share it.

## DB Schema Quick Reference

| Table | Status/State field | Notes |
|---|---|---|
| `missions` | `status: Active\|Archived\|Completed` | Cascade-deletes `day_tasks → problem_items → review_queue` |
| `day_tasks` | `is_completed` | Unique on `(mission_id, day_number)` |
| `problem_items` | `status: Pending\|In Progress\|Done\|Skipped`; `tag: GREEN\|YELLOW\|RED\|null` | Tag update triggers `trg_enqueue_review` |
| `contest_logs` | — | `error_entries` is JSONB array of `{problem?, category: 1-8, note}` |
| `review_queue` | `resolved` | Auto-populated by `trg_enqueue_review`; RED=3-day, YELLOW=7-day due |
| `user_platform_ratings` | `is_pinned` | Max 2 pinned; used for dashboard KPI display |
| `profile_stats` | — | DB view, not a table; aggregates per-user stats |

## Known Gaps (do not paper over)
- `MissionTemplate` type exists in `lib/types.ts` but has no DB table — `forked_from_template_id` on `missions` is an orphaned FK.
- `current_streak_days` / `last_active_date` on `profiles` — columns exist, no code updates them.
- `share_token` on `missions` — column exists, no share UI or API route.
- No PWA `manifest.json` in `public/` (referenced in `app/layout.tsx`).
- README documents `NEXT_PUBLIC_SUPABASE_ANON_KEY` but middleware uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## References
- Architecture & files: `PROJECT_MAP.md`
- Current state & known gaps: `CURRENT_STATE.md`
- Open tasks: `TODO.md`
- DB schema: `supabase/schema.sql`
