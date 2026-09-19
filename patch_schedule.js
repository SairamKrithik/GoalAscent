const fs = require('fs')
let code = fs.readFileSync('app/(app)/schedule/page.tsx', 'utf8')

// Add hook
code = code.replace(
  "useContestLogs, useUpdateProblem, useUpsertDayTask, useCreateContestLog } from '@/lib/queries'",
  "useContestLogs, useUpdateProblem, useUpsertDayTask, useCreateContestLog, useDeleteSchedule } from '@/lib/queries'"
)

// Add hook instance
code = code.replace(
  "const { data: contestLogs = [] } = useContestLogs(activeMissionId)",
  "const { data: contestLogs = [] } = useContestLogs(activeMissionId)\n  const deleteSchedule = useDeleteSchedule()"
)

// Delete handler
const handlerCode = `
  async function handleDeleteSchedule() {
    if (!activeMissionId) return
    if (!window.confirm("Are you sure you want to delete the schedule? This will remove all day tasks, problems, and contests for this mission. The mission itself will remain.")) return
    try {
      await deleteSchedule.mutateAsync(activeMissionId)
      toast.success("Schedule deleted")
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete schedule')
    }
  }
`
code = code.replace(
  "const activeMission: Mission | undefined = missions.find((m) => m.mission_id === activeMissionId)",
  handlerCode + "\n  const activeMission: Mission | undefined = missions.find((m) => m.mission_id === activeMissionId)"
)

// Add Delete Schedule Button
code = code.replace(
  `{activeMissionId && (
            <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
              ↑ Import Schedule
            </Button>
          )}`,
  `{activeMissionId && (
            <>
              {allDays.length > 0 && allDays.some(d => !d.day_task_id.startsWith('virtual-')) && (
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={handleDeleteSchedule}
                  disabled={deleteSchedule.isPending}
                >
                  {deleteSchedule.isPending ? 'Deleting...' : 'Delete Schedule'}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
                ↑ Import Schedule
              </Button>
            </>
          )}`
)

fs.writeFileSync('app/(app)/schedule/page.tsx', code)
console.log('Patched schedule page')
