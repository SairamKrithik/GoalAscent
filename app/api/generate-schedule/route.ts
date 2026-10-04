// Generates an AI-powered training schedule via OpenAI Responses API.
// Receives user preferences, constructs a structured prompt, calls OpenAI server-side
// (keeping the API key secret), and returns a validated ImportedMission JSON.
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { validateImport } from '@/lib/importUtils'

// ─── Request validation ───────────────────────────────────────────────────────

const RequestSchema = z.object({
  role: z.enum(['SDE-1', 'SDE-2', 'Frontend', 'Backend', 'Full-Stack', 'Competitive Programmer']),
  goal: z.enum(['Interview Prep', 'Upskilling', 'Competitive Programming', 'Rating Push', 'Foundation Building']),
  platform: z.enum(['LeetCode', 'Codeforces', 'AtCoder', 'Both (LeetCode + Codeforces)', 'All Platforms']),
  numDays: z.number().int().min(10).max(365),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  baselineRating: z.number().int().min(0).optional(),
  targetRating: z.number().int().min(0).optional(),
})

// ─── Prompt construction ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are GoalAscent's personalized competitive programming coach — an expert training architect who builds precision schedules calibrated to a user's current rating and target rating.

YOUR ROLE:
- You receive the user's current platform rating (baseline_rating) and their target rating, plus the number of training days.
- Your primary job is to construct a progressive, phase-based schedule that reliably bridges the gap from baseline to target over those days.
- Every problem you assign must be at a difficulty that is slightly above (but not far above) what the user can currently solve — this is how rating gains happen. Never assign problems below the user's baseline difficulty. Never jump difficulty by more than 150–200 points in a single phase transition.
- You must demonstrate clear, measurable progression: early days cluster near baseline_rating, middle days approach the midpoint, final days approach target_rating.
- Problem selection must be deliberate: the rationale field explains exactly why THIS problem at THIS stage of the user's progression.

PLATFORM RATING SYSTEMS — use the correct numeric scale per platform:
- LeetCode: difficulty_rating is the LC-Rating (community difficulty score). Easy ≈ 1000–1400, Medium ≈ 1400–2000, Hard ≈ 2000–2800. Use ONLY real LC-Rating numbers in this range. Never use 0 or vague values.
- Codeforces: difficulty_rating is the official problem rating. Range 800–3500. Div.3 typical: 800–1600. Div.2: 1000–2200. Div.1: 1800–3500.
- AtCoder: difficulty_rating is the AtCoder problem difficulty. ABC problems: A≈100, B≈300, C≈600, D≈1000, E≈1400, F≈1800. ARC/AGC go up to 2800+.

PLATFORM URL PATTERNS — construct URLs exactly in these formats:
- LeetCode: https://leetcode.com/problems/<slug>/ (slug = lowercase title with hyphens, e.g. "two-sum")
- Codeforces contest problem: https://codeforces.com/problemset/problem/<contestId>/<letter> (e.g. /problem/4/A)
- Codeforces gym: https://codeforces.com/gym/<gymId>/problem/<letter>
- AtCoder: https://atcoder.jp/contests/<contest>/tasks/<task_id> (e.g. /contests/abc001/tasks/abc001_a)

PROGRESSION RULE — difficulty_rating MUST increase monotonically across phases:
- Phase 1 (Foundation): problems at baseline_rating to baseline_rating+150. Build pattern recognition for the user's current level.
- Phase 2 (Core): problems at the midpoint between baseline and target. Introduce new techniques required at the next rating tier.
- Phase 3 (Advanced / Contest Prep): problems approaching target_rating. Contest-style problems that require combining multiple patterns.
- Never assign a rating lower than the previous day's average within the same phase.
- On contest days, the user attempts problems at their current phase difficulty under timed conditions.

OUTPUT RULES:
1. Output ONLY valid JSON. No markdown, no code fences, no explanation.
2. Root object has exactly one key: "days" — array of day objects.
3. Every day object MUST have:
   - "day_number": integer (1..N)
   - "stage": short phase name (e.g. "Foundation", "Core", "Advanced")
   - "topic": main topic (e.g. "Arrays", "Binary Search", "DP")
   - "primary_skill": one short phrase (e.g. "two-pointer pattern")
   - "time_target": e.g. "2h" or "2-3h"
   - "drill_type": always "problem_set"
4. Every day MUST include a "problems" array with 2–3 problems.
5. Each problem MUST have:
   - "slot": "P1", "P2", or "P3"
   - "title": exact problem name as it appears on the platform
   - "platform": exact platform name ("LeetCode", "Codeforces", or "AtCoder")
   - "difficulty_rating": integer using the platform's own scale (see above) — must fit in the current phase's range
   - "url": valid URL matching the platform pattern above
   - "topic_tags": string array (max 2 tags, lowercase)
   - "rationale": ≤12 words — state the rating tier and what pattern it drills at this stage
