const fs = require('fs')
let code = fs.readFileSync('app/(app)/schedule/page.tsx', 'utf8')

// 1. Add imports
code = code.replace(
  "import { useState, useMemo } from 'react'",
  "import { useState, useMemo, useEffect } from 'react'\nimport { differenceInCalendarDays, startOfDay, parseISO } from 'date-fns'"
)

// 2. Add Heatmap inside the file (before SchedulePage)
const heatmapCode = `
// ─── Heatmap Component ────────────────────────────────────────────────────────
function ScheduleHeatmap({
  allDays,
  activeDayNumber,
  onSelectDay,
}: {
  allDays: typeof dayTasks
  activeDayNumber: number
  onSelectDay: (day: number) => void
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Mission Journey</h3>
        <span className="text-xs text-slate-400">Day {activeDayNumber}</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(24px,1fr))] gap-1.5">
        {allDays.map((d) => {
          const isVirtual = d.day_task_id.startsWith('virtual-')
          let colorClass = 'bg-slate-700 hover:bg-slate-600'
          
          if (!isVirtual) {
            if (d.is_completed) {
              colorClass = 'bg-green-500/80 hover:bg-green-400 text-green-950'
            } else if (isContestDay(d)) {
               colorClass = 'bg-amber-500/80 hover:bg-amber-400 text-amber-950'
            } else if (d.problem_items && d.problem_items.length > 0) {
               const done = d.problem_items.filter(p => p.status === 'Done').length
               const total = d.problem_items.length
               if (done > 0) {
                 colorClass = 'bg-green-500/40 hover:bg-green-500/50 text-green-200'
               } else {
                 colorClass = 'bg-blue-500/30 hover:bg-blue-500/40 text-blue-200'
               }
            } else {
               colorClass = 'bg-slate-600 hover:bg-slate-500' // Rest day not completed
            }
          }
          
          const isActive = d.day_number === activeDayNumber

          return (
            <button
              key={d.day_number}
              onClick={() => onSelectDay(d.day_number)}
              title={\`Day \${d.day_number}\`}
              className={\`w-6 h-6 sm:w-7 sm:h-7 rounded-sm flex items-center justify-center text-[10px] sm:text-xs transition-all \${colorClass} \${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 font-bold scale-110 z-10' : ''}\`}
            >
              {d.day_number}
            </button>
          )
        })}
      </div>
    </div>
  )
}
`

code = code.replace(
  "// ─── Main Schedule Page ───────────────────────────────────────────────────────",
  heatmapCode + "\n// ─── Main Schedule Page ───────────────────────────────────────────────────────"
)

// 3. Update States
const stateUpdates = `
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single')
`

code = code.replace(
  "const [showRestDays, setShowRestDays] = useState(false)",
  "const [showRestDays, setShowRestDays] = useState(false)\n" + stateUpdates
)


// 4. Calculate Current Day
const dateCalc = `
  // Calculate current mission day
  const currentMissionDay = useMemo(() => {
    if (!activeMission) return 1;
    // ensure we parse the date right (start_date is 'YYYY-MM-DD')
    const start = parseISO(activeMission.start_date)
    const diff = differenceInCalendarDays(startOfDay(new Date()), startOfDay(start)) + 1
    return Math.max(1, Math.min(activeMission.duration_days, diff))
  }, [activeMission])
  
  // Set selected day on first load or mission change
  useEffect(() => {
    if (activeMission && selectedDayNum === null) {
      setSelectedDayNum(currentMissionDay)
    }
  }, [activeMission, currentMissionDay, selectedDayNum])

  const activeDayNumber = selectedDayNum ?? currentMissionDay
`

code = code.replace(
  "const allProblems = dayTasks.flatMap((d) => d.problem_items ?? [])",
  dateCalc + "\n  const allProblems = dayTasks.flatMap((d) => d.problem_items ?? [])"
)

// 5. Add UI logic for Heatmap and Filtered displays
const filtersUi = `
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={\`rounded-full px-3 py-1 text-xs font-semibold transition-colors \${
                statusFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
              }\`}
            >
              {opt.label}
            </button>
          ))}
          <div className="ml-auto rounded-lg bg-slate-900 border border-slate-700 p-0.5 flex gap-1">
             <button 
                onClick={() => setViewMode('single')} 
                className={\`px-3 py-1 text-xs font-semibold rounded-md \${viewMode === 'single' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}\`}>
                Heatmap
             </button>
             <button 
                onClick={() => setViewMode('all')} 
                className={\`px-3 py-1 text-xs font-semibold rounded-md \${viewMode === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}\`}>
                List All
             </button>
          </div>
          {viewMode === 'all' && (
            <label className="flex items-center gap-1.5 ml-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRestDays}
                onChange={(e) => setShowRestDays(e.target.checked)}
                className="rounded border-slate-600"
              />
              <span className="text-xs text-slate-400">Show rest days</span>
            </label>
          )}
        </div>
`

// Replace the older filter UI safely
code = code.substring(0, code.indexOf('<div className="flex flex-wrap gap-2">')) + filtersUi + code.substring(code.indexOf('<div className="flex flex-wrap gap-3">'))


// 6. Add Heatmap UI block
const listRendererTop = `
      {/* Day list */}
      {viewMode === 'single' && !isLoading && allDays.length > 0 && (
         <ScheduleHeatmap 
           allDays={allDays} 
           activeDayNumber={activeDayNumber} 
           onSelectDay={setSelectedDayNum} 
         />
      )}
`
code = code.replace("{/* Day list */}", listRendererTop)


// 7. Filter the mapped Days based on ViewMode
code = code.replace(
  "          {allDays.map((day) => {",
  `          {allDays.filter((day) => viewMode === 'single' ? day.day_number === activeDayNumber : true).map((day) => {`
)


// Write the new file
fs.writeFileSync('app/(app)/schedule/page.tsx', code)
console.log('Successfully patched schedule page!')
