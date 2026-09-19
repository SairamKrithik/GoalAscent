'use client'

import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useImportSchedule } from '@/lib/queries'
import type { ImportedMission } from '@/lib/types'

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  missionId: string
  startDate: string // ISO 'YYYY-MM-DD'
}

const EXAMPLE = JSON.stringify(
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

function validateImport(raw: unknown): ImportedMission {
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

export function ImportDialog({ open, onClose, missionId, startDate }: ImportDialogProps) {
  const [json, setJson] = useState('')
  const [showExample, setShowExample] = useState(false)
  const importSchedule = useImportSchedule()

  async function handleImport() {
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      toast.error('Invalid JSON — check syntax')
      return
    }

    let validated: ImportedMission
    try {
      validated = validateImport(parsed)
    } catch (err: unknown) {
      toast.error((err as Error).message)
      return
    }

    const dayCount = validated.days.length
    const problemCount = validated.days.reduce((n, d) => n + (d.problems?.length ?? 0), 0)
    const contestCount = validated.days.filter((d) => d.contest).length

    try {
      await importSchedule.mutateAsync({ missionId, startDate, imported: validated })
      toast.success(
        `Imported ${dayCount} days · ${problemCount} problems · ${contestCount} contests`,
      )
      setJson('')
      onClose()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Import failed')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Import Schedule" size="xl">
      <div className="space-y-4 px-6 py-5">
        {/* Schema reference */}
        <div className="rounded-[12px] p-4 text-xs space-y-2"
          style={{ background: '#0D1520', border: '1px solid rgba(255,255,255,0.07)', color: '#65738A' }}>
          <p className="font-semibold" style={{ color: '#9AA7BA' }}>JSON schema</p>
          <ul className="space-y-1 list-disc list-inside">
            <li><code className="text-blue-400">day_number</code> — integer ≥ 1. Day 1 = mission start date, day 2 = start + 1 day, etc.</li>
            <li><code className="text-blue-400">topic</code>, <code className="text-blue-400">stage</code>, <code className="text-blue-400">primary_skill</code>, <code className="text-blue-400">time_target</code>, <code className="text-blue-400">checkpoint</code>, <code className="text-blue-400">drill_type</code> — all optional strings.</li>
            <li><code className="text-blue-400">problems[]</code> — each needs <code>title</code> and <code>url</code>. Optional: <code>platform</code> (default: Codeforces), <code>problem_number</code>, <code>difficulty_rating</code>, <code>rationale</code>, <code>topic_tags[]</code>, <code>slot</code>.</li>
            <li><code className="text-blue-400">contest</code> — optional object. Fields: <code>platform</code>, <code>name</code>, <code>problems_solved</code>, <code>total_time_mins</code>, <code>penalties</code>, <code>rank_percentile</code>, <code>rating_delta</code>, <code>new_rating</code>.</li>
            <li>A day can have both <code>problems</code> and <code>contest</code>. Existing days are re-imported (upsert).</li>
          </ul>
          <button
            className="mt-1 text-blue-400 hover:text-blue-300 underline text-xs"
            onClick={() => setShowExample((v) => !v)}
          >
            {showExample ? 'Hide example' : 'Show example JSON'}
          </button>
          {showExample && (
            <pre className="mt-2 overflow-x-auto rounded-[8px] p-3 text-xs leading-relaxed font-mono"
              style={{ background: '#080D18', color: '#9AA7BA' }}>
              {EXAMPLE}
            </pre>
          )}
        </div>

        {/* Paste area */}
        <div>
          <label className="block text-xs mb-1" style={{ color: '#65738A' }}>
            Paste your JSON schedule here
          </label>
          <textarea
            rows={14}
            className="w-full rounded-[10px] px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 resize-y placeholder:text-[#65738A]"
            style={{ background: '#080D18', border: '1px solid rgba(255,255,255,0.07)', color: '#F5F7FA' }}
            placeholder={'{\n  "days": [\n    { "day_number": 1, "topic": "...", "problems": [...] }\n  ]\n}'}
            value={json}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!json.trim() || importSchedule.isPending}
          >
            {importSchedule.isPending ? 'Importing…' : 'Import'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
