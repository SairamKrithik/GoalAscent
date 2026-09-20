# TODO — GoalAscent

## High Priority

- **Fix platform history deletion silent failures on Supabase** — Verified RLS policy fix (`"user_platform_ratings: owner delete"`) was pushed to `schema.sql`. Double check Supabase dashboard has propagated this policy correctly (`NOTIFY pgrst, 'reload schema'`).
- **Fix env var name mismatch** — `middleware.ts` uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` but README says `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Verify which is correct for the current Supabase version and update README accordingly.

- **Investigate `app/api/` routes** — The directory exists but route handlers were not fully inspected. Determine what API endpoints are implemented or intended.

- **PWA manifest** — `app/layout.tsx` references `/manifest.json` but no manifest file was found in `public/`. Required for PWA/Android install prompts.

- **`MissionTemplate` type without DB table** — `lib/types.ts` exports `MissionTemplate` interface and `missions` table has `forked_from_template_id`, but no `mission_templates` table exists in `schema.sql`. Either add the table or remove the orphaned type.

## Medium Priority

- **Streak tracking implementation** — `profiles.current_streak_days` and `last_active_date` exist in DB but nothing updates them. Implement an update call when a problem is marked Done or a day is completed.

- **Share token / social sharing** — `missions.share_token` is generated per mission but no share UI, share API route, or public-read policy exists. Either build the feature or remove the column.

- **Clean up one-off scripts from repo root** — `generate_plan.js`, `patch_schedule.js`, `patch_schedule2.js`, `update-queries.js`, `fix_heatmap_type.js`, `goal.js`, `convert-icon.js`, `run-assets.js`, and `plan.json` are all in the project root. Move utility scripts to a `scripts/` directory or gitignore them; do not commit large generated `plan.json`.

- **Mission template gallery** — Spec likely includes browsing/forking public templates (inferred from `forked_from_template_id`). Not yet implemented.

## Low Priority

- **Add tests** — Zero test coverage. Start with: data layer integration tests for schedule import, problem tag mutation + review queue trigger behavior, and auth middleware routing.

- **Pagination / virtualization for large schedules** — `useDayTasks` fetches all days with all `problem_items` nested. A 90-day mission with 5 problems/day = 450 rows in one query. Add server-side pagination or windowing for large missions.

- **Streak auto-update** — Add a Postgres function or client-side logic to increment `current_streak_days` and set `last_active_date = today` when a problem is solved or a day is completed.

- **Profile avatar upload** — `avatar_url` exists in schema and `useUpdateProfile` accepts it, but no file upload UI is visible in the profile page.

## Technical Debt

- **Module-level Supabase client in `lib/queries.ts`** — `const supabase = createClient()` is created at module scope. This is fine for client components but could cause issues if any server-side rendering attempts to use these hooks. Consider lazy initialization.

- **Hardcoded color palette scattered across files** — Colors like `#080D18`, `#101827`, `#0F172A`, `#65738A`, `#9AA7BA`, `#F5F7FA` are repeated inline across all page components and components. Extract to CSS variables or a Tailwind theme config.

- **`PLATFORMS` array defined in two places** — Both `app/(app)/schedule/page.tsx` and `app/(app)/contests/page.tsx` define `const PLATFORMS = [...]`. Extract to `lib/types.ts` or a constants file.

- **Error handling in `useImportSchedule`** — Import is a sequential loop (one Supabase call per day). A single failure mid-import leaves partial data. Consider wrapping in a transaction or providing a rollback/cleanup path.

- **`plan.json` (75KB) committed** — This is a generated mission schedule. Should be gitignored or moved out of the tracked project.
