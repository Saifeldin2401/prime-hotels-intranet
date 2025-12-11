'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { SOPDocument } from '@/lib/types/sop';

interface DocumentViewerProps {
  document: SOPDocument;
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState('content');
  const { toast } = useToast();
  const [content, setContent] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    // Load document content
    const loadContent = async () => {
      try {
        // In a real app, you might fetch this from an API
        setContent(document.current_version?.content || {});
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load document content',
          variant: 'destructive',
        });
      }
    };

    loadContent();
  }, [document.id, toast]);

  const handleDownload = (format: 'pdf' | 'docx') => {
    // Implement download functionality
    toast({
      title: 'Download',
      description: `Downloading as ${format.toUpperCase()}`,
    });
  };

  if (!content) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icons.Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 p-4 flex justify-between items-center">
        <h2 className="text-lg font-medium">Document Content</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleDownload('pdf')}>
            <Icons.Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload('docx')}>
            <Icons.Download className="h-4 w-4 mr-2" />
            Word
          </Button>
        </div>
      </div>

      <Tabs 
        defaultValue="content" 
        className="w-full"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="attachments">
            Attachments ({document.attachments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="related">
            Related Documents ({document.related_documents?.length || 0})
          </TabsTrigger>
        </TabsList>

        <div className="p-6">
          <TabsContent value="content">
            {content.type === 'html' ? (
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: content.html }}
              />
            ) : (
              <div className="prose max-w-none">
                {/* Render JSON content or other formats */}
                <pre>{JSON.stringify(content, null, 2)}</pre>
              </div>
            )}
          </TabsContent>

          <TabsContent value="attachments">
            {document.attachments?.length ? (
              <div className="space-y-2">
                {document.attachments.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <Icons.File className="h-5 w-5 mr-3 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{file.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.file_size)} • {file.file_type}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Icons.Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Icons.File className="h-12 w-12 mx-auto mb-2" />
                <p>No attachments found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="related">
            {document.related_documents?.length ? (
              <div className="space-y-3">
                {document.related_documents.map((doc) => (
                  <div 
                    key={doc.id}
                    className="p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <p className="font-medium">{doc.title}</p>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <span>{doc.code}</span>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{doc.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Icons.FileText className="h-12 w-12 mx-auto mb-2" />
                <p>No related documents</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
