/**
 * LearningAnalyticsHub
 *
 * Four learning-analytics lenses (Learner / Course / Knowledge / Assessment),
 * every number computed from real rows by the RPCs in
 * supabase/migrations/20260901100000_learning_analytics_lenses.sql. Panels that
 * have no backing data model yet render an explicit "not available yet" state
 * instead of a placeholder.
 */

import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Suspense, lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'

const LearnerAnalyticsPanel = lazy(() => import('./LearnerAnalyticsPanel'))
const CourseAnalyticsPanel = lazy(() => import('./CourseAnalyticsPanel'))
const KnowledgeAnalyticsPanel = lazy(() => import('./KnowledgeAnalyticsPanel'))
const AssessmentAnalyticsPanel = lazy(() => import('./AssessmentAnalyticsPanel'))

const TABS = ['learners', 'courses', 'knowledge', 'assessments'] as const
type TabKey = (typeof TABS)[number]

export default function LearningAnalyticsHub() {
    const [params, setParams] = useSearchParams()
    const raw = params.get('lens')
    const active: TabKey = (TABS as readonly string[]).includes(raw ?? '') ? (raw as TabKey) : 'learners'

    return (
        <div className="container mx-auto px-4 py-6">
            <PageHeader
                title="Learning analytics"
                description="Learner, course, knowledge and assessment performance — computed from real activity."
            />

            <Tabs
                value={active}
                onValueChange={value => setParams(prev => {
                    prev.set('lens', value)
                    return prev
                }, { replace: true })}
            >
                <TabsList className="mb-6">
                    <TabsTrigger value="learners">Learners</TabsTrigger>
                    <TabsTrigger value="courses">Courses</TabsTrigger>
                    <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
                    <TabsTrigger value="assessments">Assessments</TabsTrigger>
                </TabsList>

                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                    <TabsContent value="learners">
                        <LearnerAnalyticsPanel />
                    </TabsContent>
                    <TabsContent value="courses">
                        <CourseAnalyticsPanel />
                    </TabsContent>
                    <TabsContent value="knowledge">
                        <KnowledgeAnalyticsPanel />
                    </TabsContent>
                    <TabsContent value="assessments">
                        <AssessmentAnalyticsPanel />
                    </TabsContent>
                </Suspense>
            </Tabs>
        </div>
    )
}
