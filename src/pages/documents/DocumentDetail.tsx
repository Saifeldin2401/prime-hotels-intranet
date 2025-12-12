import { useParams, useNavigate } from 'react-router-dom'
import { useDocument, useDocumentVersions } from '@/hooks/useDocuments'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, ArrowLeft, Download, Eye, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'

export default function DocumentDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

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
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
                </Button>
                <div className="text-center py-12 border rounded-lg bg-destructive/10 text-destructive">
                    <h3 className="text-lg font-medium">Error loading document</h3>
                    <p>The document could not be found or you don't have permission to view it.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Button variant="ghost" onClick={() => navigate('/documents')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
            </Button>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant="outline" className="mb-2">{document.status}</Badge>
                                    <CardTitle className="text-2xl">{document.title}</CardTitle>
                                    <CardDescription className="text-base mt-2">
                                        {document.description || "No description provided."}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" asChild>
                                        <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                        </a>
                                    </Button>
                                    <Button asChild>
                                        <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                                            <Eye className="w-4 h-4 mr-2" />
                                            Preview
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                                <div>
                                    <span className="font-medium text-foreground block mb-1">Department</span>
                                    {document.departments?.name || "All Departments"}
                                </div>
                                <div>
                                    <span className="font-medium text-foreground block mb-1">Property</span>
                                    {document.properties?.name || "All Properties"}
                                </div>
                                <div>
                                    <span className="font-medium text-foreground block mb-1">Created By</span>
                                    {document.profiles?.full_name || "Unknown"}
                                </div>
                                <div>
                                    <span className="font-medium text-foreground block mb-1">Last Updated</span>
                                    {format(new Date(document.updated_at), 'PPP')}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="preview">
                        <TabsList>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                            <TabsTrigger value="history">Version History ({versions.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="preview" className="mt-4">
                            <Card className="overflow-hidden min-h-[500px]">
                                <iframe
                                    src={document.file_url}
                                    className="w-full h-[600px] border-none"
                                    title="Document Preview"
                                />
                            </Card>
                        </TabsContent>
                        <TabsContent value="history" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Version History</CardTitle>
                                    <CardDescription>Previous versions of this document.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {versionsLoading ? (
                                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                                    ) : versions.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">No previous versions found.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {versions.map((version) => (
                                                <div key={version.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                    <div className="flex gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                            v{version.version_number}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">Version {version.version_number}</p>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                                <User className="w-3 h-3" />
                                                                {/* @ts-ignore */}
                                                                {version.creator?.full_name || "Unknown"}
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
                            <CardTitle className="text-lg">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium mb-1">Status</h4>
                                <Badge variant={
                                    document.status === 'APPROVED' ? 'default' :
                                        document.status === 'PUBLISHED' ? 'default' :
                                            document.status === 'REJECTED' ? 'destructive' : 'secondary'
                                }>
                                    {document.status}
                                </Badge>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-1">Visibility</h4>
                                <Badge variant="outline">{document.visibility}</Badge>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-1">Role Access</h4>
                                <Badge variant="outline">{document.role || "All Roles"}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Approvals Section if pending */}
                    {document.status === 'PENDING_REVIEW' && (
                        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
                            <CardHeader>
                                <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200">Pending Approval</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    This document is currently under review.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
