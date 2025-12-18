
import { useAuth } from '@/hooks/useAuth'
import { UserDataDebug } from '@/components/debug/UserDataDebug'
import { RoleWidget } from '@/components/dashboard/RoleWidget'
import { DocumentsWidget, TrainingWidget, AnnouncementsWidget } from '@/components/dashboard/StatsWidgets'
import { TaskWidget } from '@/components/dashboard/TaskWidget'
import { MaintenanceWidget } from '@/components/dashboard/MaintenanceWidget'
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget'
import { PendingItemsWidget } from '@/components/dashboard/PendingItemsWidget'
import { ActivityWidget } from '@/components/dashboard/ActivityWidget'
import { motion } from 'framer-motion'
import { HeroText } from '@/components/ui/HeroText'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { useTour } from '@/hooks/useTour'
import { Button } from '@/components/ui/button'
import { HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import {
  getTourStepsForRole,
  shouldShowWizard,
  markWizardCompleted
} from '@/config/newUserTour'

export default function Dashboard() {
  const { user, profile, primaryRole } = useAuth()
  const { t } = useTranslation('dashboard')
  const wizardTriggered = useRef(false)

  // Get role-specific tour steps
  const tourSteps = getTourStepsForRole(primaryRole)
  const { startTour } = useTour(tourSteps)

  // Auto-trigger wizard for new users (first-time after password change)
  useEffect(() => {
    if (shouldShowWizard() && !wizardTriggered.current) {
      wizardTriggered.current = true
      // Small delay to let the page render
      const timer = setTimeout(() => {
        startTour()
        markWizardCompleted()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [startTour])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center" id="dashboard-welcome">
        <div>
          <HeroText
            text={t('welcome', { name: profile?.full_name || profile?.email || user?.email || 'User' })}
            className="text-3xl font-bold"
          />
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground"
          >
            {t('subtitle', { defaultValue: 'Here is what is happening with your property today.' })}
          </motion.p>
        </div>
        <Button variant="outline" size="sm" onClick={startTour} className="hidden sm:flex">
          <HelpCircle className="w-4 h-4 mr-2" />
          Take Tour
        </Button>
      </div>

      <UserDataDebug />

      {/* Stats Grid */}
      <ScrollReveal variant="slide" direction="up" viewportAmount={0.1}>
        <motion.div
          id="stats-grid"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}><RoleWidget /></motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}><DocumentsWidget /></motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}><TrainingWidget /></motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}><AnnouncementsWidget /></motion.div>
        </motion.div>
      </ScrollReveal>

      {/* Activity Status Grid */}
      <ScrollReveal variant="fade" delay={0.2}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4"
        >
          <TaskWidget />
          <MaintenanceWidget />
        </motion.div>
      </ScrollReveal>

      {/* Main Content Grid */}
      <ScrollReveal variant="slide" direction="up" delay={0.3}>
        <motion.div
          id="main-content-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {/* Left Column: Quick Actions & Pending */}
          <div className="space-y-4" id="quick-actions">
            <QuickActionsWidget />
            <PendingItemsWidget />
          </div>

          {/* Right Column: Activity (Span 2 cols on large screens) */}
          <div className="lg:col-span-2">
            <ActivityWidget />
          </div>
        </motion.div>
      </ScrollReveal>
    </div>
  )
}
