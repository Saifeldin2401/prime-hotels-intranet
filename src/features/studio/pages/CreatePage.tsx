/**
 * Studio > Create. One place to start any piece of content, with the source
 * of each option stated up front. AI options always produce a draft that goes
 * through review before anyone sees it.
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, FilePlus2, FileText, LayoutTemplate, ListChecks, Sparkles, type LucideIcon } from 'lucide-react'

import { useCapabilities } from '@/hooks/useCapabilities'

interface Option {
  to: string
  icon: LucideIcon
  title: string
  body: string
  ai?: boolean
}

function OptionList({ heading, id, options, aiNote }: { heading: string; id: string; options: Option[]; aiNote: string }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">{heading}</h2>
      <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
        {options.map((o) => (
          <li key={o.to}>
            <Link
              to={o.to}
              className="group flex min-h-[72px] items-center gap-4 px-4 py-3 transition-colors hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-ds-accent-soft text-ds-accent" aria-hidden="true">
                <o.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ds-ink">
                  {o.title}
                  {o.ai && (
                    <span className="rounded-[3px] border border-ds-accent/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ds-accent">
                      {aiNote}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-ds-muted">{o.body}</span>
              </span>
              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ds-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function CreatePage() {
  const { t } = useTranslation('training')
  const { can } = useCapabilities()
  const aiNote = t('studioCreate.aiDraft', 'AI draft · you review')

  const courses: Option[] = [
    { to: '/studio/courses?create=ai', icon: Sparkles, ai: true, title: t('studioCreate.aiCourse', 'Course from your documents'), body: t('studioCreate.aiCourseHint', 'Pick SOPs or files; AI drafts an outline, lessons and a quiz for you to edit.') },
    { to: '/studio/courses?create=template', icon: LayoutTemplate, title: t('studioCreate.template', 'Course from a template'), body: t('studioCreate.templateHint', 'Start from a proven structure such as onboarding or a compliance refresher.') },
    { to: '/studio/courses/new', icon: FilePlus2, title: t('studioCreate.blank', 'Blank course'), body: t('studioCreate.blankHint', 'Build lesson by lesson in the course builder.') },
  ]
  const other: Option[] = [
    { to: '/studio/articles/new', icon: FileText, title: t('studioCreate.article', 'Knowledge article'), body: t('studioCreate.articleHint', 'An SOP, guide or policy with an owner, scope and review date.') },
    { to: '/studio/quizzes/new', icon: ListChecks, title: t('studioCreate.quiz', 'Quiz'), body: t('studioCreate.quizHint', 'Choose questions from the bank and set the pass mark.') },
    { to: '/studio/quizzes/generate', icon: Sparkles, ai: true, title: t('studioCreate.aiQuestions', 'Questions from a document'), body: t('studioCreate.aiQuestionsHint', 'AI proposes questions with answers and sources; nothing is published until approved.') },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1.5 border-b border-ds-border pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-accent">{t('studioCreate.eyebrow', 'Studio')}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ds-ink sm:text-[28px]">{t('studioCreate.title', 'What would you like to create?')}</h1>
        <p className="max-w-prose text-sm text-ds-muted">
          {can('content.publish')
            ? t('studioCreate.subtitlePublisher', 'New content starts as a draft. You or another reviewer approve it before learners see it.')
            : t('studioCreate.subtitleAuthor', 'New content starts as a draft. When it is ready, submit it for review; a reviewer publishes it.')}
        </p>
      </header>

      <OptionList id="create-courses" heading={t('studioCreate.courses', 'Courses')} options={courses} aiNote={aiNote} />
      <OptionList id="create-other" heading={t('studioCreate.knowledgeAndQuizzes', 'Knowledge and quizzes')} options={other} aiNote={aiNote} />

      <p className="flex items-center gap-2 text-sm text-ds-muted">
        <BookOpen aria-hidden="true" className="h-4 w-4" />
        {t('studioCreate.continue', 'Looking for a draft?')}{' '}
        <Link to="/studio" className="font-semibold text-ds-accent hover:underline">{t('studioCreate.goToContent', 'Open My content')}</Link>
      </p>
    </div>
  )
}
