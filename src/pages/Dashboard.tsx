
import { useAuth } from '@/hooks/useAuth'
import { UserDataDebug } from '@/components/debug/UserDataDebug'
import { RoleWidget } from '@/components/dashboard/RoleWidget'
import { DocumentsWidget, TrainingWidget, AnnouncementsWidget } from '@/components/dashboard/StatsWidgets'
import { TaskWidget } from '@/components/dashboard/TaskWidget'
import { MaintenanceWidget } from '@/components/dashboard/MaintenanceWidget'
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget'
import { PendingItemsWidget } from '@/components/dashboard/PendingItemsWidget'
import { ActivityWidget } from '@/components/dashboard/ActivityWidget'

import { useTranslation } from 'react-i18next'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const { t } = useTranslation('dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('welcome', { name: profile?.full_name || profile?.email || user?.email || 'User' })}
        </p>
      </div>

      <UserDataDebug />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <RoleWidget />
        <DocumentsWidget />
        <TrainingWidget />
        <AnnouncementsWidget />
      </div>

      {/* Activity Status Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
        <TaskWidget />
        <MaintenanceWidget />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Left Column: Quick Actions & Pending */}
        <div className="space-y-4">
          <QuickActionsWidget />
          <PendingItemsWidget />
        </div>

        {/* Right Column: Activity (Span 2 cols on large screens) */}
        <div className="lg:col-span-2">
          <ActivityWidget />
        </div>
      </div>
    </div>
  )
}
