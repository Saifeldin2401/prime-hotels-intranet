import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Sidebar state
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  // Mobile navigation
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void

  // Modal/drawer stack
  activeModal: string | null
  modalData: Record<string, unknown> | null
  openModal: (modalId: string, data?: Record<string, unknown>) => void
  closeModal: () => void

  // Toast notifications
  toasts: Array<{
    id: string
    type: 'success' | 'error' | 'info' | 'warning'
    message: string
    duration?: number
  }>
  addToast: (toast: Omit<UIState['toasts'][0], 'id'>) => void
  removeToast: (id: string) => void

  // Breadcrumbs
  breadcrumbs: Array<{ label: string; path?: string }>
  setBreadcrumbs: (crumbs: UIState['breadcrumbs']) => void

  // Page metadata
  pageTitle: string
  pageDescription: string | null
  setPageTitle: (title: string) => void
  setPageDescription: (description: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      sidebarOpen: true,
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      activeModal: null,
      modalData: null,
      toasts: [],
      breadcrumbs: [],
      pageTitle: '',
      pageDescription: null,

      setTheme: (theme) => set({ theme }),

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),

      openModal: (activeModal, modalData) => set({ activeModal, modalData: modalData || null }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      addToast: (toast) => {
        const id = Math.random().toString(36).substring(2, 9)
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }],
        }))

        // Auto-remove toast after duration
        if (toast.duration !== 0) {
          setTimeout(() => {
            get().removeToast(id)
          }, toast.duration || 5000)
        }
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

      setPageTitle: (pageTitle) => set({ pageTitle }),
      setPageDescription: (pageDescription) => set({ pageDescription }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
