import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    BookOpen, Home, CheckSquare, Users, Building, Shield, Edit3, Plus, Loader2
} from 'lucide-react'
import { getWikiArticles } from '@/services/systemWikiService'
import type { SystemWikiArticle, AppRole } from '@/lib/types'
import { WikiEditorDialog } from '@/components/knowledge/WikiEditorDialog'
import { sanitizeHtml } from '@/lib/sanitize'

export default function SystemWiki() {
    const { t, i18n } = useTranslation(['common', 'nav', 'knowledge'])
    const { profile, primaryRole, rolesLoading } = useAuth()
    const [activeTab, setActiveTab] = useState('')
    const [articles, setArticles] = useState<SystemWikiArticle[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [editingArticle, setEditingArticle] = useState<Partial<SystemWikiArticle> | null>(null)

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const data = await getWikiArticles()
            setArticles(data)
            if (data.length > 0) {
                setActiveTab(prev => prev || data[0].slug)
            }
        } catch (error) {
            console.error('Error loading wiki articles:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const role = primaryRole || 'staff'
    const isAdmin = ['corporate_admin', 'regional_admin'].includes(role)
    const currentLang = i18n.language === 'ar' ? 'ar' : 'en'

    // Filter articles based on role
    const visibleArticles = useMemo(() => {
        return articles.filter(art =>
            art.is_active && (isAdmin || art.allowed_roles.includes(role as AppRole))
        )
    }, [articles, role, isAdmin])

    const activeArticle = useMemo(() => {
        return visibleArticles.find(a => a.slug === activeTab)
    }, [visibleArticles, activeTab])

    if (rolesLoading || (isLoading && articles.length === 0)) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-hotel-gold" />
                    <p className="text-sm text-slate-500">Loading System Documentation...</p>
                </div>
            </div>
        )
    }

    const handleEdit = (article: SystemWikiArticle) => {
        setEditingArticle(article)
        setIsEditorOpen(true)
    }

    const handleCreate = () => {
        setEditingArticle({
            slug: '',
            title_en: '',
            title_ar: '',
            content_en: '',
            content_ar: '',
            allowed_roles: ['staff'],
            order_index: (articles.length + 1) * 10,
            is_active: true
        })
        setIsEditorOpen(true)
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex justify-between items-start">
                <PageHeader
                    title={t('nav:system_wiki', 'System Wiki')}
                    description={t('wiki.description', 'Your complete guide to using the PRIME Hotels Intranet')}
                />
                {isAdmin && (
                    <Button
                        onClick={handleCreate}
                        className="bg-hotel-gold hover:bg-hotel-gold/90 text-white shadow-sm mt-4"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Section
                    </Button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Navigation */}
                <Card className="w-full md:w-64 shrink-0 h-fit rounded-2xl shadow-sm border-slate-200">
                    <CardHeader className="pb-3 px-4">
                        <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Topics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                        <div className="space-y-1">
                            {visibleArticles.length > 0 ? (
                                visibleArticles.map((art) => (
                                    <WikiTabButton
                                        key={art.slug}
                                        id={art.slug}
                                        label={currentLang === 'ar' ? art.title_ar : art.title_en}
                                        icon={getContentIcon(art.slug)}
                                        activeTab={activeTab}
                                        onClick={setActiveTab}
                                    />
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-slate-500 italic">
                                    {t('no_topics', { defaultValue: 'No wiki topics available.' })}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Content Area */}
                <div className="flex-1">
                    <Card className="rounded-2xl shadow-sm border-slate-200 min-h-[600px] relative">
                        {isAdmin && activeArticle && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(activeArticle)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-hotel-gold z-10"
                            >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                        )}
                        <CardContent className="p-6 md:p-8">
                            {activeArticle ? (
                                <div className="space-y-8">
                                    <div
                                        className="prose prose-slate max-w-none animate-in fade-in slide-in-from-bottom-2 duration-300"
                                        dangerouslySetInnerHTML={{
                                            __html: sanitizeHtml(currentLang === 'ar' ? activeArticle.content_ar : activeArticle.content_en)
                                        }}
                                    />
                                    {activeArticle.subtopics && activeArticle.subtopics.length > 0 && (
                                        <div className="mt-8 pt-8 border-t border-slate-200">
                                            <h3 className="text-xl font-semibold mb-6 flex items-center text-slate-800">
                                                <BookOpen className="w-5 h-5 mr-2 text-hotel-gold" />
                                                {t('detailed_topics', { defaultValue: 'Detailed Topics' })}
                                            </h3>
                                            <Accordion type="multiple" className="w-full space-y-4">
                                                {activeArticle.subtopics.map((subtopic) => {
                                                    const title = currentLang === 'ar' ? subtopic.title_ar : subtopic.title_en;
                                                    const htmlContent = sanitizeHtml(currentLang === 'ar' ? subtopic.content_ar : subtopic.content_en);

                                                    if (!title) return null;

                                                    return (
                                                        <AccordionItem
                                                            key={subtopic.id}
                                                            value={subtopic.id}
                                                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 overflow-hidden shadow-sm"
                                                        >
                                                            <AccordionTrigger className="text-base font-semibold hover:no-underline hover:text-hotel-gold transition-colors py-4">
                                                                {title}
                                                            </AccordionTrigger>
                                                            <AccordionContent className="pt-2 pb-6 border-t border-slate-100">
                                                                <div
                                                                    className="prose prose-sm prose-slate max-w-none"
                                                                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                                                                />
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    );
                                                })}
                                            </Accordion>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
                                    <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
                                    <h3 className="text-xl font-medium text-slate-700 mb-2">
                                        {t('select_topic', { defaultValue: 'Select a Topic' })}
                                    </h3>
                                    <p className="text-slate-500 max-w-md mx-auto">
                                        {t('select_topic_desc', { defaultValue: 'Choose a topic from the sidebar to view its documentation and policies.' })}
                                    </p>
                                    {isAdmin && visibleArticles.length === 0 && (
                                        <Button
                                            onClick={handleCreate}
                                            className="bg-hotel-gold hover:bg-hotel-gold/90 text-white shadow-sm mt-6"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            {t('create_first_section', { defaultValue: 'Create First Section' })}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <WikiEditorDialog
                article={editingArticle}
                open={isEditorOpen}
                onOpenChange={setIsEditorOpen}
                onSave={fetchData}
            />
        </div>
    )
}

function getContentIcon(slug: string) {
    if (slug.includes('started')) return Home
    if (slug.includes('work')) return CheckSquare
    if (slug.includes('hr')) return Users
    if (slug.includes('team')) return Users
    if (slug.includes('property') || slug.includes('regional')) return Building
    if (slug.includes('system') || slug.includes('admin')) return Shield
    return BookOpen
}

function WikiTabButton({ id, label, icon: Icon, activeTab, onClick, badge }: any) {
    const isActive = activeTab === id
    return (
        <button
            onClick={() => onClick(id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                ? 'bg-hotel-gold/10 text-hotel-gold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
        >
            <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-hotel-gold' : 'text-slate-400'}`} />
                {label}
            </div>
            {badge && (
                <Badge variant="outline" className={`text-[10px] uppercase px-1 py-0 h-4 ${isActive ? 'border-hotel-gold/30 text-hotel-gold' : 'border-slate-200 text-slate-400'}`}>
                    {badge}
                </Badge>
            )}
        </button>
    )
}

