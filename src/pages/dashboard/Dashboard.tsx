import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useLens } from '@/contexts/LensContext'
import { useTenant } from '@/contexts/TenantContext'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import { TenantOnboardingGuide } from '@/components/onboarding/TenantOnboardingGuide'

import {
  DashboardHeroHeader,
  DashboardLensBar,
  PlatformOverviewCockpit,
  CorporateExecutiveBento,
  PropertyOperationsBento,
  LearnerCockpitBento,
} from './components'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 1, 0.5, 1] as const,
    },
  },
}

export function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common', 'admin'])
  const { loading } = useAuth()
  const { activeLens } = useLens()
  const { isPlatformScope } = useTenant()

  if (loading) {
    return <PageSkeleton />
  }

  // Determine effective operational lens (platform scope takes precedence if operator is in global plane)
  const effectiveLens = isPlatformScope ? 'platform' : activeLens

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen space-y-6 pb-12"
    >
      {/* 1. Hero Welcome Header with Tenant Organization & Role Context */}
      <motion.div variants={itemVariants}>
        <DashboardHeroHeader />
      </motion.div>

      {/* 2. Interactive Operational Lens Switcher Bar (Platform, Corporate, Property, Learner) */}
      <motion.div variants={itemVariants}>
        <DashboardLensBar />
      </motion.div>

      {/* 2.5 SaaS Organization Workspace Onboarding Readiness Guide */}
      {!isPlatformScope && effectiveLens !== 'learner' && (
        <motion.div variants={itemVariants}>
          <TenantOnboardingGuide />
        </motion.div>
      )}

      {/* 3. Role-Adaptive Cockpit Bento Stage */}
      <AnimatePresence mode="wait">
        <motion.div
          key={effectiveLens}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {effectiveLens === 'platform' && <PlatformOverviewCockpit />}
          {effectiveLens === 'corporate' && <CorporateExecutiveBento />}
          {effectiveLens === 'property' && <PropertyOperationsBento />}
          {effectiveLens === 'learner' && <LearnerCockpitBento />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

export default Dashboard
