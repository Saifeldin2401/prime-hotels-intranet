import { DocumentUploader } from '@/components/documents/DocumentUploader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useDeleteEmployeeDocument, useDownloadEmployeeDocument, useEmployeeDocuments, type EmployeeDocument } from '@/hooks/useEmployeeDocuments'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { AlertCircle, Download, FileText, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
// import { PageHeader } from '@/components/layout/PageHeader'

export default function EmployeeDocuments({ userId }: { userId?: string }) {
    const [isUploaderOpen, setIsUploaderOpen] = useState(false)
    const { data: documents, isLoading } = useEmployeeDocuments(userId)
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
                                                {doc.document_number && (
                                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {doc.document_number}
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-500">
                                                    {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <FileText className="w-3 h-3" />
                                                    {t('employee_documents.uploaded_title')}: {format(new Date(doc.created_at), 'MMM d, yyyy')}
                                                </span>
                                                {doc.expiry_date && (
                                                    <span className={cn(
                                                        "text-xs flex items-center gap-1 font-medium",
                                                        doc.status === 'expired' ? "text-red-600" :
                                                            doc.status === 'expiring_soon' ? "text-amber-600" :
                                                                "text-gray-500"
                                                    )}>
                                                        <AlertCircle className="w-3 h-3" />
                                                        {t('employee_documents.expiry_date')}: {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                                                    </span>
                                                )}
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] uppercase h-4 px-1.5",
                                                        doc.status === 'active' ? "border-green-200 text-green-700 bg-green-50" :
                                                            doc.status === 'expired' ? "border-red-200 text-red-700 bg-red-50" :
                                                                doc.status === 'expiring_soon' ? "border-amber-200 text-amber-700 bg-amber-50" :
                                                                    "border-gray-200 text-gray-700 bg-gray-50"
                                                    )}
                                                >
                                                    {t(`employee_documents.${doc.status}`)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDownload(doc)}
                                            title={t_ext('download', 'Download')}
                                        >
                                            <Download className="h-4 w-4 text-gray-500" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(doc)}
                                            title={t_ext('delete', 'Delete')}
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
