import { getRouteByPath } from '@/config/navigation'
import { PageTransition } from '@/components/layout/PageTransition'
import { HolidayCelebration } from '@/components/ui/HolidayCelebration'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useNavigation } from '@/hooks/useNavigation'
import { useNotifications } from '@/hooks/useNotifications'
import { usePermissions } from '@/hooks/usePermissions'
import { getNotificationLink } from '@/lib/notificationLinks'
import { useNavigationStore } from '@/stores/navigationStore'
import { DashboardLayout } from '@/altus-kit/layouts/dashboard'
import { Iconify } from '@/altus-kit/components/iconify'
import { AnimatePresence } from 'framer-motion'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

const CommandPalette = lazy(() =>
  import('@/components/common/CommandPalette').then((module) => ({ default: module.CommandPalette }))
)
const KeyboardShortcutsModal = lazy(() =>
  import('@/components/common/KeyboardShortcutsModal').then((module) => ({ default: module.KeyboardShortcutsModal }))
)
const WizardTrigger = lazy(() =>
  import('@/components/common/WizardTrigger').then((module) => ({ default: module.WizardTrigger }))
)
const AltusCopilotDrawer = lazy(() =>
  import('@/components/ai/AltusCopilotDrawer').then((module) => ({ default: module.AltusCopilotDrawer }))
)
import { AltusCopilotTrigger } from '@/components/ai/AltusCopilotTrigger'
import { Sparkles } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation(['nav', 'common'])
  const { groupedNavigation, favoriteItems } = useNavigation()
  const { profile, user, signOut } = useAuth()
  const { notifications, markAsRead, markAllAsRead } = useNotifications()
  const { hasPermission } = usePermissions()
  const { currentProperty, availableProperties, switchProperty } = useProperty()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [deferredChromeReady, setDeferredChromeReady] = useState(false)

  // Track page transitions for recently visited shortcuts cleanly without hook loops
  useEffect(() => {
    const route = getRouteByPath(location.pathname)
    if (route) {
      useNavigationStore.getState().addRecentPage({ path: location.pathname, title: route.title })
    }
  }, [location.pathname])

  const mappedFavorites = useMemo(
    () =>
      favoriteItems.map((item) => {
        const Icon = item.icon
        return {
          title: t(item.title, { defaultValue: item.title }),
          path: item.resolvedPath,
          icon: <Icon size={16} />,
          badgeCount: item.badgeCount,
        }
      }),
    [favoriteItems, t]
  )

  const groupedNavItems = useMemo(
    () =>
      groupedNavigation.map((group) => {
        const GroupIcon = group.config.icon
        const groupTitle = t(group.config.title, { defaultValue: group.config.id.replace(/_/g, ' ') })
        return {
          id: group.config.id,
          title: groupTitle,
          icon: <GroupIcon size={18} />,
          collapsible: group.config.collapsible,
          items: group.items.map((item) => {
            const Icon = item.icon
            return {
              title: t(item.title, { defaultValue: item.title }),
              path: item.resolvedPath,
              icon: <Icon size={18} />,
              badgeCount: item.badgeCount,
            }
          }),
        }
      }),
    [groupedNavigation, t]
  )

  const navItems = useMemo(
    () =>
      groupedNavigation.flatMap((group) => {
        const groupTitle = t(group.config.title, { defaultValue: group.config.id.replace(/_/g, ' ') })
        return group.items.map((item, itemIdx) => {
          const Icon = item.icon
          return {
            title: t(item.title, { defaultValue: item.title }),
            path: item.resolvedPath,
            icon: <Icon size={20} />,
            subheader: itemIdx === 0 ? groupTitle : undefined,
            badgeCount: item.badgeCount,
          }
        })
      }),
    [groupedNavigation, t]
  )

  const workspaces = useMemo(() => {
    const list = availableProperties.length > 0 ? availableProperties : currentProperty ? [currentProperty] : []
    const uniqueProps = Array.from(new Map(list.map((p) => [p.id, p])).values())
    return uniqueProps.map((property) => ({
      id: property.id,
      name: property.name,
      plan: property.id === currentProperty?.id ? 'Active' : 'Property',
      logo: '/altus-emblem-icon.png',
    }))
  }, [availableProperties, currentProperty])

  const accountLinks = useMemo(
    () => [
      {
        label: t('nav:profile', 'Profile'),
        href: '/profile',
        icon: <Iconify icon="solar:home-angle-bold-duotone" />,
      },
      {
        label: t('nav:settings', 'Settings'),
        href: '/settings',
        icon: <Iconify icon="solar:settings-bold-duotone" />,
      },
    ],
    [t]
  )

  const notificationItems = useMemo(
    () =>
      (notifications ?? []).slice(0, 8).map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        description: notification.message,
        isUnRead: !notification.is_read,
        avatarUrl: null,
        postedAt: notification.created_at,
      })),
    [notifications]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }

      if (event.key === '/') {
        event.preventDefault()
        setCommandPaletteOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDeferredChromeReady(true), 500)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const handleLogout = useCallback(async () => {
    await signOut()
    navigate('/login')
  }, [navigate, signOut])

  const handleNotificationClick = useCallback(
    (notification: { id: string; type: string; title: string; isUnRead: boolean }) => {
      // Find the original notification to get full data for link resolution
      const original = notifications?.find((n) => n.id === notification.id)
      if (original && !original.is_read) {
        markAsRead.mutate(original.id)
      }
      const link = getNotificationLink(
        { type: notification.type, title: notification.title, link: original?.link },
        { hasPermission }
      )
      if (link) {
        navigate(link)
      }
    },
    [notifications, markAsRead, navigate, hasPermission]
  )

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead.mutate()
  }, [markAllAsRead])

  const handleViewAllNotifications = useCallback(() => {
    navigate('/notifications')
  }, [navigate])

  const shouldRenderDeferredChrome = deferredChromeReady || commandPaletteOpen

  const isImmersiveOrFocusedPage = useMemo(() => {
    const p = location.pathname.toLowerCase()
    return (
      p.startsWith('/messaging') ||
      p.startsWith('/learning/training/') ||
      p.startsWith('/learning/microlearning/') ||
      p.includes('/take') ||
      p.includes('/player') ||
      p.includes('/learn') ||
      p.includes('/editor') ||
      p.includes('/studio')
    )
  }, [location.pathname])

  return (
    <DashboardLayout
      navItems={navItems}
      groupedNavItems={groupedNavItems}
      favoriteItems={mappedFavorites}
      workspaces={workspaces}
      currentWorkspaceId={currentProperty?.id}
      onChangeWorkspace={switchProperty}
      notifications={notificationItems}
      onNotificationClick={handleNotificationClick}
      onMarkAllRead={handleMarkAllRead}
      onViewAllNotifications={handleViewAllNotifications}
      accountLinks={accountLinks}
      account={{
        displayName: profile?.full_name ?? user?.email ?? 'User',
        email: user?.email ?? null,
        photoURL: profile?.avatar_url ?? null,
      }}
      onLogout={handleLogout}
      onCommandOpen={() => setCommandPaletteOpen(true)}
      slotProps={{
        main: {
          sx: {
            bgcolor: 'background.default',
          },
        },
      }}
    >
      {!isImmersiveOrFocusedPage && <HolidayCelebration />}
      <AnimatePresence mode="wait">
        <PageTransition className="w-full">{children}</PageTransition>
      </AnimatePresence>

      {/* Floating Altus Copilot Trigger Button (hidden in messaging, player, and immersive screens) */}
      {!copilotOpen && !isImmersiveOrFocusedPage && (
        <AltusCopilotTrigger onClick={() => setCopilotOpen(true)} />
      )}

      <Suspense fallback={null}>
        {shouldRenderDeferredChrome && <WizardTrigger />}
        {shouldRenderDeferredChrome && (
          <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
        )}
        {shouldRenderDeferredChrome && <KeyboardShortcutsModal />}
        <AltusCopilotDrawer isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />
      </Suspense>
    </DashboardLayout>
  )
}
