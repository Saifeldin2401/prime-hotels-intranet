import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEmployeeDocuments, useDeleteEmployeeDocument, useDownloadEmployeeDocument, type EmployeeDocument } from '@/hooks/useEmployeeDocuments'
import { DocumentUploader } from '@/components/documents/DocumentUploader'
import { FileText, Download, Trash2, Plus, Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'
// import { PageHeader } from '@/components/layout/PageHeader'

export default function EmployeeDocuments() {
    const [isUploaderOpen, setIsUploaderOpen] = useState(false)
    const { data: documents, isLoading } = useEmployeeDocuments()
    const deleteDocument = useDeleteEmployeeDocument()
    const downloadDocument = useDownloadEmployeeDocument()
    const { toast } = useToast()
    const { t } = useTranslation('profile')

    const handleDownload = async (doc: EmployeeDocument) => {
        try {
            const url = await downloadDocument.mutateAsync(doc.file_path)
            window.open(url, '_blank')
        } catch (error) {
            console.error('Download failed:', error)
            toast({
                title: t('employee_documents.download_failed'),
                description: t('employee_documents.download_failed_desc'),
                variant: 'destructive'
            })
        }
    }

    const handleDelete = async (doc: EmployeeDocument) => {
        if (!confirm(t('employee_documents.delete_confirm'))) return

        try {
            await deleteDocument.mutateAsync(doc)
            toast({
                title: t('employee_documents.deleted'),
                description: t('employee_documents.deleted_desc')
            })
        } catch (error) {
            console.error('Delete failed:', error)
            toast({
                title: t('employee_documents.delete_failed'),
                description: t('employee_documents.delete_failed_desc'),
                variant: 'destructive'
            })
        }
    }

    const categoryColors: Record<string, string> = {
        cv: 'bg-blue-100 text-blue-800',
        certificate: 'bg-green-100 text-green-800',
        contract: 'bg-purple-100 text-purple-800',
        other: 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">{t('employee_documents.title')}</h2>
                    <p className="text-sm text-muted-foreground">{t('employee_documents.description')}</p>
                </div>
                <Button onClick={() => setIsUploaderOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('employee_documents.upload_button')}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('employee_documents.uploaded_title')}</CardTitle>
                    <CardDescription>
                        {t('employee_documents.uploaded_description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : documents?.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                            <h3 className="text-lg font-medium text-foreground">{t('employee_documents.no_documents')}</h3>
                            <p className="text-muted-foreground mb-4">{t('employee_documents.no_documents_hint')}</p>
                            <Button variant="outline" onClick={() => setIsUploaderOpen(true)}>
                                {t('employee_documents.upload_first')}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {documents?.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900">{doc.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className={categoryColors[doc.category] || categoryColors.other}>
                                                    {doc.category.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs text-gray-500">
                                                    {format(new Date(doc.created_at), 'MMM d, yyyy')}
                                                </span>
                                                <span className="text-xs text-gray-300">•</span>
                                                <span className="text-xs text-gray-500">
                                                    {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDownload(doc)}
                                            title="Download"
                                        >
                                            <Download className="h-4 w-4 text-gray-500" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(doc)}
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <DocumentUploader
                open={isUploaderOpen}
                onOpenChange={setIsUploaderOpen}
            />
        </div>
    )
}