6. Keep all string values SHORT — minimize output tokens.
7. There are NO contest days and NO rest/review days in the generated schedule. Users log contests themselves when they happen. Every day_number from 1 to N must be a problem_set day.

EXAMPLES:
LeetCode day: {"slot":"P1","title":"Two Sum","platform":"LeetCode","difficulty_rating":1100,"url":"https://leetcode.com/problems/two-sum/","topic_tags":["arrays","hash map"],"rationale":"LC-1100 warm-up; hash-map lookup pattern at baseline."}
Codeforces day: {"slot":"P1","title":"Watermelon","platform":"Codeforces","difficulty_rating":800,"url":"https://codeforces.com/problemset/problem/4/A","topic_tags":["math","brute force"],"rationale":"CF-800 entry; parity check — builds confidence at baseline."}
AtCoder day: {"slot":"P1","title":"Placing Marbles","platform":"AtCoder","difficulty_rating":100,"url":"https://atcoder.jp/contests/abc086/tasks/abc086_a","topic_tags":["math","string"],"rationale":"ABC-A level; count matching chars at baseline difficulty."}`

// Difficulty ranges per (role, goal) combination.
// Returns [startRating, endRating] in a unified "CF-equivalent" scale that is
// then translated to the target platform's own scale inside buildUserPrompt.
function difficultyRange(role: string, goal: string): [number, number] {
  // Base ranges by role (CF-equivalent scale)
  const roleBase: Record<string, [number, number]> = {
    'SDE-1':                  [800,  1600],
    'SDE-2':                  [1000, 2000],
    'Frontend':               [800,  1500],
    'Backend':                [900,  1800],
    'Full-Stack':             [900,  1700],
    'Competitive Programmer': [1200, 2400],
  }
  const [rStart, rEnd] = roleBase[role] ?? [800, 1800]

  // Goal modifiers
  switch (goal) {
    case 'Foundation Building': return [Math.max(800, rStart - 200), Math.min(rEnd, rStart + 400)]
    case 'Interview Prep':      return [rStart, Math.min(rEnd, rStart + 600)]
    case 'Upskilling':          return [rStart + 100, rEnd]
    case 'Rating Push':         return [rStart + 200, rEnd + 200]
    case 'Competitive Programming': return [rStart + 200, Math.min(3200, rEnd + 400)]
    default:                    return [rStart, rEnd]
  }
}

// Converts a CF-equivalent rating to the target platform's scale and describes it.
function platformRatingContext(platform: string, cfStart: number, cfEnd: number): string {
  if (platform === 'LeetCode') {
    // CF 800–1200 ≈ LC Easy (1000–1400), CF 1200–1800 ≈ LC Medium (1400–2000), CF 1800+ ≈ LC Hard (2000+)
    const lcStart = Math.round(1000 + ((cfStart - 800) / 2400) * 1800)
    const lcEnd   = Math.round(1000 + ((cfEnd   - 800) / 2400) * 1800)
    return `LC-Rating range: ${Math.max(1000, lcStart)}–${Math.min(2800, lcEnd)}. Start with Easy problems (LC-Rating ~${Math.max(1000, lcStart)}), progress to Medium (≥1500) then Hard (≥2000) as appropriate.`
  }
  if (platform === 'AtCoder') {
    // CF 800 ≈ ABC-A/B (100–300), CF 1200 ≈ ABC-C/D (600–1000), CF 1800 ≈ ABC-E/F (1400+)
    const acStart = Math.round(100 + ((cfStart - 800) / 1800) * 1300)
    const acEnd   = Math.round(100 + ((cfEnd   - 800) / 1800) * 1300)
    return `AtCoder difficulty range: ${Math.max(100, acStart)}–${Math.min(2800, acEnd)}. ABC-A/B level at start, progress to C/D/E level.`
  }
  // Codeforces
  return `Codeforces rating range: ${cfStart}–${cfEnd}. Start at ~${cfStart} (Div.3/4 problems), progress to ~${cfEnd}.`
}

function buildUserPrompt(
  role: string,
  goal: string,
  platform: string,
  numDays: number,
  baselineRating?: number,
  targetRating?: number,
): string {
  const platformNote =
    platform === 'Both (LeetCode + Codeforces)'
      ? 'LeetCode + Codeforces'
      : platform === 'All Platforms'
      ? 'LeetCode + Codeforces + AtCoder'
      : platform

  // Resolve CF-equivalent range: prefer real user ratings, fall back to role/goal estimate
  let cfStart: number
  let cfEnd: number

  if (baselineRating !== undefined && targetRating !== undefined && targetRating > baselineRating) {
    // User supplied concrete ratings — trust them directly (already on platform scale)
    // We use them as-is for Codeforces; for other platforms we rely on platformRatingContext to translate.
    cfStart = baselineRating
    cfEnd = targetRating
  } else {
    // Fall back to role/goal heuristic
    ;[cfStart, cfEnd] = difficultyRange(role, goal)
  }

  // Build per-platform difficulty guidance
  const platforms = platformNote.split(' + ')
  const diffGuide = platforms
    .map((p) => platformRatingContext(p.trim(), cfStart, cfEnd))
    .join('\n')

  // Topic roadmap keyed by goal
  const topicRoadmap: Record<string, string> = {
    'Interview Prep':         'Arrays→Strings→HashMap→Two Pointers→Sliding Window→Binary Search→Stack/Queue→Trees→Graphs→DP (1D→2D)',
    'Foundation Building':   'Arrays→Strings→Sorting→HashMap→Two Pointers→Prefix Sum→Binary Search→Recursion→Trees',
    'Upskilling':            'Binary Search→Two Pointers→Prefix Sum→Greedy→Stack→Trees→Graphs (BFS/DFS)→DP→Divide & Conquer',
    'Competitive Programming':'Greedy→Binary Search→DS (segment tree, BIT)→Graph Theory→DP (bitmask, tree)→Math (NT, combinatorics)→Strings (KMP, Z)→Flows',
    'Rating Push':           'Identify weak topics→Greedy→Binary Search→Graph BFS/DFS→DP foundations→Geometry basics→Advanced DS',
  }
  const roadmap = topicRoadmap[goal] ?? 'Arrays→Sorting→Binary Search→Greedy→DP→Graphs'

  // Phase-boundary guidance so the model knows exactly when to step up
  const phase1End = Math.round(numDays * 0.33)
  const phase2End = Math.round(numDays * 0.66)
  const midRating = Math.round((cfStart + cfEnd) / 2)

  return `Generate a complete ${numDays}-day training schedule for a ${role} targeting "${goal}". Output ONLY JSON.

