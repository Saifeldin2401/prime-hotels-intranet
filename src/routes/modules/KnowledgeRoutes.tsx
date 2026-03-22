import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { lazy } from 'react'
import { Navigate, Route, useParams } from 'react-router-dom'

const KnowledgeHome = lazy(() => import('@/pages/knowledge/KnowledgeHome'))
const KnowledgeViewer = lazy(() => import('@/pages/knowledge/KnowledgeViewer'))
const KnowledgeLibrary = lazy(() => import('@/pages/knowledge/KnowledgeLibrary'))
const KnowledgeEditor = lazy(() => import('@/pages/knowledge/KnowledgeEditor'))
const KnowledgeAnalytics = lazy(() => import('@/pages/knowledge/KnowledgeAnalytics'))
const KnowledgeReview = lazy(() => import('@/pages/knowledge/KnowledgeReview'))
const QuestionEditor = lazy(() => import('@/pages/questions/QuestionEditor'))
const QuestionReview = lazy(() => import('@/pages/questions/QuestionReview'))
const QuestionLibrary = lazy(() => import('@/pages/questions/QuestionLibrary'))
const QuestionGeneratorPage = lazy(() => import('@/pages/questions/QuestionGeneratorPage'))
const SystemWiki = lazy(() => import('@/pages/knowledge/SystemWiki'))

const SOPViewerRedirect = () => {
    const { id } = useParams()
    return <Navigate to={id ? `/knowledge/${id}` : '/knowledge'} replace />
}

export const KnowledgeRoutes = () => (
    <>
        <Route
            path="/sops"
            element={<Navigate to="/knowledge" replace />}
        />
        <Route
            path="/sops/:id"
            element={<SOPViewerRedirect />}
        />
        <Route
            path="/knowledge/wiki"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <SystemWiki />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeHome />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeViewer />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/search"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeLibrary />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/browse"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeLibrary />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/create"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeEditor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/:id/edit"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeEditor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/analytics"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeAnalytics />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/review"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <KnowledgeReview />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/questions"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <QuestionLibrary />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/questions/new"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <QuestionEditor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/questions/generate"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <QuestionGeneratorPage />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/questions/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <QuestionReview />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/questions/:id/edit"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <QuestionEditor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
