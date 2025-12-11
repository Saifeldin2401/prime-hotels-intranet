import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SOPService } from '@/lib/api/sop';
import { DocumentViewer } from './_components/document-viewer';
import { DocumentActions } from './_components/document-actions';
import { DocumentHistory } from './_components/document-history';
import { DocumentApproval } from './_components/document-approval';

export default async function SOPDocumentPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { data: document, error } = await SOPService.getDocumentById(params.id);

  if (error || !document) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold tracking-tight">
              {document.title}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {document.code}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            {document.department?.name} • {document.category?.name}
          </p>
        </div>
        <DocumentActions document={document} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <DocumentViewer document={document} />
          <DocumentHistory documentId={document.id} />
        </div>
        
        <div className="space-y-6">
          <DocumentApproval document={document} />
          
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-3">Document Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">
                  {document.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">v{document.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(document.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{new Date(document.updated_at).toLocaleDateString()}</span>
              </div>
              {document.next_review_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Review</span>
                  <span>{new Date(document.next_review_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