USER PROFILE:
- Role: ${role} | Goal: ${goal} | Platform(s): ${platformNote}
- Current rating (baseline): ${baselineRating ?? cfStart}
- Target rating: ${targetRating ?? cfEnd}
- Training days: exactly ${numDays} (day_number 1 through ${numDays})

RATING PROGRESSION (CRITICAL — anchor every problem to this ramp):
${diffGuide}

Phase boundaries for this plan:
- Phase 1 "Foundation" (days 1–${phase1End}): problems at rating ${cfStart}–${cfStart + 150}. Reinforce patterns the user already knows. Build speed.
- Phase 2 "Core" (days ${phase1End + 1}–${phase2End}): problems at rating ${cfStart + 150}–${midRating + 100}. Introduce techniques required for the next tier.
- Phase 3 "Contest Prep" (days ${phase2End + 1}–${numDays}): problems approaching ${cfEnd}. Simulate contest conditions; combine multiple patterns.

TOPIC PROGRESSION ORDER for this goal:
${roadmap}

SCHEDULE RULES:
- Every day (1 through ${numDays}) is a problem_set day — no rest days, no contest days
- Users log their own real contest results separately; do not insert contest placeholders
- Problems MUST get harder day-over-day within each phase; never regress difficulty
- Each problem's difficulty_rating MUST be in the platform's native scale (see SYSTEM rules)
- Each problem's URL MUST follow the exact platform URL pattern (see SYSTEM rules)
- The rationale field MUST state the rating tier and what it trains (e.g. "CF-1200; greedy observation at mid-Foundation")
- Use only real, well-known problems (canonical examples are fine to repeat across plans)
- Keep ALL string values short to minimize output size`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check: only authenticated users can generate schedules
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options)
          }
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // Parse and validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { role, goal, platform, numDays, baselineRating, targetRating } = parsed.data

  // Validate OpenAI API key is configured
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured on the server. Add it to .env.local.' },
      { status: 503 },
    )
  }

  // Call OpenAI Responses API
  const openai = new OpenAI({ apiKey: openaiApiKey })

  // Larger token budget for longer plans (90-day plan needs ~60k tokens for full JSON)
  const maxOutputTokens = numDays >= 60 ? 100000 : numDays >= 30 ? 65536 : 32768

  let rawContent: string
  try {
    const response = await openai.responses.create({
      model: 'gpt-6-luna',
      service_tier: 'default',
      input: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(role, goal, platform, numDays, baselineRating, targetRating)}`,
      max_output_tokens: maxOutputTokens,
    })

    rawContent = response.output_text ?? ''
    if (!rawContent) {
      throw new Error('OpenAI returned an empty response')
    }

    // Strip markdown code fences if model wraps output despite instructions
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `AI generation failed: ${message}` },
      { status: 502 },
    )
  }

  // Parse and validate the generated JSON against our ImportedMission schema
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawContent)
  } catch {
    return NextResponse.json(
      { error: 'AI returned invalid JSON. Please try again.' },
      { status: 502 },
    )
  }

  let importedMission
  try {
    importedMission = validateImport(parsedJson)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Schedule validation failed: ${message}` },
      { status: 502 },
    )
  }

  return NextResponse.json({ schedule: importedMission })
}
