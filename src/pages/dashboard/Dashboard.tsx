import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { PageSkeleton } from '@/components/ui/loading-skeleton'

import {
  DashboardHeroHeader,
  DashboardMetricsDeck,
  DashboardActionDeck,
  RecentKnowledgeWidget,
  ActiveLearningsWidget,
  ReviewQueueWidget,
  AICopilotAssistantWidget,
  CertificationsAndSkillsWidget,
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
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  const { loading } = useAuth()

  if (loading) {
    return <PageSkeleton />
  }

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

      {/* 2. Key Operational Performance Metrics Deck */}
      <motion.div variants={itemVariants}>
        <DashboardMetricsDeck />
      </motion.div>

      {/* 3. Core Operational Portals */}
      <motion.div variants={itemVariants}>
        <DashboardActionDeck />
      </motion.div>

      {/* 4. Executive Command Bento Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2/3): Primary Workflows & Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Active Training & Knowledge Library */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ActiveLearningsWidget />
            <RecentKnowledgeWidget />
          </div>

          {/* Governance & Quality Review Queue */}
          <ReviewQueueWidget />
        </div>

        {/* Right Column (1/3): AI Copilot & Verified Credentials */}
        <div className="space-y-6">
          <AICopilotAssistantWidget />
          <CertificationsAndSkillsWidget />
        </div>
      </motion.div>
    </motion.div>
  )
}

export default Dashboard

