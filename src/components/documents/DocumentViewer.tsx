import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { sanitizeHtml } from '@/lib/sanitize'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { openUrlInNewTab, resolveDocumentUrl } from '@/lib/secureFileAccess'

interface DocumentViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: {
    id: string
    title: string
    file_url: string
    content?: string | null
    description?: string | null
  }
}

export function DocumentViewer({ open, onOpenChange, document }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [isResolvingUrl, setIsResolvingUrl] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadSecureUrl = async () => {
      if (!open || !document.id || !document.file_url) {
        setResolvedUrl(document.file_url || null)
        return
      }

      setIsResolvingUrl(true)
      const secureUrl = await resolveDocumentUrl(document.id, document.file_url)
      if (!cancelled) {
        setResolvedUrl(secureUrl || document.file_url)
        setIsResolvingUrl(false)
      }
    }

    loadSecureUrl()

    return () => {
      cancelled = true
    }
  }, [open, document.id, document.file_url])

  const activeUrl = resolvedUrl || document.file_url

  const handleDownload = () => {
    if (activeUrl) {
      openUrlInNewTab(activeUrl)
    }
  }

  const getFileType = (url: string | null | undefined) => {
    if (!url) {
      // If no URL but has content, treat as an article
      if (document.content) return 'article'
      return 'other'
    }
    const extension = url.split('.').pop()?.toLowerCase()
    if (['pdf'].includes(extension || '')) return 'pdf'
    if (['doc', 'docx'].includes(extension || '')) return 'word'
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) return 'image'
    return 'other'
  }

  const fileType = getFileType(activeUrl)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="truncate pr-4 text-xl">{document.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Document viewer for {document.title}
          </DialogDescription>
          <div className="flex items-center gap-2">
            {document.file_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-1">
          {isResolvingUrl && (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {fileType === 'pdf' && (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center p-8">
              <div className="mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto">
                  <div className="text-red-600 text-2xl font-bold">PDF</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">PDF Document</h3>
              <p className="text-gray-600 mb-4">
                This PDF document cannot be previewed inline due to security restrictions.
              </p>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Open PDF in New Tab
              </Button>
            </div>
          )}

          {fileType === 'image' && activeUrl && (
            <div className="flex items-center justify-center h-full min-h-[50vh]">
              <img
                src={activeUrl}
                alt={document.title}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            </div>
          )}

          {fileType === 'word' && (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center p-8">
              <div className="mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                  <div className="text-blue-600 text-2xl font-bold">DOC</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Word Document</h3>
              <p className="text-gray-600 mb-4">
                This document cannot be previewed inline. Please download it to view.
              </p>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download Document
              </Button>
            </div>
          )}

          {fileType === 'article' && (
            <div className="prose prose-sm sm:prose max-w-none p-6 bg-white rounded-lg">
              {document.description && (
                <p className="text-lg text-gray-600 mb-6 italic border-l-4 border-gray-200 pl-4">
                  {document.description}
                </p>
              )}
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(document.content || '') }} />
            </div>
          )}

          {fileType === 'other' && (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center p-8">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                  <div className="text-gray-600 text-2xl font-bold">FILE</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Preview Not Available</h3>
              <p className="text-gray-600 mb-4">
                This content cannot be previewed inline.
              </p>
              {activeUrl && (
                <Button onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
