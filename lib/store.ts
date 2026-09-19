import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  // Active mission
  activeMissionId: string | null
  setActiveMissionId: (id: string | null) => void

  // Schedule filters
  scheduleFilter: {
    status: string
    search: string
    ratingMin: number | null
    ratingMax: number | null
  }
  setScheduleFilter: (patch: Partial<AppState['scheduleFilter']>) => void

  // Active struggle timer problem
  activeTimerProblemId: string | null
  setActiveTimerProblemId: (id: string | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeMissionId: null,
      setActiveMissionId: (id) => set({ activeMissionId: id }),

      scheduleFilter: { status: 'all', search: '', ratingMin: null, ratingMax: null },
      setScheduleFilter: (patch) =>
        set((s) => ({ scheduleFilter: { ...s.scheduleFilter, ...patch } })),

      activeTimerProblemId: null,
      setActiveTimerProblemId: (id) => set({ activeTimerProblemId: id }),
    }),
    {
      name: 'goalascent-store',
      partialize: (s) => ({ activeMissionId: s.activeMissionId }),
    },
  ),
)
