import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Link as LinkIcon, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import type { TrainingContentBlock } from '@/lib/types'
import { Button } from '@/components/ui/button'
import * as pdfjsLib from 'pdfjs-dist'

// Set worker source locally using Vite's URL handling
// This ensures the worker is bundled and served correctly
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

interface DocumentBlockRendererProps {
    block: TrainingContentBlock
}

export const DocumentBlockRenderer = ({ block }: DocumentBlockRendererProps) => {
    const { t } = useTranslation('training')
    const isPdf = block.content_url?.toLowerCase().endsWith('.pdf')
    const [numPages, setNumPages] = useState<number>(0)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, setScale] = useState(1.0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

    useEffect(() => {
        if (isPdf && block.content_url) {
            setLoading(true)
            setError(null)

            // Use generic implementation to get the document
            const loadingTask = pdfjsLib.getDocument(block.content_url)

            loadingTask.promise.then(pdf => {
                pdfDocRef.current = pdf
                setNumPages(pdf.numPages)
                setLoading(false)
                renderPage(1, pdf)
            }).catch(err => {
                console.error('Error loading PDF:', err)
                setError(err instanceof Error ? err : new Error(String(err)))
                setLoading(false)
            })
        }
    }, [block.content_url])

    useEffect(() => {
        if (pdfDocRef.current) {
            renderPage(pageNumber, pdfDocRef.current)
        }
    }, [pageNumber, scale])

    const renderPage = async (num: number, pdf: pdfjsLib.PDFDocumentProxy) => {
        if (!canvasRef.current) return

        // Cancel pending render
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel()
        }

        try {
            const page = await pdf.getPage(num)
            const viewport = page.getViewport({ scale })
            const canvas = canvasRef.current
            const context = canvas.getContext('2d')

            if (!context) return

            canvas.height = viewport.height
            canvas.width = viewport.width

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            }

            // Cast to any to avoid type mismatch with pdfjs-dist types vs runtime
            const renderTask = page.render(renderContext as any)
            renderTaskRef.current = renderTask

            await renderTask.promise
        } catch (err: any) {
            if (err.name !== 'RenderingCancelledException') {
                console.error('Error rendering page:', err)
            }
        }
    }

    const changePage = (offset: number) => {
        setPageNumber(prevPage => {
            const newPage = prevPage + offset
            return Math.min(Math.max(1, newPage), numPages)
        })
    }

    if (!isPdf) {
        return (
            <div className="space-y-4">
                <div className="p-6 border rounded-lg bg-slate-50 flex items-center gap-4">
                    <LinkIcon className="h-8 w-8 text-blue-500" />
                    <div>
                        <h4 className="font-medium">{t('attachedDocument')}</h4>
                        <a
                            href={block.content_url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline break-all"
                        >
                            {block.content_url || t('noLinkProvided')}
                        </a>
                    </div>
                </div>
                <div className="mt-2 text-sm text-gray-500 prose max-w-none dark:prose-invert">
                    <div dangerouslySetInnerHTML={{ __html: block.content }} />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="w-full bg-slate-100 rounded-lg overflow-hidden border shadow-sm relative min-h-[400px] flex flex-col">
                {error ? (
                    <div className="flex flex-col items-center justify-center flex-1 p-6 text-center text-gray-500">
                        <FileText className="w-12 h-12 mb-2 opacity-50" />
                        <p className="font-medium text-red-500 mb-1">{t('pdfPreviewNotAvailable', 'Preview not available')}</p>
                        <p className="text-xs text-red-400 mb-4 px-4 bg-red-50 py-2 rounded border border-red-100 max-w-md">
                            {error.message}
                        </p>
                        <a
                            href={block.content_url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline mt-2 text-sm"
                        >
                            {t('download')}
                        </a>
                    </div>
                ) : (
                    <>
                        {/* Toolbar */}
                        <div className="bg-slate-800 text-white p-2 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-slate-700 h-8 w-8 p-0"
                                    onClick={() => changePage(-1)}
                                    disabled={pageNumber <= 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm">
                                    {pageNumber} / {numPages || '--'}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-slate-700 h-8 w-8 p-0"
                                    onClick={() => changePage(1)}
                                    disabled={pageNumber >= numPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-slate-700 h-8 w-8 p-0"
                                    onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-slate-700 h-8 w-8 p-0"
                                    onClick={() => setScale(s => Math.min(3, s + 0.2))}
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                            </div>

                            <a
                                href={block.content_url || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-200 hover:text-white"
                            >
                                {t('download')}
                            </a>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto flex justify-center bg-slate-200 p-4 relative">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-0">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
                                </div>
                            )}
                            <canvas ref={canvasRef} className="shadow-lg max-w-full" />
                        </div>
                    </>
                )}
            </div>

            <div className="mt-2 text-sm text-gray-500 prose max-w-none dark:prose-invert">
                <div dangerouslySetInnerHTML={{ __html: block.content }} />
            </div>
        </div>
    )
}
