# TODO — GoalAscent

## High Priority

- **React Server Components (RSC) Hydration refactor** — All root pages (`/dashboard`, `/schedule`, etc.) are `'use client'` fetching data sequentially. TTFB is fast due to middleware auth optimization, but client data waterfalls cause ~200ms spinners on hard reloads. Move initial data fetching to Server Components and pass `initialData` to React Query via Hydration.
- **Vercel & Supabase Geographical Sync** — Check the deployment regions of Vercel and the Supabase database. If they don't match, all optimizations will still face cross-region latency (~100ms+ round trips).
- **PWA manifest** — `app/layout.tsx` references `/manifest.json` but no manifest file was found in `public/`.
- **`MissionTemplate` type without DB table** — `lib/types.ts` exports `MissionTemplate` interface, but no `mission_templates` table exists in `schema.sql`.

## Medium Priority

- **Streak tracking implementation** — `profiles.current_streak_days` and `last_active_date` exist in DB but nothing updates them. Implement an update call when a problem is marked Done or a day is completed.
- **Clean up one-off scripts from repo root** — move utility scripts to a `scripts/` directory or gitignore them; do not commit large generated `plan.json`.
- **Mission template gallery** — Build UI for browsing/forking public templates.

## Low Priority

- **Add tests** — Zero test coverage. Start with data layer integration tests.
- **Pagination / virtualization for large schedules** — `useDayTasks` fetches all days with all `problem_items` nested. Add windowing for large missions.
- **Profile avatar upload** — Add file upload UI for avatars on the profile page.

## Technical Debt

- **Hardcoded color palette scattered across files** — Extract inline hex colors to CSS variables or Tailwind theme config.
- **`PLATFORMS` array defined in two places** — Remove in-file duplicates and import strictly from `lib/types.ts`.
- **Error handling in `useImportSchedule`** — Wrap looping imports in a Postgres transaction for safety.
