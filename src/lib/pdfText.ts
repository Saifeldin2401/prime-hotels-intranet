// Type-only import: erased at build time so pdfjs-dist is not pulled into the
// bundle of every module that imports this file. The runtime library is loaded
// on demand inside getPdfjs() below.
import type * as pdfjsLib from 'pdfjs-dist'

let pdfjsPromise: Promise<typeof pdfjsLib> | null = null

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()
      return pdfjs
    })
  }
  return pdfjsPromise
}

/**
 * Extracts selectable text from raw PDF bytes entirely client-side (no upload,
 * no edge function). Used to feed a PDF's content into AI generation flows
 * that otherwise expect pasted/typed source text.
 */
export async function extractPdfTextFromArrayBuffer(arrayBuffer: ArrayBuffer, maxChars = 40000): Promise<string> {
  const pdfjs = await getPdfjs()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

  const pageTexts: string[] = []
  let totalChars = 0
  for (let i = 1; i <= pdf.numPages && totalChars < maxChars; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pageTexts.push(text)
    totalChars += text.length
  }

  const fullText = pageTexts.join('\n\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, maxChars)

  if (!fullText) {
    throw new Error('No selectable text found in this PDF. It may be a scanned image -- try pasting the text manually instead.')
  }

  return fullText
}

/** Extracts selectable text from a locally-selected PDF File. */
export async function extractPdfText(file: File, maxChars = 40000): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  return extractPdfTextFromArrayBuffer(arrayBuffer, maxChars)
}
