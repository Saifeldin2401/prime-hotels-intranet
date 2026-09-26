import { TenantContextGuard } from '@/components/auth/TenantContextGuard'
import { RouteErrorBoundary } from '@/components/common'
import { page } from '@/routes/utils/page'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const LearnerHome = lazy(() => import('@/pages/home/LearnerHome'))
const MyLearningPage = lazy(() => import('@/features/learn/pages/MyLearningPage'))
const ExplorePage = lazy(() => import('@/features/learn/pages/ExplorePage'))
const CourseDetailPage = lazy(() => import('@/features/learn/pages/CourseDetailPage'))
const TrainingPaths = lazy(() => import('@/pages/training/TrainingPaths'))
const TrainingPlayer = lazy(() => import('@/pages/training/TrainingPlayer'))
const AssessmentPlayer = lazy(() => import('@/pages/assessments/AssessmentPlayer'))
const CertificatesPage = lazy(() => import('@/features/learn/pages/CertificatesPage'))
const AchievementsPage = lazy(() => import('@/features/learn/pages/AchievementsPage'))
const KnowledgeHubPage = lazy(() => import('@/features/knowledge/pages/KnowledgeHubPage'))
const KnowledgeRead = lazy(() => import('@/pages/knowledge/KnowledgeRead'))
const DocumentLibrary = lazy(() => import('@/pages/documents/DocumentLibrary'))
const DocumentDetail = lazy(() => import('@/pages/documents/DocumentDetail'))

/**
 * WORKSPACE: LEARN - what every member does: my day, my courses, the course
 * player, quizzes, certificates and reading the knowledge base.
 */
export const LearnRoutes = () => (
    <Route element={<TenantContextGuard resourceName="Learn" />} errorElement={<RouteErrorBoundary section="Learn" />}>
        <Route path="/learn" element={page(<LearnerHome />)} />
        <Route path="/learn/my" element={page(<MyLearningPage />)} />
        <Route path="/learn/courses" element={page(<ExplorePage />)} />
        <Route path="/learn/courses/:id" element={page(<CourseDetailPage />)} />
        <Route path="/learn/paths" element={page(<TrainingPaths />)} />
        <Route path="/learn/player/:id" element={page(<TrainingPlayer />)} />
        <Route path="/learn/quizzes/:id" element={page(<AssessmentPlayer />)} />
        <Route path="/learn/certificates" element={page(<CertificatesPage />)} />
        <Route path="/learn/achievements" element={page(<AchievementsPage />)} />

        <Route path="/knowledge" element={page(<KnowledgeHubPage />, { capability: 'knowledge.read' })} />
        <Route path="/knowledge/:id" element={page(<KnowledgeRead />, { capability: 'knowledge.read' })} />

        {/* Files are attachments of articles and courses, not a destination of
            their own: reachable from where they are used, not from navigation. */}
        <Route path="/documents" element={page(<DocumentLibrary />)} />
        <Route path="/documents/:id" element={page(<DocumentDetail />)} />
    </Route>
)
