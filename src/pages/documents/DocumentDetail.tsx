import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDocument, useDocumentVersions } from '@/hooks/useDocuments'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DocumentViewer } from '@/components/documents/DocumentViewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, ArrowLeft, Download, Eye, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

export default function DocumentDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t } = useTranslation('documents')
    const [viewerOpen, setViewerOpen] = useState(false)

    // Hooks
    const { data: document, isLoading: docLoading, error: docError } = useDocument(id!)
    const { data: versions = [], isLoading: versionsLoading } = useDocumentVersions(id!)

    if (docLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
    }

    if (docError || !document) {
        return (
            <div className="container mx-auto py-6">
                <Button variant="ghost" onClick={() => navigate('/documents')} className="mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t('detail.back_to_library')}
                </Button>
                <div className="text-center py-12 border rounded-lg bg-destructive/10 text-destructive">
                    <h3 className="text-lg font-medium">{t('detail.error_loading')}</h3>
                    <p>{t('detail.not_found')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Button variant="ghost" onClick={() => navigate('/documents')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" /> {t('detail.back_to_library')}
            </Button>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <StatusBadge status={document.status} className="mb-2" />
                                    <CardTitle className="text-2xl">{document.title}</CardTitle>
                                    <CardDescription className="text-base mt-2">
                                        {document.description || t('detail.no_description')}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => window.open(document.file_url, '_blank')}>
                                        <Download className="w-4 h-4 mr-2" />
                                        {t('actions.download')}
                                    </Button>
                                    <Button onClick={() => setViewerOpen(true)}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        {t('actions.preview')}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                                <div>
                                    <span className="font-medium text-foreground block mb-1">{t('detail.fields.department')}</span>
                                    {document.departments?.name || t('common.all_departments')}
                                </div>
                                <div>
                                    <span className="font-medium text-foreground block mb-1">{t('detail.fields.property')}</span>
                                    {document.properties?.name || t('common.all_properties')}
                                </div>
                                <div>
                                    <span className="font-medium text-foreground block mb-1">{t('detail.fields.created_by')}</span>
                                    {document.profiles?.full_name || t('common.unknown')}
                                </div>
                                <div>
                                    <span className="font-medium text-foreground block mb-1">{t('detail.fields.last_updated')}</span>
                                    {format(new Date(document.updated_at), 'PPP')}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="preview">
                        <TabsList>
                            <TabsTrigger value="preview">{t('detail.preview')}</TabsTrigger>
                            <TabsTrigger value="history">{t('detail.version_history_with_count', { count: versions.length })}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="preview" className="mt-4">
                            <Card className="overflow-hidden min-h-[500px]">
                                <iframe
                                    src={document.file_url}
                                    className="w-full h-[600px] border-none"
                                    title={t('detail.preview')}
                                />
                            </Card>
                        </TabsContent>
                        <TabsContent value="history" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">{t('detail.version_history')}</CardTitle>
                                    <CardDescription>{t('detail.version_history_desc')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {versionsLoading ? (
                                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                                    ) : versions.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">{t('detail.no_versions')}</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {versions.map((version) => (
                                                <div key={version.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                    <div className="flex gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                            v{version.version_number}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{t('detail.version')} {version.version_number}</p>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                                <User className="w-3 h-3" />
                                                                {/* @ts-ignore */}
                                                                {version.creator?.full_name || t('common.unknown')}
                                                                <span className="mx-1">•</span>
                                                                <Calendar className="w-3 h-3" />
                                                                {format(new Date(version.created_at), 'PPP p')}
                                                            </div>
                                                            {version.change_summary && (
                                                                <p className="text-sm mt-2 text-muted-foreground bg-muted p-2 rounded">
                                                                    "{version.change_summary}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <a href={version.file_url} target="_blank" rel="noopener noreferrer">
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('detail.details')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium mb-1">{t('detail.fields.status')}</h4>
                                <StatusBadge status={document.status} />
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-1">{t('detail.fields.visibility')}</h4>
                                <Badge variant="outline">{t(`visibility.${document.visibility}`)}</Badge>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-1">{t('detail.fields.role_access')}</h4>
                                <Badge variant="outline">{document.role ? t(`role.${document.role}`) : t('common.all_roles')}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Approvals Section if pending */}
                    {document.status === 'PENDING_REVIEW' && (
                        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
                            <CardHeader>
                                <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200">{t('detail.pending_approval')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    {t('detail.pending_review_msg')}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <DocumentViewer
                open={viewerOpen}
                onOpenChange={setViewerOpen}
                document={document}
            />
        </div>
    )
}
