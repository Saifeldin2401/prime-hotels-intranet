import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTenant } from '@/contexts/TenantContext'
import { useAnalytics } from '@/hooks/useAnalytics'
import {
  useGlobalSearch,
  type SearchDocResult,
  type SearchCourseResult,
  type SearchQuizResult,
  type SearchCertResult,
  type SearchProfileResult,
} from '@/features/search'
import { AnalyticsEvents } from '@/types/analytics'
import { format } from 'date-fns'
import { Award, BookOpen, CheckSquare, GraduationCap, Loader2, Search, User } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function GlobalSearch() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const navigate = useNavigate()
  const { t } = useTranslation(['common', 'admin'])
  const { currentOrganization } = useTenant()
  const { track } = useAnalytics()
  const organizationId = currentOrganization?.id ?? null

  const { data: searchResults, isLoading } = useGlobalSearch(query, organizationId)

  const documents = searchResults?.documents ?? []
  const courses = searchResults?.courses ?? []
  const quizzes = searchResults?.quizzes ?? []
  const certificates = searchResults?.certificates ?? []
  const profiles = searchResults?.profiles ?? []

  const totalResults =
    documents.length +
    courses.length +
    quizzes.length +
    certificates.length +
    profiles.length
  const hasResults = totalResults > 0
  const canSearch = Boolean(organizationId && query.trim())

  useEffect(() => {
    if (query && canSearch && !isLoading) {
      track(
        AnalyticsEvents.SEARCH,
        {
          query,
          results_count: totalResults,
        },
        'search'
      )
    }
  }, [query, isLoading, totalResults, track, canSearch])

  const handleResultClick = (type: string, id: string) => {
    track(AnalyticsEvents.SEARCH_CLICK, { query, result_type: type, result_id: id }, 'search')
  }

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-ds-brass/10 text-ds-brass flex items-center justify-center mb-4">
          <Search className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-ds-ink">
          {t('common:search.title', { defaultValue: 'Search Enterprise Knowledge & Training' })}
        </h2>
        <p className="text-ds-muted max-w-md mt-2">
          {t('common:search.hint', {
            defaultValue:
              'Search across SOPs, official documents, courses, quizzes, certifications, and people.',
          })}
        </p>
      </div>
    )
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-ds-brass/10 text-ds-brass flex items-center justify-center mb-4">
          <Search className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-ds-ink">
          {t('common:search.select_tenant_title', {
            defaultValue: 'Select an organization to search',
          })}
        </h2>
        <p className="text-ds-muted max-w-md mt-2">
          {t('common:search.select_tenant_desc', {
            defaultValue:
              'Search is scoped to an organization so results stay relevant and tenant data remains isolated.',
          })}
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ds-ink">
          {t('common:search.results_for', { defaultValue: 'Search Results for' })} "{query}"
        </h1>
        <p className="text-sm text-ds-muted mt-1">
          {t('common:search.found_count', {
            defaultValue: 'Found {{count}} matching items',
            count: totalResults,
          })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-ds-brass" />
        </div>
      ) : !hasResults ? (
        <div className="text-center py-16 border border-ds-border rounded-xl bg-ds-surface-subtle">
          <Search className="w-12 h-12 text-ds-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ds-ink">
            {t('common:search.no_results', { defaultValue: 'No results found' })}
          </h3>
          <p className="text-ds-muted max-w-sm mx-auto mt-1">
            {t('common:search.no_results_desc', {
              defaultValue:
                "We couldn't find anything matching '{{query}}'. Try searching with different keywords.",
              query,
            })}
          </p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto p-1 gap-1 bg-ds-surface-subtle border border-ds-border">
            <TabsTrigger value="all" className="py-2 data-[state=active]:bg-ds-surface data-[state=active]:text-ds-ink">
              {t('common:search.all', { defaultValue: 'All' })} ({totalResults})
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="py-2 data-[state=active]:bg-ds-surface data-[state=active]:text-ds-ink">
              <BookOpen className="w-4 h-4 me-1.5 hidden sm:inline" />
              {t('common:nav.knowledge_base', { defaultValue: 'Knowledge' })} ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="courses" className="py-2 data-[state=active]:bg-ds-surface data-[state=active]:text-ds-ink">
              <GraduationCap className="w-4 h-4 me-1.5 hidden sm:inline" />
              {t('common:nav.courses', { defaultValue: 'Courses' })} ({courses.length})
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="py-2 data-[state=active]:bg-ds-surface data-[state=active]:text-ds-ink">
              <CheckSquare className="w-4 h-4 me-1.5 hidden sm:inline" />
              {t('common:nav.quizzes', { defaultValue: 'Assessments' })} ({quizzes.length})
            </TabsTrigger>
            <TabsTrigger value="certificates" className="py-2 data-[state=active]:bg-ds-surface data-[state=active]:text-ds-ink">
              <Award className="w-4 h-4 me-1.5 hidden sm:inline" />
              {t('common:nav.certificates', { defaultValue: 'Certificates' })} ({certificates.length})
            </TabsTrigger>
            <TabsTrigger value="people" className="py-2 data-[state=active]:bg-ds-surface data-[state=active]:text-ds-ink">
              <User className="w-4 h-4 me-1.5 hidden sm:inline" />
              {t('common:nav.people', { defaultValue: 'People' })} ({profiles.length})
            </TabsTrigger>
          </TabsList>

          {/* ALL TAB */}
          <TabsContent value="all" className="space-y-8 mt-6">
            {documents.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-ds-ink">
                  <BookOpen className="w-5 h-5 text-ds-brass" />
                  {t('common:nav.knowledge_base', { defaultValue: 'Knowledge & SOPs' })}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {documents.slice(0, 3).map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      navigate={navigate}
                      onClick={() => handleResultClick('document', doc.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {courses.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-ds-ink">
                  <GraduationCap className="w-5 h-5 text-ds-brass" />
                  {t('common:nav.courses', { defaultValue: 'Courses & Training' })}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {courses.slice(0, 3).map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      navigate={navigate}
                      onClick={() => handleResultClick('course', course.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {quizzes.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-ds-ink">
                  <CheckSquare className="w-5 h-5 text-ds-brass" />
                  {t('common:nav.quizzes', { defaultValue: 'Quizzes & Assessments' })}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {quizzes.slice(0, 3).map((quiz) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      navigate={navigate}
                      onClick={() => handleResultClick('quiz', quiz.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {certificates.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-ds-ink">
                  <Award className="w-5 h-5 text-ds-brass" />
                  {t('common:nav.certificates', { defaultValue: 'Certificates' })}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {certificates.slice(0, 3).map((cert) => (
                    <CertificateCard
                      key={cert.id}
                      cert={cert}
                      navigate={navigate}
                      onClick={() => handleResultClick('certificate', cert.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {profiles.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-ds-ink">
                  <User className="w-5 h-5 text-ds-brass" />
                  {t('common:nav.people', { defaultValue: 'People' })}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {profiles.slice(0, 3).map((profile) => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* KNOWLEDGE TAB */}
          <TabsContent value="knowledge" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  navigate={navigate}
                  onClick={() => handleResultClick('document', doc.id)}
                />
              ))}
            </div>
          </TabsContent>

          {/* COURSES TAB */}
          <TabsContent value="courses" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  navigate={navigate}
                  onClick={() => handleResultClick('course', course.id)}
                />
              ))}
            </div>
          </TabsContent>

          {/* QUIZZES TAB */}
          <TabsContent value="quizzes" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  navigate={navigate}
                  onClick={() => handleResultClick('quiz', quiz.id)}
                />
              ))}
            </div>
          </TabsContent>

          {/* CERTIFICATES TAB */}
          <TabsContent value="certificates" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert) => (
                <CertificateCard
                  key={cert.id}
                  cert={cert}
                  navigate={navigate}
                  onClick={() => handleResultClick('certificate', cert.id)}
                />
              ))}
            </div>
          </TabsContent>

          {/* PEOPLE TAB */}
          <TabsContent value="people" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {profiles.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function DocumentCard({
  doc,
  navigate,
  onClick,
}: {
  doc: SearchDocResult
  navigate: (path: string) => void
  onClick?: () => void
}) {
  return (
    <Card
      className="border-ds-border hover:border-ds-brass cursor-pointer transition-all hover:shadow-sm bg-ds-surface"
      onClick={() => {
        onClick?.()
        navigate(`/knowledge/${doc.id}`)
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge
            variant="outline"
            className="bg-ds-brass/10 text-ds-brass border-ds-brass/20 text-xs"
          >
            {doc.document_type || 'SOP'}
          </Badge>
          <span className="text-xs text-ds-muted">
            {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy') : ''}
          </span>
        </div>
        <CardTitle className="text-base line-clamp-1 mt-1 text-ds-ink">{doc.title}</CardTitle>
        {doc.description && (
          <CardDescription className="line-clamp-2 text-ds-muted">
            {doc.description}
          </CardDescription>
        )}
      </CardHeader>
    </Card>
  )
}

function CourseCard({
  course,
  navigate,
  onClick,
}: {
  course: SearchCourseResult
  navigate: (path: string) => void
  onClick?: () => void
}) {
  return (
    <Card
      className="border-ds-border hover:border-ds-brass cursor-pointer transition-all hover:shadow-sm bg-ds-surface"
      onClick={() => {
        onClick?.()
        navigate(`/learn/my/${course.id}`)
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="secondary" className="text-xs bg-ds-surface-subtle text-ds-ink">
            {course.difficulty_level || 'Intermediate'}
          </Badge>
          {course.estimated_duration_minutes && (
            <span className="text-xs text-ds-muted">
              {course.estimated_duration_minutes} mins
            </span>
          )}
        </div>
        <CardTitle className="text-base line-clamp-1 mt-1 text-ds-ink">{course.title}</CardTitle>
        {course.description && (
          <CardDescription className="line-clamp-2 text-ds-muted">
            {course.description}
          </CardDescription>
        )}
      </CardHeader>
    </Card>
  )
}

function QuizCard({
  quiz,
  navigate,
  onClick,
}: {
  quiz: SearchQuizResult
  navigate: (path: string) => void
  onClick?: () => void
}) {
  return (
    <Card
      className="border-ds-border hover:border-ds-brass cursor-pointer transition-all hover:shadow-sm bg-ds-surface"
      onClick={() => {
        onClick?.()
        navigate(`/studio/quizzes`)
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="text-xs border-ds-border text-ds-ink">
            Passing: {quiz.passing_score_percentage || 80}%
          </Badge>
          <span className="text-xs text-ds-muted">
            {quiz.created_at ? format(new Date(quiz.created_at), 'MMM d, yyyy') : ''}
          </span>
        </div>
        <CardTitle className="text-base line-clamp-1 mt-1 text-ds-ink">{quiz.title}</CardTitle>
        {quiz.description && (
          <CardDescription className="line-clamp-2 text-ds-muted">
            {quiz.description}
          </CardDescription>
        )}
      </CardHeader>
    </Card>
  )
}

function CertificateCard({
  cert,
  navigate,
  onClick,
}: {
  cert: SearchCertResult
  navigate: (path: string) => void
  onClick?: () => void
}) {
  return (
    <Card
      className="border-ds-border hover:border-ds-brass cursor-pointer transition-all hover:shadow-sm bg-ds-surface"
      onClick={() => {
        onClick?.()
        navigate(`/learn/certificates`)
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge
            variant="outline"
            className="bg-ds-success-soft text-ds-success border-ds-success/20 text-xs"
          >
            {cert.certificate_number || 'Verified'}
          </Badge>
          <span className="text-xs text-ds-muted">
            {cert.issue_date ? format(new Date(cert.issue_date), 'MMM d, yyyy') : ''}
          </span>
        </div>
        <CardTitle className="text-base line-clamp-1 mt-1 text-ds-ink">
          {cert.title || 'Course Certificate'}
        </CardTitle>
        <CardDescription className="line-clamp-1 text-ds-muted">
          Recipient: {cert.recipient_name || 'Learner'}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function ProfileCard({ profile }: { profile: SearchProfileResult }) {
  return (
    <Card className="border-ds-border bg-ds-surface">
      <CardHeader className="flex flex-row items-center gap-4 py-4">
        <div className="w-10 h-10 rounded-full bg-ds-brass/10 text-ds-brass flex items-center justify-center font-bold text-sm">
          {profile.full_name?.[0] || <User className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base truncate text-ds-ink">
            {profile.full_name || 'User'}
          </CardTitle>
          <CardDescription className="truncate text-xs text-ds-muted">
            {profile.job_title || profile.email}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  )
}
