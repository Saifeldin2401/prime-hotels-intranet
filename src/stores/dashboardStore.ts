import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DashboardState {
  // Widget configuration
  enabledWidgets: string[]
  widgetOrder: string[]
  widgetConfigs: Record<string, Record<string, unknown>>

  // Date range for dashboard
  dateRange: {
    start: string | null
    end: string | null
    preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  }

  // Actions
  enableWidget: (widgetId: string) => void
  disableWidget: (widgetId: string) => void
  reorderWidgets: (order: string[]) => void
  setWidgetConfig: (widgetId: string, config: Record<string, unknown>) => void
  setDateRange: (range: DashboardState['dateRange']) => void

  // Reset
  resetToDefaults: () => void
}

const DEFAULT_WIDGETS = [
  'stats-overview',
  'quick-actions',
  'pending-approvals',
  'training-progress',
  'recent-documents',
  'maintenance-alerts',
  'announcements',
  'calendar',
]

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      enabledWidgets: DEFAULT_WIDGETS,
      widgetOrder: DEFAULT_WIDGETS,
      widgetConfigs: {},
      dateRange: {
        start: null,
        end: null,
        preset: 'month',
      },

      enableWidget: (widgetId) =>
        set((state) => ({
          enabledWidgets: state.enabledWidgets.includes(widgetId)
            ? state.enabledWidgets
            : [...state.enabledWidgets, widgetId],
        })),

      disableWidget: (widgetId) =>
        set((state) => ({
          enabledWidgets: state.enabledWidgets.filter((id) => id !== widgetId),
        })),

      reorderWidgets: (widgetOrder) => set({ widgetOrder }),

      setWidgetConfig: (widgetId, config) =>
        set((state) => ({
          widgetConfigs: {
            ...state.widgetConfigs,
            [widgetId]: { ...state.widgetConfigs[widgetId], ...config },
          },
        })),

      setDateRange: (dateRange) => set({ dateRange }),

      resetToDefaults: () =>
        set({
          enabledWidgets: DEFAULT_WIDGETS,
          widgetOrder: DEFAULT_WIDGETS,
          widgetConfigs: {},
          dateRange: {
            start: null,
            end: null,
            preset: 'month',
          },
        }),
    }),
    {
      name: 'dashboard-store',
    }
  )
)
