import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { useMyAssignments, useTrainingModules } from '@/hooks/useTraining'
import { useMyCertificates } from '@/hooks/useCertificates'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ActiveLearningsWidget,
  RecentKnowledgeWidget,
  TasksWidget,
  CertificationsAndSkillsWidget,
  AICopilotAssistantWidget,
} from './index'
import {
  GraduationCap,
  Award,
  BookOpen,
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react'

export function LearnerCockpitBento() {
  const { t, i18n } = useTranslation(['admin', 'dashboard', 'common', 'nav'])
  const isRtl = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { streakCount, completedCount, inProgressCount } = useLearningProgress()
  const { certificates = [], isLoading: isLoadingCerts } = useMyCertificates()

  return (
    <div className="space-y-6">
      {/* Learner Personal Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40 p-6 sm:p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold uppercase tracking-wider">
                <GraduationCap className="h-3.5 w-3.5" />
                Learner Cockpit
              </span>
              <Badge variant="outline" className="text-[11px] text-amber-300 border-amber-400/40 bg-amber-500/10 flex items-center gap-1">
                <Flame className="h-3 w-3 text-amber-400" />
                {streakCount || 1} Day Streak
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">
              Personal Learning & Credentials Hub
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Your personalized hotel curriculum, mandatory brand certifications, and daily hospitality action checklist.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => navigate('/home/learner')}
              className="border-blue-500/30 text-white bg-white/5 hover:bg-white/10 text-xs"
            >
              <span>Full Learner Experience</span>
              <ExternalLink className="h-3.5 w-3.5 ms-1.5" />
            </Button>
            <Button
              onClick={() => navigate('/learning/my-learning')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md"
            >
              <GraduationCap className="h-3.5 w-3.5 me-1.5" />
              <span>Continue Training</span>
              <ArrowRight className="h-3.5 w-3.5 ms-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Learner Stats Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              In-Progress Courses
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-foreground">
              {inProgressCount || 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Modules currently in flight</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Completed Modules
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-emerald-500">
              {completedCount || 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Verified certificates awarded</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Digital Certificates
            </CardTitle>
            <Award className="h-4 w-4 text-hotel-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-foreground">
              {isLoadingCerts ? '...' : certificates.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Stored in compliance registry</p>
          </CardContent>
        </Card>
      </div>

      {/* 2/3 and 1/3 Learner Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ActiveLearningsWidget />
            <RecentKnowledgeWidget />
          </div>
          <TasksWidget focusMode="my_work" />
        </div>

        <div className="space-y-6">
          <CertificationsAndSkillsWidget />
          <AICopilotAssistantWidget />
        </div>
      </div>
    </div>
  )
}
export default LearnerCockpitBento
