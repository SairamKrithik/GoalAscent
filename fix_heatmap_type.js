const fs = require('fs')
let code = fs.readFileSync('app/(app)/schedule/page.tsx', 'utf8')

code = code.replace(
  "allDays: typeof dayTasks",
  "allDays: (DayTask & { problem_items: ProblemItem[] })[]"
)

fs.writeFileSync('app/(app)/schedule/page.tsx', code)
console.log('Fixed types')
