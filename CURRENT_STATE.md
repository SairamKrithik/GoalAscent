# Current State — GoalAscent

Last updated: 2026-10-04

## Completed

### Core Infrastructure
- Next.js 16 App Router project scaffold with TypeScript
- Supabase Auth integration (Optimized SSR cookies with zero-network `getSession` checking in Middleware & Layout to minimize TTFB)
- Client-side navigation in AppNav to avoid Server-Side network waterfalls
- React Query v5 with localStorage persistence (`ReactQueryProvider`)
- Zustand store for client state (active mission, filters, timer)
- Full Supabase schema: profiles, missions, day_tasks, problem_items, contest_logs, review_queue
- RLS policies on all tables, including unauthenticated public-read access for Shared Missions (`is_shared = true`) and Profiles.
- DB triggers: auto-create profile on signup, auto-enqueue review on RED/YELLOW tag

### Pages & Features
- **Login page** (`/login`) — Supabase Auth UI
- **Dashboard** (`/dashboard`) — Mission KPIs, rating progress bar, difficulty distribution chart, contest error taxonomy, rating trajectory chart
- **Schedule** (`/schedule`) — Day-by-day problem list with status filters, search, rating range filter; contest day cards
- **Contests** (`/contests`) — Contest log list per mission; manual contest log form; auto-completes mission status → Completed on target rating hit
- **Achievements** (`/achievements`) — Grid of completed missions; PNG export via `html-to-image` using `ExportCard` component
- **Review** (`/review`) — Spaced repetition queue (due today, unresolved RED/YELLOW); resolve with new tag
- **Profile** (`/profile`) — User stats, mission list with create/delete; platform rating management; Share URL toggle and copy button
- **Public Share View** (`/share/[token]`) — Unauthenticated SSR page to view a public mission's full schedule and stats without an account
- **ExportCard** (`components/ExportCard.tsx`) — Shareable mission achievement card extracted from dashboard
- **Struggle Timer** — Countdown timer modal (`StruggleTimerModal`)
- **JSON Import & AI Generation** (`lib/importUtils.ts`) — Parses imported JSON, or calls Groq LLM `POST /api/generate-schedule` to build dynamic schedules

## In Progress
(No active branch tracking)

## Known Issues / Gaps
- **Client-Side Data Waterfalls**: All App Routes are `'use client'` fetching data sequentially. Full page refreshes cause layout shifts while data loads.
- **No tests** — zero test files exist anywhere in the project
- **MissionTemplate missing schema table** — type documented in types.ts but table missing
- **Utility scripts at root** — development scripts committed to root
- **No PWA manifest** — `manifest.json` missing in `public/`
