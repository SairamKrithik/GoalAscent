# Project Architecture — GoalAscent

## Directory Structure
```
goalascent/
├── app/
│   ├── (app)/              → authenticated route group
│   │   ├── layout.tsx      → app shell with AppNav sidebar (optimistic auth via getSession)
│   │   ├── dashboard/      → mission KPIs, rating chart, difficulty dist, error taxonomy
│   │   ├── schedule/       → day-by-day problem list with filters, contest day cards
│   │   ├── contests/       → contest log list + manual contest entry form; auto-completes mission on target rating
│   │   ├── review/         → spaced repetition review queue
│   │   ├── achievements/   → completed missions grid + per-mission stat modal with PNG export
│   │   └── profile/        → user profile, stats, mission management; AI schedule wizard
│   │   └── share/[token]/  → unauthenticated page for viewing shared missions publicly
│   ├── api/
│   │   └── generate-schedule/ → POST: Groq LLM call (server-side, auth-gated)
│   ├── auth/               → Supabase auth callback handler
│   ├── login/              → unauthenticated login page
│   ├── layout.tsx          → root layout (ReactQueryProvider, Toaster, fonts)
│   ├── page.tsx            → root redirect (→ /dashboard or /login)
│   └── globals.css         → global styles + CSS animations
├── components/
│   ├── AppNav.tsx          → bottom-tab nav bar (mobile) / sidebar (desktop, client-side routing)
│   ├── MissionSwitcher.tsx → dropdown to switch active mission
│   ├── ExportCard.tsx      → shareable mission achievement card (PNG export via html-to-image)
│   ├── ProblemCard.tsx     → problem row with status toggle, tag, struggle timer
│   ├── StruggleTimerModal.tsx → countdown timer modal for problem solving
│   ├── ConfirmDialog.tsx   → reusable custom confirm modal replacing native prompts
│   ├── RatingChart.tsx     → Recharts line chart for mission-scoped rating trajectory
│   ├── GlobalRatingChart.tsx → All-time per-platform rating line chart (used by profile)
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
├── middleware.ts            → Auth routing guard (protected routes + redirects, uses low-latency getSession)
├── next.config.ts           → Next.js config (PWA via next-pwa)
└── capacitor.config.ts      → Capacitor config for Android packaging
```

## Important Files

| File | Purpose |
|---|---|
| `lib/queries.ts` | Single source of truth for all Supabase data access hooks |
| `lib/types.ts` | All TS types + `PLATFORM_COLORS`, `ERROR_CATEGORIES` constants |
| `lib/store.ts` | Zustand store — active mission, schedule filters, timer state |
| `supabase/schema.sql` | Full DB schema with RLS + DB triggers (inc. public read policies for sharing) |
| `middleware.ts` | Supabase SSR auth guard; decodes JWT instantly instead of network API call |
| `app/(app)/layout.tsx` | Authenticated app shell; uses JWT decode for speed |
| `components/ProblemCard.tsx` | Core interactive component — problem status, tags, struggle timer |
| `lib/importUtils.ts` | Parses `plan.json` format into `ImportedMission` for bulk upload |

## Architecture Flow

```
User (click Link) → Next.js layout engine (instant routing)
  → Page layout/middleware uses cookie JWT decode for zero-latency auth check 
    → Page component
      → lib/queries.ts hook (React Query)
        → Supabase client 
          → Supabase Postgres (RLS-protected)
```

Client state (active mission, filters) lives in Zustand (`lib/store.ts`), persisted to localStorage.
