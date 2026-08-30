/**
 * Client-side document text extraction for AI generation flows.
 *
 * The AI Course Generator / question generator / KB studio all let a user
 * "ground" generation on an uploaded file or a Document Library file. Those
 * flows need the *readable text* of the document — not its bytes.
 *
 * `FileReader.readAsText()` only works for plain-text formats. Feeding a PDF or
 * DOCX through it yields binary garbage, which is why grounded generation used
 * to produce output unrelated to the source. This module does it properly:
 *   - PDF  -> pdfjs-dist (selectable text only; scanned PDFs throw)
 *   - DOCX -> mammoth
 *   - TXT / MD / CSV / JSON / HTML -> decoded as UTF-8 text
 *
 * pdfjs and mammoth are dynamically imported so they never enter the bundle of
 * a page that doesn't extract a document.
 */

export type ExtractableKind = 'pdf' | 'docx' | 'text' | 'unsupported'

export interface ExtractedDocument {
  text: string
  wordCount: number
  kind: ExtractableKind
  truncated: boolean
}

const TEXT_EXTENSIONS = ['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'log', 'html', 'htm', 'xml', 'rtf']

export function classifyFile(nameOrType: string): ExtractableKind {
  const s = nameOrType.toLowerCase()
  if (s.endsWith('.pdf') || s === 'application/pdf' || s === 'pdf') return 'pdf'
  if (
    s.endsWith('.docx') ||
    s === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    s === 'docx'
  ) {
    return 'docx'
  }
  if (s.endsWith('.doc') || s === 'application/msword' || s === 'doc') return 'docx' // mammoth best-effort
  const ext = s.includes('.') ? s.split('.').pop()! : s
  if (TEXT_EXTENSIONS.includes(ext) || s.startsWith('text/')) return 'text'
  return 'unsupported'
}

const countWords = (t: string) => t.split(/\s+/).filter(Boolean).length

async function extractPdf(buffer: ArrayBuffer, maxChars: number): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Local worker in /public — CSP-safe, matches the rest of the app.
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const parts: string[] = []
  let total = 0
  for (let i = 1; i <= pdf.numPages && total < maxChars; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((it) => ('str' in it ? it.str : '')).join(' ')
    parts.push(pageText)
    total += pageText.length
  }
  const text = parts.join('\n\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (!text) {
    throw new Error(
      'No selectable text found in this PDF — it looks like a scanned image. Paste the text manually instead.',
    )
  }
  return text
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  const text = (result.value || '').trim()
  if (!text) throw new Error('No readable text found in this document.')
  return text
}

function decodeText(buffer: ArrayBuffer): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer).trim()
}

/**
 * Extract readable text from a locally-selected File.
 * @throws with a user-facing message on unsupported type / scanned PDF / parse failure.
 */
export async function extractTextFromFile(file: File, maxChars = 40000): Promise<ExtractedDocument> {
  const kind = classifyFile(file.type || file.name)
  if (kind === 'unsupported') {
    throw new Error(`Unsupported file type "${file.name.split('.').pop() ?? file.type}". Use PDF, DOCX, TXT, MD, CSV, or JSON.`)
  }
  const buffer = await file.arrayBuffer()
  let raw: string
  if (kind === 'pdf') raw = await extractPdf(buffer, maxChars)
  else if (kind === 'docx') raw = await extractDocx(buffer)
  else raw = decodeText(buffer)

  const truncated = raw.length > maxChars
  const text = truncated ? raw.slice(0, maxChars) : raw
  return { text, wordCount: countWords(text), kind, truncated }
}

/**
 * Fetch a stored document (e.g. a Document Library file at a Supabase storage
 * URL) and extract its text. Used when a picked library file has no `content`
 * column populated — the common case for uploaded PDFs.
 */
export async function extractTextFromUrl(
  url: string,
  fileTypeHint?: string,
  maxChars = 40000,
): Promise<ExtractedDocument> {
  const kind = classifyFile(fileTypeHint || url)
  if (kind === 'unsupported') {
    throw new Error('This library file is not a text-extractable format (PDF / DOCX / TXT).')
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not download the library file (HTTP ${res.status}).`)
  const buffer = await res.arrayBuffer()
  let raw: string
  if (kind === 'pdf') raw = await extractPdf(buffer, maxChars)
  else if (kind === 'docx') raw = await extractDocx(buffer)
  else raw = decodeText(buffer)

  const truncated = raw.length > maxChars
  const text = truncated ? raw.slice(0, maxChars) : raw
  return { text, wordCount: countWords(text), kind, truncated }
}
