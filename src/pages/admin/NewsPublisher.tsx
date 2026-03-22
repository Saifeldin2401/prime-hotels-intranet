import { FloatingAdminAI } from '@/components/admin/AdminAIAssistant'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useNewsEditor } from '@/hooks/admin/useNewsEditor'
import { useNews, type HospitalityNews } from '@/hooks/useNews'
import { format } from 'date-fns'
import { Edit2, ExternalLink, Eye, EyeOff, Image as ImageIcon, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function NewsPublisher() {
    const { t, i18n } = useTranslation(['admin', 'common'])
    const isRtl = i18n.language === 'ar'
    const { data: newsItems, isLoading } = useNews()
    const { createNews, updateNews, deleteNews } = useNewsEditor()

    const [selectedNews, setSelectedNews] = useState<Partial<HospitalityNews> | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    const handleCreateNew = () => {
        setSelectedNews({
            original_title: '',
            title_en: '',
            title_ar: '',
            summary_en: '',
            summary_ar: '',
            source: 'PRIME Hotels Group',
            source_url: '',
            image_url: '',
            is_visible: true,
            original_language: 'en',
            tags: [],
            published_at: new Date().toISOString()
        })
        setIsEditing(true)
    }

    const handleSave = () => {
        if (!selectedNews?.original_title) return

        if (selectedNews.id) {
            updateNews.mutate({ id: selectedNews.id, ...selectedNews } as any, {
                onSuccess: () => {
                    setIsEditing(false)
                    setSelectedNews(null)
                }
            })
        } else {
            createNews.mutate(selectedNews as any, {
                onSuccess: () => {
                    setIsEditing(false)
                    setSelectedNews(null)
                }
            })
        }
    }

    const handleDelete = (id: string) => {
        if (window.confirm(t('common:actions.delete'))) {
            deleteNews.mutate(id)
        }
    }

    return (
        <div className="container mx-auto py-8">
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4`}>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-hotel-slate">
                        {t('admin:news.title', 'Hospitality News Publisher')}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('admin:news.desc', 'Manage and publish bilingual news for KSA dashboards')}
                    </p>
                </div>
                {!isEditing && (
                    <Button onClick={handleCreateNew} className="bg-hotel-gold hover:bg-hotel-gold/90 text-white">
                        <Plus className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                        {t('admin:news.add_article', 'Add Article')}
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: List of News */}
                <div className={`lg:col-span-4 space-y-4 ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Published Articles</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isLoading ? (
                                <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
                            ) : newsItems?.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No news articles found.</p>
                            ) : (
                                newsItems?.map(item => (
                                    <div key={item.id} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-medium text-sm line-clamp-2 pr-4">{isRtl ? item.title_ar || item.original_title : item.title_en || item.original_title}</h4>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setSelectedNews(item); setIsEditing(true); }}>
                                                    <Edit2 className="h-3 w-3 text-blue-600" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{format(new Date(item.published_at), 'PPP')}</span>
                                            <span className="flex items-center gap-1">
                                                {item.is_visible ? <Eye className="h-3 w-3 text-green-600" /> : <EyeOff className="h-3 w-3 text-gray-400" />}
                                                {item.is_visible ? 'Live' : 'Hidden'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Editor */}
                <div className="lg:col-span-8">
                    {isEditing && selectedNews ? (
                        <Card className="border-t-4 border-t-hotel-gold shadow-md">
                            <CardHeader>
                                <CardTitle>{selectedNews.id ? t('admin:news.edit_article', 'Edit Article') : t('admin:news.add_article', 'Add Article')}</CardTitle>
                                <CardDescription>All fields support dual-language mapping. The dashboards will intelligently render based on the viewer's language.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>{t('admin:news.fields.original_title', 'Internal Reference Title')} *</Label>
                                    <Input 
                                        value={selectedNews.original_title || ''} 
                                        onChange={e => setSelectedNews({...selectedNews, original_title: e.target.value})} 
                                        placeholder="E.g., Q3 Financial Press Release" 
                                        className="font-mono text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border">
                                    {/* English Column */}
                                    <div className="space-y-4" dir="ltr">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-1 rounded">English</span>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('admin:news.fields.title_en', 'English Title')}</Label>
                                            <Input value={selectedNews.title_en || ''} onChange={e => setSelectedNews({...selectedNews, title_en: e.target.value})} dir="ltr" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('admin:news.fields.summary_en', 'English Summary')}</Label>
                                            <Textarea value={selectedNews.summary_en || ''} onChange={e => setSelectedNews({...selectedNews, summary_en: e.target.value})} dir="ltr" rows={4} />
                                        </div>
                                    </div>

                                    {/* Arabic Column */}
                                    <div className="space-y-4" dir="rtl">
                                        <div className="flex items-center gap-2 mb-2 justify-start">
                                            <span className="text-xs font-bold uppercase tracking-wider text-green-700 bg-green-100 px-2 py-1 rounded">العربية</span>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('admin:news.fields.title_ar', 'Arabic Title')}</Label>
                                            <Input value={selectedNews.title_ar || ''} onChange={e => setSelectedNews({...selectedNews, title_ar: e.target.value})} dir="rtl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('admin:news.fields.summary_ar', 'Arabic Summary')}</Label>
                                            <Textarea value={selectedNews.summary_ar || ''} onChange={e => setSelectedNews({...selectedNews, summary_ar: e.target.value})} dir="rtl" rows={4} />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><ExternalLink className="w-3 h-3"/> {t('admin:news.fields.source', 'Source Name')}</Label>
                                        <Input value={selectedNews.source || ''} onChange={e => setSelectedNews({...selectedNews, source: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><ExternalLink className="w-3 h-3"/> {t('admin:news.fields.source_url', 'Source URL')}</Label>
                                        <Input value={selectedNews.source_url || ''} onChange={e => setSelectedNews({...selectedNews, source_url: e.target.value})} type="url" placeholder="https://" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> {t('admin:news.fields.image_url', 'Cover Image URL')}</Label>
                                    <Input value={selectedNews.image_url || ''} onChange={e => setSelectedNews({...selectedNews, image_url: e.target.value})} placeholder="https://..." />
                                    {selectedNews.image_url && (
                                        <div className="mt-2 h-32 w-48 rounded-md overflow-hidden border">
                                            <img src={selectedNews.image_url} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2 pt-4 border-t">
                                    <Switch
                                        id="visibility"
                                        checked={Boolean(selectedNews.is_visible)}
                                        onCheckedChange={checked => setSelectedNews({...selectedNews, is_visible: checked})}
                                    />
                                    <Label htmlFor="visibility">{t('admin:news.fields.is_visible', 'Publish Immediately to All Dashboards')}</Label>
                                </div>

                                <div className="flex flex-row-reverse gap-3 pt-6">
                                    <Button onClick={handleSave} disabled={createNews.isPending || updateNews.isPending} className="bg-hotel-gold hover:bg-hotel-gold/90 text-white">
                                        {createNews.isPending || updateNews.isPending ? 'Saving...' : t('common:actions.save', 'Save')}
                                    </Button>
                                    <Button variant="outline" onClick={() => { setIsEditing(false); setSelectedNews(null) }}>
                                        {t('common:actions.cancel', 'Cancel')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-slate-50 text-muted-foreground p-8">
                            <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-slate-700">No article selected</h3>
                            <p className="text-sm text-center max-w-sm mt-2">Select an existing article from the list to edit its translations and images, or click 'Add Article' to publish a new broadcast.</p>
                        </div>
                    )}
                </div>
            </div>
            <FloatingAdminAI />
        </div>
    )
}
