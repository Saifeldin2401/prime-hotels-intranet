import React from 'react'
import { GraduationCap, LayoutGrid, BarChart3, Building2, Terminal } from 'lucide-react'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import type { WorkspaceId } from '@/stores/workspaceStore'

const WORKSPACE_ICONS: Record<WorkspaceId, React.ComponentType<{ className?: string }>> = {
  LEARN: GraduationCap,
  STUDIO: LayoutGrid,
  MANAGE: BarChart3,
  ORGANIZATION: Building2,
  PLATFORM: Terminal,
}

export interface WorkspaceSwitcherProps {
  variant?: 'tabs' | 'dropdown' | 'sidebar'
  className?: string
  isRTL?: boolean
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  variant = 'sidebar',
  className = '',
  isRTL = false,
}) => {
  const { activeWorkspace, authorizedWorkspaces, switchToWorkspace } = useWorkspaces()

  // If user only has access to 1 workspace (e.g. ordinary learner), don't render switcher chrome
  if (authorizedWorkspaces.length <= 1) {
    return null
  }

  if (variant === 'tabs') {
    return (
      <div className={`flex items-center gap-1 p-1 bg-ds-surface-subtle rounded-[6px] border border-ds-border ${className}`}>
        {authorizedWorkspaces.map((ws) => {
          const Icon = WORKSPACE_ICONS[ws.id]
          const isActive = ws.id === activeWorkspace

          return (
            <button
              key={ws.id}
              type="button"
              onClick={() => switchToWorkspace(ws.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] min-h-[36px] transition-colors duration-150 select-none ${
                isActive
                  ? 'bg-ds-surface text-ds-ink shadow-none border border-ds-border/60'
                  : 'text-ds-muted hover:text-ds-ink'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{isRTL ? ws.labelAr : ws.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // Sidebar variant: clean, professional workspace selector
  return (
    <div className={`w-full px-3 py-2 font-sans ${className}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ds-muted px-2 mb-1.5">
        {isRTL ? 'مساحات العمل' : 'Workspaces'}
      </div>
      <div className="grid grid-cols-1 gap-1">
        {authorizedWorkspaces.map((ws) => {
          const Icon = WORKSPACE_ICONS[ws.id]
          const isActive = ws.id === activeWorkspace

          return (
            <button
              key={ws.id}
              type="button"
              onClick={() => switchToWorkspace(ws.id)}
              className={`flex items-center gap-2.5 w-full px-2.5 py-2 text-xs font-medium rounded-[6px] transition-all duration-150 text-start select-none ${
                isActive
                  ? 'bg-white/10 text-white font-semibold border-s-2 border-ds-brass'
                  : 'text-ds-muted hover:text-white hover:bg-white/5 border-s-2 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-ds-brass' : 'text-ds-muted'}`} />
              <div className="flex-1 truncate">
                <span className="block truncate">{isRTL ? ws.labelAr : ws.label}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
