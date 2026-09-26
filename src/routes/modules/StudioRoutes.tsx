import { TenantContextGuard } from '@/components/auth/TenantContextGuard'
import { RouteErrorBoundary } from '@/components/common'
import type { Capability } from '@/hooks/useCapabilities'
import { page } from '@/routes/utils/page'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const TrainingHub = lazy(() => import('@/pages/training/TrainingHub'))
const QuestionBank = lazy(() => import('@/pages/assessments/QuestionBank'))
const AssessmentBuilder = lazy(() => import('@/pages/assessments/AssessmentBuilder'))
const QuestionGeneratorPage = lazy(() => import('@/pages/questions/QuestionGeneratorPage'))
const QuestionEditor = lazy(() => import('@/pages/questions/QuestionEditor'))
const QuestionReview = lazy(() => import('@/pages/questions/QuestionReview'))
const KnowledgeBrowse = lazy(() => import('@/pages/knowledge/KnowledgeBrowse'))
const KnowledgeAuthor = lazy(() => import('@/pages/knowledge/KnowledgeAuthor'))
const ReviewQueuePage = lazy(() => import('@/features/studio/pages/ReviewQueuePage'))
const KnowledgeReview = lazy(() => import('@/pages/knowledge/KnowledgeReview'))
const MediaLibraryPage = lazy(() => import('@/pages/media/MediaLibraryPage'))
const CreatePage = lazy(() => import('@/features/studio/pages/CreatePage'))
const MyContentPage = lazy(() => import('@/features/studio/pages/MyContentPage'))

const AUTHOR: Capability[] = ['content.author', 'content.publish']
const PUBLISHER: Capability = 'content.publish'

/**
 * WORKSPACE: STUDIO - creating and governing content: courses, quizzes and
 * questions, articles, review, and the media they use.
 */
export const StudioRoutes = () => (
    <Route element={<TenantContextGuard resourceName="Studio" />} errorElement={<RouteErrorBoundary section="Studio" />}>
        <Route path="/studio" element={page(<MyContentPage />, { capability: AUTHOR })} />
        <Route path="/studio/courses" element={page(<TrainingHub />, { capability: AUTHOR })} />
        <Route path="/studio/create" element={page(<CreatePage />, { capability: AUTHOR })} />
        <Route path="/studio/courses/:id" element={page(<TrainingHub />, { capability: AUTHOR })} />

        <Route path="/studio/quizzes" element={page(<QuestionBank />, { capability: AUTHOR })} />
        <Route path="/studio/quizzes/generate" element={page(<QuestionGeneratorPage />, { capability: AUTHOR })} />
        <Route path="/studio/quizzes/new" element={page(<AssessmentBuilder />, { capability: AUTHOR })} />
        <Route path="/studio/quizzes/:id" element={page(<AssessmentBuilder />, { capability: AUTHOR })} />
        <Route path="/studio/questions/new" element={page(<QuestionEditor />, { capability: AUTHOR })} />
        <Route path="/studio/questions/:id" element={page(<QuestionReview />, { capability: AUTHOR })} />
        <Route path="/studio/questions/:id/edit" element={page(<QuestionEditor />, { capability: AUTHOR })} />

        <Route path="/studio/articles" element={page(<KnowledgeBrowse />, { capability: AUTHOR })} />
        <Route path="/studio/articles/new" element={page(<KnowledgeAuthor />, { capability: AUTHOR })} />
        <Route path="/studio/articles/:id/edit" element={page(<KnowledgeAuthor />, { capability: AUTHOR })} />

        <Route path="/studio/review" element={page(<ReviewQueuePage />, { capability: PUBLISHER })} />
        <Route path="/studio/review/articles" element={page(<KnowledgeReview />, { capability: PUBLISHER })} />

        <Route path="/studio/media" element={page(<MediaLibraryPage />, { capability: AUTHOR })} />
    </Route>
)
