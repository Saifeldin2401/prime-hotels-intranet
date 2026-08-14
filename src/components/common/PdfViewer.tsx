import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
// Type-only import: erased at build time so pdfjs-dist (~hundreds of KB plus its
// worker) is NOT pulled into the bundle of every component that renders a PdfViewer.
// The runtime library is loaded on demand inside the effect below.
import type * as pdfjsLib from 'pdfjs-dist';
import type { RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { useCallback, useEffect, useRef, useState } from 'react';

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
    const [canvasKey, setCanvasKey] = useState(0)

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pdfjsRef = useRef<typeof import('pdfjs-dist') | null>(null)
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)
    const isRenderingRef = useRef<boolean>(false)
    const pendingRenderRef = useRef<{ num: number; pdf: pdfjsLib.PDFDocumentProxy } | null>(null)

    const renderPage = useCallback(async (num: number, pdf: pdfjsLib.PDFDocumentProxy) => {
        // If already rendering, queue this request and exit
        if (isRenderingRef.current) {
            pendingRenderRef.current = { num, pdf }
            return
        }

        isRenderingRef.current = true

        // Cancel any previous render task
        if (renderTaskRef.current) {
            try {
                renderTaskRef.current.cancel()
            } catch (_error) {
                // Ignore
            }
            renderTaskRef.current = null
        }

        // Increment canvas key to get fresh canvas
        setCanvasKey(k => k + 1)

        // Wait for React to process the key change
        await new Promise(resolve => setTimeout(resolve, 100))

        const canvas = canvasRef.current
        if (!canvas) {
            isRenderingRef.current = false
            return
        }

        try {
            const page = await pdf.getPage(num)

            if (!canvasRef.current) {
                isRenderingRef.current = false
                return
            }

            const viewport = page.getViewport({ scale, rotation })
            const context = canvas.getContext('2d')

            if (!context) {
                isRenderingRef.current = false
                return
            }

            canvas.height = viewport.height
            canvas.width = viewport.width

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            }

            const renderTask = page.render(renderContext as RenderParameters)
            renderTaskRef.current = renderTask

            await renderTask.promise
            renderTaskRef.current = null
        } catch (err: unknown) {
            const error = err as { name?: string }
            if (error?.name !== 'RenderingCancelledException') {
                console.error('Error rendering page:', err)
            }
        } finally {
            isRenderingRef.current = false

            // Process any pending render request
            if (pendingRenderRef.current) {
                const pending = pendingRenderRef.current
                pendingRenderRef.current = null
                renderPage(pending.num, pending.pdf)
            }
        }
    }, [scale, rotation])

    useEffect(() => {
        if (!url || typeof url !== 'string' || !url.trim()) return

        // If URL is not an absolute HTTP(S) / Blob / Data URL, wait or report error
        if (!/^https?:\/\//i.test(url) && !url.startsWith('blob:') && !url.startsWith('data:')) {
            setLoading(false)
            setError(new Error('Invalid document link. Unable to access file from storage.'))
            return
        }

        let cancelled = false
        setLoading(true)
        setError(null)
        setPageNumber(1)
        setRotation(0)

        ;(async () => {
            try {
                // Load pdfjs on demand and initialise its worker once.
                const pdfjs = pdfjsRef.current ?? (await import('pdfjs-dist'))
                if (!pdfjsRef.current) {
                    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                        'pdfjs-dist/build/pdf.worker.min.mjs',
                        import.meta.url
                    ).toString()
                    pdfjsRef.current = pdfjs
                }
                if (cancelled) return

                // Fetch PDF data using fetch() with robust error and status checking
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`Failed to load document (${response.status}: ${response.statusText || 'Access Denied'})`)
                }

                const contentType = response.headers.get('content-type') || ''
                if (contentType.includes('text/html')) {
                    throw new Error('The document file could not be loaded from storage.')
                }

                if (contentType.includes('application/json')) {
                    const text = await response.text()
                    try {
                        const parsed = JSON.parse(text)
                        throw new Error(parsed.message || parsed.error || 'Server returned an error instead of the PDF document.')
                    } catch (parseErr) {
                        if (parseErr instanceof Error && parseErr.message !== 'Server returned an error instead of the PDF document.') {
                            throw parseErr
                        }
                        throw new Error('Invalid file format received from server.')
                    }
                }

                const arrayBuffer = await response.arrayBuffer()
                if (cancelled) return

                const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
                if (cancelled) return

                pdfDocRef.current = pdf
                setNumPages(pdf.numPages)
                setLoading(false)
                renderPage(1, pdf)
            } catch (err) {
                if (cancelled) return
                console.error('Error loading PDF:', err)
                setError(err instanceof Error ? err : new Error(String(err)))
                setLoading(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [url, renderPage])

    useEffect(() => {
        if (pdfDocRef.current) {
            renderPage(pageNumber, pdfDocRef.current)
        }
    }, [pageNumber, renderPage])

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
                    className="text-hotel-navy hover:text-hotel-gold transition-colors hover:underline mt-2 text-sm"
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
                    className="text-xs text-hotel-gold hover:text-hotel-gold-light transition-colors px-2"
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
                <canvas key={canvasKey} ref={canvasRef} className="shadow-lg max-w-full" />
            </div>
        </div>
    )
}
