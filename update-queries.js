const fs = require('fs')
const code = fs.readFileSync('lib/queries.ts', 'utf8')

if (!code.includes('useDeleteSchedule')) {
  const insertIndex = code.indexOf('// ─── Day task bulk-upsert (single day) ───────────────────────────────────────')
  const toInsert = `
// ─── Delete Schedule ──────────────────────────────────────────────────────────

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (missionId: string) => {
      // Deleting day tasks cascades to problem_items
      const { error: dtError } = await supabase.from('day_tasks').delete().eq('mission_id', missionId)
      if (dtError) throw dtError

      const { error: clError } = await supabase.from('contest_logs').delete().eq('mission_id', missionId)
      if (clError) throw clError
    },
    onSuccess: (_, missionId) => {
      qc.invalidateQueries({ queryKey: ['day_tasks', missionId] })
      qc.invalidateQueries({ queryKey: ['contest_logs', missionId] })
      qc.invalidateQueries({ queryKey: ['review_queue'] }) 
    }
  })
}

`
  const newCode = code.slice(0, insertIndex) + toInsert + code.slice(insertIndex)
  fs.writeFileSync('lib/queries.ts', newCode)
  console.log("Added useDeleteSchedule")
}
