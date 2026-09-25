import { TenantContextGuard } from '@/components/auth/TenantContextGuard'
import { RouteErrorBoundary } from '@/components/common'
import { page } from '@/routes/utils/page'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const LearnerHome = lazy(() => import('@/pages/home/LearnerHome'))
const MyLearning = lazy(() => import('@/pages/learning/MyLearning'))
const CourseCatalog = lazy(() => import('@/pages/learning/CourseCatalog'))
const CourseDetail = lazy(() => import('@/pages/learning/CourseDetail'))
const TrainingPaths = lazy(() => import('@/pages/training/TrainingPaths'))
const TrainingPlayer = lazy(() => import('@/pages/training/TrainingPlayer'))
const AssessmentPlayer = lazy(() => import('@/pages/assessments/AssessmentPlayer'))
const MyCertificates = lazy(() => import('@/pages/training/MyCertificates'))
const KnowledgeBrowse = lazy(() => import('@/pages/knowledge/KnowledgeBrowse'))
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
        <Route path="/learn/my" element={page(<MyLearning />)} />
        <Route path="/learn/courses" element={page(<CourseCatalog />)} />
        <Route path="/learn/courses/:id" element={page(<CourseDetail />)} />
        <Route path="/learn/paths" element={page(<TrainingPaths />)} />
        <Route path="/learn/player/:id" element={page(<TrainingPlayer />)} />
        <Route path="/learn/quizzes/:id" element={page(<AssessmentPlayer />)} />
        <Route path="/learn/certificates" element={page(<MyCertificates />)} />

        <Route path="/knowledge" element={page(<KnowledgeBrowse />, { capability: 'knowledge.read' })} />
        <Route path="/knowledge/:id" element={page(<KnowledgeRead />, { capability: 'knowledge.read' })} />

        {/* Files are attachments of articles and courses, not a destination of
            their own: reachable from where they are used, not from navigation. */}
        <Route path="/documents" element={page(<DocumentLibrary />)} />
        <Route path="/documents/:id" element={page(<DocumentDetail />)} />
    </Route>
)
