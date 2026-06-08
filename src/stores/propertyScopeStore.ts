import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PropertyScopeState {
  // Current property context
  selectedPropertyId: string | null
  selectedPropertyIds: string[] // For multi-property selection
  scopeMode: 'property' | 'cluster' | 'all'

  // Cluster context
  selectedClusterId: string | null

  // Actions
  setSelectedProperty: (propertyId: string | null) => void
  setSelectedProperties: (propertyIds: string[]) => void
  addSelectedProperty: (propertyId: string) => void
  removeSelectedProperty: (propertyId: string) => void
  setScopeMode: (mode: PropertyScopeState['scopeMode']) => void
  setSelectedCluster: (clusterId: string | null) => void

  // Computed
  isMultiProperty: () => boolean
  getEffectivePropertyIds: () => string[]
  clearSelection: () => void
}

export const usePropertyScopeStore = create<PropertyScopeState>()(
  persist(
    (set, get) => ({
      selectedPropertyId: null,
      selectedPropertyIds: [],
      scopeMode: 'property',
      selectedClusterId: null,

      setSelectedProperty: (selectedPropertyId) =>
        set({
          selectedPropertyId,
          selectedPropertyIds: selectedPropertyId ? [selectedPropertyId] : [],
          scopeMode: selectedPropertyId ? 'property' : 'all',
        }),

      setSelectedProperties: (selectedPropertyIds) =>
        set({
          selectedPropertyIds,
          selectedPropertyId: selectedPropertyIds[0] || null,
          scopeMode: selectedPropertyIds.length > 1 ? 'cluster' : 'property',
        }),

      addSelectedProperty: (propertyId) =>
        set((state) => {
          if (state.selectedPropertyIds.includes(propertyId)) return state
          const newIds = [...state.selectedPropertyIds, propertyId]
          return {
            selectedPropertyIds: newIds,
            selectedPropertyId: state.selectedPropertyId || propertyId,
            scopeMode: newIds.length > 1 ? 'cluster' : 'property',
          }
        }),

      removeSelectedProperty: (propertyId) =>
        set((state) => {
          const newIds = state.selectedPropertyIds.filter((id) => id !== propertyId)
          return {
            selectedPropertyIds: newIds,
            selectedPropertyId: newIds[0] || null,
            scopeMode: newIds.length > 1 ? 'cluster' : newIds.length === 1 ? 'property' : 'all',
          }
        }),

      setScopeMode: (scopeMode) => set({ scopeMode }),

      setSelectedCluster: (selectedClusterId) =>
        set({
          selectedClusterId,
          scopeMode: selectedClusterId ? 'cluster' : 'all',
        }),

      isMultiProperty: () => get().selectedPropertyIds.length > 1,

      getEffectivePropertyIds: () => {
        const state = get()
        if (state.scopeMode === 'all') return []
        if (state.scopeMode === 'cluster' && state.selectedClusterId) {
          // In real implementation, would fetch cluster properties
          return state.selectedPropertyIds
        }
        return state.selectedPropertyId ? [state.selectedPropertyId] : []
      },

      clearSelection: () =>
        set({
          selectedPropertyId: null,
          selectedPropertyIds: [],
          selectedClusterId: null,
          scopeMode: 'all',
        }),
    }),
    {
      name: 'property-scope-store',
      partialize: (state) => ({
        selectedPropertyId: state.selectedPropertyId,
        selectedPropertyIds: state.selectedPropertyIds,
        scopeMode: state.scopeMode,
        selectedClusterId: state.selectedClusterId,
      }),
    }
  )
)
