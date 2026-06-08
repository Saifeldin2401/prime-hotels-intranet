import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationState {
  // Notification counts
  unreadCount: number
  totalCount: number
  setUnreadCount: (count: number) => void
  setTotalCount: (count: number) => void
  incrementUnread: () => void
  decrementUnread: () => void
  clearUnread: () => void

  // Notification preferences
  emailNotifications: boolean
  pushNotifications: boolean
  inAppNotifications: boolean
  setEmailNotifications: (enabled: boolean) => void
  setPushNotifications: (enabled: boolean) => void
  setInAppNotifications: (enabled: boolean) => void

  // Filter preferences
  selectedCategories: string[]
  selectedPriorities: string[]
  setSelectedCategories: (categories: string[]) => void
  setSelectedPriorities: (priorities: string[]) => void

  // Loading state
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Last checked timestamp
  lastCheckedAt: string | null
  setLastCheckedAt: (timestamp: string) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      unreadCount: 0,
      totalCount: 0,
      emailNotifications: true,
      pushNotifications: true,
      inAppNotifications: true,
      selectedCategories: [],
      selectedPriorities: [],
      isLoading: false,
      lastCheckedAt: null,

      setUnreadCount: (unreadCount) => set({ unreadCount }),
      setTotalCount: (totalCount) => set({ totalCount }),
      incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
      decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
      clearUnread: () => set({ unreadCount: 0 }),

      setEmailNotifications: (emailNotifications) => set({ emailNotifications }),
      setPushNotifications: (pushNotifications) => set({ pushNotifications }),
      setInAppNotifications: (inAppNotifications) => set({ inAppNotifications }),

      setSelectedCategories: (selectedCategories) => set({ selectedCategories }),
      setSelectedPriorities: (selectedPriorities) => set({ selectedPriorities }),

      setIsLoading: (isLoading) => set({ isLoading }),
      setLastCheckedAt: (lastCheckedAt) => set({ lastCheckedAt }),
    }),
    {
      name: 'notification-store',
      partialize: (state) => ({
        emailNotifications: state.emailNotifications,
        pushNotifications: state.pushNotifications,
        inAppNotifications: state.inAppNotifications,
        selectedCategories: state.selectedCategories,
        selectedPriorities: state.selectedPriorities,
        lastCheckedAt: state.lastCheckedAt,
      }),
    }
  )
)
