# GoalAscent — Claude Context

## Purpose
Mission-driven competitive programming tracker. Users create multi-day "missions" with daily problem sets, log contest results, track rating trajectory, and review RED/YELLOW-tagged problems via spaced repetition.

## Tech Stack
- **Next.js 16** (App Router, React 19) — web + Android via Capacitor
- **Supabase** — Postgres DB + Auth (SSR cookies via `@supabase/ssr`)
- **React Query v5** — server state, persisted to localStorage
- **Zustand v5** — client state (`activeMissionId`, filters, timer)
- **Tailwind CSS v4** + shadcn/ui (Radix primitives)
- **Recharts** — data visualization
- **Framer Motion**, **dnd-kit**, React Hook Form + Zod

## Architecture
```
app/(app)/          → authenticated app pages (layout wraps with AppNav)
app/login/          → unauthenticated login page
app/api/            → Next.js API routes
components/         → page-level components + ui/ (shadcn)
lib/queries.ts      → ALL React Query hooks (data layer)
lib/store.ts        → Zustand store (client-only state)
lib/types.ts        → TypeScript types mirroring DB schema
lib/supabase/       → Supabase client factory (browser + server)
supabase/schema.sql → Single-file DB schema + RLS policies
middleware.ts       → Auth routing guard
```

## Commands
```bash
npm run dev     # Start dev server (localhost:3000)
npm run build   # Production build
npm run lint    # ESLint
npx cap open android  # Open Android Studio
npx cap sync android  # Sync web assets to Android
```

## Env Vars
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (note: NOT ANON_KEY — newer Supabase naming)

## Critical Rules for Claude
- **Read PROJECT_MAP.md before exploring the repo.** Use it to find files directly.
- **Read CURRENT_STATE.md** to understand what's built vs. in progress.
- Do not scan `node_modules/`, `.next/`, `android/`, or generated files.
- All data access goes through `lib/queries.ts` hooks — never write raw Supabase calls in pages.
- All types live in `lib/types.ts` — extend there, not inline.
- Schema changes require updating both `supabase/schema.sql` and `lib/types.ts`.
- Auth is handled entirely by `middleware.ts` + Supabase SSR — do not add client-side auth guards.
- Color palette is hardcoded dark theme (#080D18, #101827, #0F172A bg; #F5F7FA text).
- Naming: camelCase in TS/JS, snake_case in DB columns.

## References
- Architecture & files: `PROJECT_MAP.md`
- Current state & known gaps: `CURRENT_STATE.md`
- Open tasks: `TODO.md`
- DB schema: `supabase/schema.sql`
- Full spec: `../GoalAscent_Enhanced_Spec.md`
