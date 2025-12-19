import { useState, useEffect, useRef } from 'react'
import { FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as pdfjsLib from 'pdfjs-dist'

// Set worker source locally using Vite's URL handling
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

interface PdfViewerProps {
    url: string
    className?: string
}

export function PdfViewer({ url, className }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, setScale] = useState(1.0)
    const [rotation, setRotation] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

    useEffect(() => {
        if (url) {
            setLoading(true)
            setError(null)
            setPageNumber(1)
            setRotation(0)

            const loadingTask = pdfjsLib.getDocument(url)

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
    }, [url])

    useEffect(() => {
        if (pdfDocRef.current) {
            renderPage(pageNumber, pdfDocRef.current)
        }
    }, [pageNumber, scale, rotation])

    const renderPage = async (num: number, pdf: pdfjsLib.PDFDocumentProxy) => {
        if (!canvasRef.current) return

        // Cancel pending render
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel()
        }

        try {
            const page = await pdf.getPage(num)
            const viewport = page.getViewport({ scale, rotation })
            const canvas = canvasRef.current
            const context = canvas.getContext('2d')

            if (!context) return

            canvas.height = viewport.height
            canvas.width = viewport.width

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            }

            // Cast to any to avoid type mismatch
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

    if (error) {
        return (
            <div className={`flex flex-col items-center justify-center p-6 text-center text-gray-500 bg-slate-50 border rounded-lg h-[400px] ${className}`}>
                <FileText className="w-12 h-12 mb-2 opacity-50" />
                <p className="font-medium text-red-500 mb-1">Preview not available</p>
                <p className="text-xs text-red-400 mb-4 px-4 bg-red-50 py-2 rounded border border-red-100 max-w-md">
                    {error.message}
                </p>
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline mt-2 text-sm"
                >
                    Download PDF
                </a>
            </div>
        )
    }

    return (
        <div className={`w-full bg-slate-100 rounded-lg overflow-hidden border shadow-sm relative flex flex-col ${className}`}>
            {/* Toolbar */}
            <div className="bg-slate-800 text-white p-2 flex items-center justify-between sticky top-0 z-10 shrink-0">
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
                    <span className="text-sm min-w-[3rem] text-center">
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
                        onClick={() => setRotation(r => (r + 90) % 360)}
                        title="Rotate"
                    >
                        <RotateCw className="h-4 w-4" />
                    </Button>
                    <div className="h-4 w-px bg-slate-600 mx-1" />
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
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-200 hover:text-white px-2"
                >
                    Download
                </a>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto flex justify-center bg-slate-200 p-4 relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-0">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
                    </div>
                )}
                <canvas ref={canvasRef} className="shadow-lg max-w-full" />
            </div>
        </div>
    )
}
