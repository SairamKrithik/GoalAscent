import type { ImportedMission } from '@/lib/types'

export const IMPORT_EXAMPLE = JSON.stringify(
  {
    days: [
      {
        day_number: 1,
        topic: 'Two Pointers',
        stage: 'Foundation',
        primary_skill: 'Sliding Window',
        time_target: '2 hours',
        problems: [
          {
            slot: 'A',
            platform: 'Codeforces',
            title: 'Watermelon',
            problem_number: '4A',
            difficulty_rating: 800,
            url: 'https://codeforces.com/problemset/problem/4/A',
            rationale: 'Warm-up — parity check',
            topic_tags: ['math', 'brute force'],
          },
          {
            slot: 'B',
            platform: 'LeetCode',
            title: 'Container With Most Water',
            problem_number: '11',
            difficulty_rating: 1500,
            url: 'https://leetcode.com/problems/container-with-most-water/',
            topic_tags: ['two pointers', 'greedy'],
          },
        ],
      },
      {
        day_number: 7,
        topic: 'Virtual Contest',
        drill_type: 'contest',
        contest: {
          platform: 'Codeforces',
          name: 'Codeforces Round 900 (Div. 3)',
        },
      },
    ],
  },
  null,
  2,
)

export function validateImport(raw: unknown): ImportedMission {
  if (typeof raw !== 'object' || raw === null || !('days' in raw)) {
    throw new Error('JSON must have a top-level "days" array')
  }
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.days)) throw new Error('"days" must be an array')

  for (const day of obj.days as unknown[]) {
    if (typeof day !== 'object' || day === null) throw new Error('Each day must be an object')
    const d = day as Record<string, unknown>
    if (typeof d.day_number !== 'number' || d.day_number < 1) {
      throw new Error(`day_number must be a positive integer, got: ${d.day_number}`)
    }
    if (d.problems !== undefined) {
      if (!Array.isArray(d.problems)) throw new Error(`Day ${d.day_number}: "problems" must be an array`)
      for (const p of d.problems as unknown[]) {
        const prob = p as Record<string, unknown>
        if (typeof prob.title !== 'string' || !prob.title) {
          throw new Error(`Day ${d.day_number}: every problem needs a "title" string`)
        }
        if (typeof prob.url !== 'string' || !prob.url) {
          throw new Error(`Day ${d.day_number}: problem "${prob.title}" needs a "url" string`)
        }
        if (prob.platform === undefined) prob.platform = 'Codeforces'
      }
    }
    if (d.contest !== undefined && typeof d.contest !== 'object') {
      throw new Error(`Day ${d.day_number}: "contest" must be an object`)
    }
  }

  return raw as ImportedMission
}