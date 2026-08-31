import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTenant } from '@/contexts/TenantContext'
import { useAnalytics } from '@/hooks/useAnalytics'
import { supabase } from '@/lib/supabase'
import { AnalyticsEvents } from '@/types/analytics'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Award, BookOpen, CheckSquare, FileText, GraduationCap, Loader2, Search, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

interface SearchDocResult {
    id: string
    title: string
    description?: string | null
    status?: string
    created_at: string
    document_type?: string
}

interface SearchCourseResult {
    id: string
    title: string
    description?: string | null
    status?: string
    difficulty_level?: string | null
    created_at: string
    estimated_duration_minutes?: number | null
}

interface SearchQuizResult {
    id: string
    title: string
    description?: string | null
    passing_score_percentage?: number | null
    created_at: string
}

interface SearchCertResult {
    id: string
    certificate_number?: string | null
    title?: string | null
    recipient_name?: string | null
    issue_date: string
}

interface SearchProfileResult {
    id: string
    full_name: string | null
    email: string | null
    job_title?: string | null
    role?: string | null
}

export default function GlobalSearch() {
    const [searchParams] = useSearchParams()
    const query = searchParams.get('q') || ''
    const navigate = useNavigate()
    const { t } = useTranslation(['common', 'admin'])
    const { currentOrganization } = useTenant()
    const { track } = useAnalytics()

    // 1. Search Knowledge & Documents
    const { data: documents = [], isLoading: docsLoading } = useQuery({
        queryKey: ['search', 'documents', query, currentOrganization?.id],
        queryFn: async () => {
            if (!query.trim()) return []
            const { data, error } = await supabase
                .from('documents')
                .select('id, title, description, status, created_at, document_type')
                .eq('is_deleted', false)
                .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
                .limit(20)
            if (error) {
                console.warn('Search docs error:', error)
                return []
            }
            return (data || []) as SearchDocResult[]
        },
        enabled: !!query.trim()
    })

    // 2. Search Courses & Training Modules
    const { data: courses = [], isLoading: coursesLoading } = useQuery({
        queryKey: ['search', 'courses', query, currentOrganization?.id],
        queryFn: async () => {
            if (!query.trim()) return []
            const { data, error } = await supabase
                .from('training_modules')
                .select('id, title, description, status, difficulty_level, created_at, estimated_duration_minutes')
                .eq('is_deleted', false)
                .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
                .limit(20)
            if (error) {
                console.warn('Search courses error:', error)
                return []
            }
            return (data || []) as SearchCourseResult[]
        },
        enabled: !!query.trim()
    })

    // 3. Search Quizzes & Assessments
    const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
        queryKey: ['search', 'quizzes', query, currentOrganization?.id],
        queryFn: async () => {
            if (!query.trim()) return []
            const { data, error } = await supabase
                .from('learning_quizzes')
                .select('id, title, description, passing_score_percentage, created_at')
                .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
                .limit(20)
            if (error) {
                console.warn('Search quizzes error:', error)
                return []
            }
            return (data || []) as SearchQuizResult[]
        },
        enabled: !!query.trim()
    })

    // 4. Search Certificates
    const { data: certificates = [], isLoading: certsLoading } = useQuery({
        queryKey: ['search', 'certificates', query, currentOrganization?.id],
        queryFn: async () => {
            if (!query.trim()) return []
            const { data, error } = await supabase
                .from('certificates')
                .select('id, certificate_number, title, recipient_name, issue_date')
                .or(`title.ilike.%${query}%,recipient_name.ilike.%${query}%,certificate_number.ilike.%${query}%`)
                .limit(20)
            if (error) {
                console.warn('Search certs error:', error)
                return []
            }
            return (data || []) as SearchCertResult[]
        },
        enabled: !!query.trim()
    })

    // 5. Search People
    const { data: profiles = [], isLoading: profilesLoading } = useQuery({
        queryKey: ['search', 'profiles', query, currentOrganization?.id],
        queryFn: async () => {
            if (!query.trim()) return []
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, job_title, role')
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(20)
            if (error) {
                console.warn('Search profiles error:', error)
                return []
            }
            return (data || []) as SearchProfileResult[]
        },
        enabled: !!query.trim()
    })

    const isLoading = docsLoading || coursesLoading || quizzesLoading || certsLoading || profilesLoading
    const totalResults = documents.length + courses.length + quizzes.length + certificates.length + profiles.length
    const hasResults = totalResults > 0

    useEffect(() => {
        if (query && !isLoading) {
            track(AnalyticsEvents.SEARCH, {
                query,
                results_count: totalResults
            }, 'search')
        }
    }, [query, isLoading, totalResults, track])

    const handleResultClick = (type: string, id: string) => {
        track(AnalyticsEvents.SEARCH_CLICK, { query, result_type: type, result_id: id }, 'search')
    }

    if (!query) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
                <div className="w-16 h-16 rounded-full bg-hotel-gold/10 text-hotel-gold flex items-center justify-center mb-4">
                    <Search className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {t('common:search.title', { defaultValue: 'Search Enterprise Knowledge & Training' })}
                </h2>
                <p className="text-muted-foreground max-w-md mt-2">
                    {t('common:search.hint', { defaultValue: 'Search across SOPs, official documents, courses, quizzes, certifications, and people.' })}
                </p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    {t('common:search.results_for', { defaultValue: 'Search Results for' })} "{query}"
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('common:search.found_count', { defaultValue: 'Found {{count}} matching items', count: totalResults })}
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-hotel-gold" />
                </div>
            ) : !hasResults ? (
                <div className="text-center py-16 border rounded-xl bg-muted/20">
                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">{t('common:search.no_results', { defaultValue: 'No results found' })}</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-1">
                        {t('common:search.no_results_desc', { defaultValue: "We couldn't find anything matching '{{query}}'. Try searching with different keywords.", query })}
                    </p>
                </div>
            ) : (
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto p-1 gap-1">
                        <TabsTrigger value="all" className="py-2">
                            {t('common:search.all', { defaultValue: 'All' })} ({totalResults})
                        </TabsTrigger>
                        <TabsTrigger value="knowledge" className="py-2">
                            <BookOpen className="w-4 h-4 me-1.5 hidden sm:inline" />
                            {t('common:nav.knowledge_base', { defaultValue: 'Knowledge' })} ({documents.length})
                        </TabsTrigger>
                        <TabsTrigger value="courses" className="py-2">
                            <GraduationCap className="w-4 h-4 me-1.5 hidden sm:inline" />
                            {t('common:nav.courses', { defaultValue: 'Courses' })} ({courses.length})
                        </TabsTrigger>
                        <TabsTrigger value="quizzes" className="py-2">
                            <CheckSquare className="w-4 h-4 me-1.5 hidden sm:inline" />
                            {t('common:nav.quizzes', { defaultValue: 'Assessments' })} ({quizzes.length})
                        </TabsTrigger>
                        <TabsTrigger value="certificates" className="py-2">
                            <Award className="w-4 h-4 me-1.5 hidden sm:inline" />
                            {t('common:nav.certificates', { defaultValue: 'Certificates' })} ({certificates.length})
                        </TabsTrigger>
                        <TabsTrigger value="people" className="py-2">
                            <User className="w-4 h-4 me-1.5 hidden sm:inline" />
                            {t('common:nav.people', { defaultValue: 'People' })} ({profiles.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* ALL TAB */}
                    <TabsContent value="all" className="space-y-8 mt-6">
                        {documents.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-hotel-gold" />
                                    {t('common:nav.knowledge_base', { defaultValue: 'Knowledge & SOPs' })}
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {documents.slice(0, 3).map(doc => (
                                        <DocumentCard key={doc.id} doc={doc} navigate={navigate} onClick={() => handleResultClick('document', doc.id)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {courses.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <GraduationCap className="w-5 h-5 text-hotel-gold" />
                                    {t('common:nav.courses', { defaultValue: 'Courses & Training' })}
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {courses.slice(0, 3).map(course => (
                                        <CourseCard key={course.id} course={course} navigate={navigate} onClick={() => handleResultClick('course', course.id)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {quizzes.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <CheckSquare className="w-5 h-5 text-hotel-gold" />
                                    {t('common:nav.quizzes', { defaultValue: 'Quizzes & Assessments' })}
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {quizzes.slice(0, 3).map(quiz => (
                                        <QuizCard key={quiz.id} quiz={quiz} navigate={navigate} onClick={() => handleResultClick('quiz', quiz.id)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {certificates.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <Award className="w-5 h-5 text-hotel-gold" />
                                    {t('common:nav.certificates', { defaultValue: 'Certificates' })}
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {certificates.slice(0, 3).map(cert => (
                                        <CertificateCard key={cert.id} cert={cert} navigate={navigate} onClick={() => handleResultClick('certificate', cert.id)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {profiles.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <User className="w-5 h-5 text-hotel-gold" />
                                    {t('common:nav.people', { defaultValue: 'People' })}
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {profiles.slice(0, 3).map(profile => (
                                        <ProfileCard key={profile.id} profile={profile} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* KNOWLEDGE TAB */}
                    <TabsContent value="knowledge" className="space-y-4 mt-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {documents.map(doc => (
                                <DocumentCard key={doc.id} doc={doc} navigate={navigate} onClick={() => handleResultClick('document', doc.id)} />
                            ))}
                        </div>
                    </TabsContent>

                    {/* COURSES TAB */}
                    <TabsContent value="courses" className="space-y-4 mt-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {courses.map(course => (
                                <CourseCard key={course.id} course={course} navigate={navigate} onClick={() => handleResultClick('course', course.id)} />
                            ))}
                        </div>
                    </TabsContent>

                    {/* QUIZZES TAB */}
                    <TabsContent value="quizzes" className="space-y-4 mt-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {quizzes.map(quiz => (
                                <QuizCard key={quiz.id} quiz={quiz} navigate={navigate} onClick={() => handleResultClick('quiz', quiz.id)} />
                            ))}
                        </div>
                    </TabsContent>

                    {/* CERTIFICATES TAB */}
                    <TabsContent value="certificates" className="space-y-4 mt-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {certificates.map(cert => (
                                <CertificateCard key={cert.id} cert={cert} navigate={navigate} onClick={() => handleResultClick('certificate', cert.id)} />
                            ))}
                        </div>
                    </TabsContent>

                    {/* PEOPLE TAB */}
                    <TabsContent value="people" className="space-y-4 mt-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {profiles.map(profile => (
                                <ProfileCard key={profile.id} profile={profile} />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}

function DocumentCard({ doc, navigate, onClick }: { doc: SearchDocResult; navigate: (path: string) => void; onClick?: () => void }) {
    return (
        <Card className="hover:border-hotel-gold cursor-pointer transition-all hover:shadow-sm" onClick={() => {
            onClick?.()
            navigate(`/knowledge/${doc.id}`)
        }}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <Badge variant="outline" className="bg-hotel-gold/10 text-hotel-gold border-hotel-gold/20 text-xs">
                        {doc.document_type || 'SOP'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy') : ''}
                    </span>
                </div>
                <CardTitle className="text-base line-clamp-1 mt-1">{doc.title}</CardTitle>
                {doc.description && <CardDescription className="line-clamp-2">{doc.description}</CardDescription>}
            </CardHeader>
        </Card>
    )
}

function CourseCard({ course, navigate, onClick }: { course: SearchCourseResult; navigate: (path: string) => void; onClick?: () => void }) {
    return (
        <Card className="hover:border-hotel-gold cursor-pointer transition-all hover:shadow-sm" onClick={() => {
            onClick?.()
            navigate(`/learning/${course.id}`)
        }}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="text-xs">
                        {course.difficulty_level || 'Intermediate'}
                    </Badge>
                    {course.estimated_duration_minutes && (
                        <span className="text-xs text-muted-foreground">
                            {course.estimated_duration_minutes} mins
                        </span>
                    )}
                </div>
                <CardTitle className="text-base line-clamp-1 mt-1">{course.title}</CardTitle>
                {course.description && <CardDescription className="line-clamp-2">{course.description}</CardDescription>}
            </CardHeader>
        </Card>
    )
}

function QuizCard({ quiz, navigate, onClick }: { quiz: SearchQuizResult; navigate: (path: string) => void; onClick?: () => void }) {
    return (
        <Card className="hover:border-hotel-gold cursor-pointer transition-all hover:shadow-sm" onClick={() => {
            onClick?.()
            navigate(`/assessments`)
        }}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-xs">
                        Passing: {quiz.passing_score_percentage || 80}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {quiz.created_at ? format(new Date(quiz.created_at), 'MMM d, yyyy') : ''}
                    </span>
                </div>
                <CardTitle className="text-base line-clamp-1 mt-1">{quiz.title}</CardTitle>
                {quiz.description && <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>}
            </CardHeader>
        </Card>
    )
}

function CertificateCard({ cert, navigate, onClick }: { cert: SearchCertResult; navigate: (path: string) => void; onClick?: () => void }) {
    return (
        <Card className="hover:border-hotel-gold cursor-pointer transition-all hover:shadow-sm" onClick={() => {
            onClick?.()
            navigate(`/training/certificates`)
        }}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        {cert.certificate_number || 'Verified'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {cert.issue_date ? format(new Date(cert.issue_date), 'MMM d, yyyy') : ''}
                    </span>
                </div>
                <CardTitle className="text-base line-clamp-1 mt-1">{cert.title || 'Course Certificate'}</CardTitle>
                <CardDescription className="line-clamp-1">Recipient: {cert.recipient_name || 'Learner'}</CardDescription>
            </CardHeader>
        </Card>
    )
}

function ProfileCard({ profile }: { profile: SearchProfileResult }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-full bg-hotel-gold/10 text-hotel-gold flex items-center justify-center font-bold text-sm">
                    {profile.full_name?.[0] || <User className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{profile.full_name || 'User'}</CardTitle>
                    <CardDescription className="truncate text-xs">{profile.job_title || profile.role || profile.email}</CardDescription>
                </div>
            </CardHeader>
        </Card>
    )
}
