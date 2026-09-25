import { create } from 'zustand'

export type WorkspaceId = 'LEARN' | 'STUDIO' | 'MANAGE' | 'ORGANIZATION' | 'PLATFORM'

export interface WorkspaceConfig {
  id: WorkspaceId
  label: string
  labelAr: string
  description: string
  descriptionAr: string
  defaultPath: string
}

export const WORKSPACES: Record<WorkspaceId, WorkspaceConfig> = {
  LEARN: {
    id: 'LEARN',
    label: 'Learn',
    labelAr: 'التعلم',
    description: 'What you need to do now: assigned courses, knowledge and certificates',
    descriptionAr: 'ما عليك إنجازه الآن: الدورات المسندة، المعرفة والشهادات',
    defaultPath: '/learn',
  },
  STUDIO: {
    id: 'STUDIO',
    label: 'Studio',
    labelAr: 'الاستوديو',
    description: 'Create and review courses, quizzes and articles',
    descriptionAr: 'إنشاء ومراجعة الدورات والاختبارات والمقالات',
    defaultPath: '/studio',
  },
  MANAGE: {
    id: 'MANAGE',
    label: 'Manage',
    labelAr: 'الإدارة',
    description: 'See where compliance is at risk, assign courses and export evidence',
    descriptionAr: 'تحديد مخاطر الامتثال، إسناد الدورات وتصدير الأدلة',
    defaultPath: '/manage/compliance',
  },
  ORGANIZATION: {
    id: 'ORGANIZATION',
    label: 'Organization',
    labelAr: 'المؤسسة',
    description: 'People, hotels and departments, settings and audit',
    descriptionAr: 'الموظفون، الفنادق والأقسام، الإعدادات والتدقيق',
    defaultPath: '/admin/organization',
  },
  PLATFORM: {
    id: 'PLATFORM',
    label: 'Platform',
    labelAr: 'المنصة',
    description: 'Organizations, master content, operators and platform operations',
    descriptionAr: 'المؤسسات، المحتوى الرئيسي، المشغلون وعمليات المنصة',
    defaultPath: '/platform',
  },
}

interface WorkspaceState {
  activeWorkspace: WorkspaceId
  setActiveWorkspace: (id: WorkspaceId) => void
  isCollapsed: boolean
  toggleCollapsed: () => void
  setCollapsed: (collapsed: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspace: 'LEARN',
  setActiveWorkspace: (id) => set({ activeWorkspace: id }),
  isCollapsed: false,
  toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
}))
