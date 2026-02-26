import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { marked } from 'marked'
import { useTranslation } from 'react-i18next'
import { aiService } from '@/lib/gemini'
import { extractTextFromAiResponse } from '@/lib/aiResponse'
import { sanitizeHtml } from '@/lib/sanitize'
import { transformMermaidCodeBlocks } from '@/lib/mermaid'
import { ArticleFormData } from './useArticleForm'

export function useAIService(
    formData: ArticleFormData,
    updateField: <K extends keyof ArticleFormData>(field: K, value: ArticleFormData[K]) => void
) {
    const { t } = useTranslation(['knowledge', 'common'])
    const [isGenerating, setIsGenerating] = useState(false)
    const [aiLanguage, setAiLanguage] = useState('English')
    const [beautifyOptions, setBeautifyOptions] = useState({
        includeTables: true,
        includeMermaid: false,
        includeCallouts: true,
        includeTOC: true
    })

    const toPlainText = useCallback((value: string) => {
        const parser = new DOMParser()
        const doc = parser.parseFromString(value, 'text/html')
        return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
    }, [])

    const toHtmlContent = useCallback((value: string) => {
        const trimmed = value.trim()
        if (!trimmed) return ''
        return trimmed.startsWith('<')
            ? trimmed
            : (marked.parse(trimmed, { async: false }) as string)
    }, [])

    const ensureBeautifyFeatures = useCallback((html: string, opts: typeof beautifyOptions) => {
        if (!html) return html

        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const body = doc.body

        const slugify = (value: string) =>
            value
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')

        const ensureHeadingIds = () => {
            const used = new Set<string>()
            const headings = Array.from(body.querySelectorAll('h1, h2, h3, h4'))
            headings.forEach((h) => {
                const base = slugify(h.textContent || 'section') || 'section'
                let id = base
                let i = 2
                while (used.has(id)) {
                    id = `${base}-${i}`
                    i += 1
                }
                h.id = h.id || id
                used.add(h.id)
            })
            return headings
        }

        const headings = ensureHeadingIds()
        const nonTitleHeadings = headings.filter((h) => h.tagName !== 'H1')
        const generatedTOCs = Array.from(body.querySelectorAll('.ai-generated-toc'))
        const generatedSummaryTables = Array.from(body.querySelectorAll('table.ai-generated-summary-table'))
        const generatedCallouts = Array.from(body.querySelectorAll('.ai-generated-callout'))
        const generatedMermaidBlocks = Array.from(body.querySelectorAll('pre.ai-generated-mermaid'))
        const hasAnyTable = Array.from(body.querySelectorAll('table')).some(
            (table) => !table.classList.contains('summary-table') && !table.classList.contains('ai-generated-summary-table')
        )
        const hasTOC = !!body.querySelector('.table-of-contents, .ai-generated-toc, .ai-content .ai-section-title')
        const hasCallout = !!body.querySelector(
            '.ai-highlight-box, .ai-warning-box, .ai-info-box, .ai-tip-box, [class^="alert-"], [class*=" alert-"]'
        )
        const hasMermaid = !!body.querySelector('pre.mermaid, .mermaid')

        if (!opts.includeTOC || hasTOC) {
            generatedTOCs.forEach((node) => node.remove())
        }
        if (!opts.includeTables) {
            generatedSummaryTables.forEach((node) => node.remove())
        }
        if (!opts.includeCallouts) {
            generatedCallouts.forEach((node) => node.remove())
        }
        if (!opts.includeMermaid) {
            generatedMermaidBlocks.forEach((node) => node.remove())
        }

        const existingTOCs = Array.from(body.querySelectorAll('.table-of-contents'))
        if (existingTOCs.length > 1) {
            existingTOCs.slice(1).forEach((node) => node.remove())
        }
        const existingSummaryTables = Array.from(body.querySelectorAll('table.summary-table, table.ai-generated-summary-table'))
        if (existingSummaryTables.length > 1) {
            existingSummaryTables.slice(1).forEach((node) => node.remove())
        }

        const insertAtTop = (node: HTMLElement) => {
            if (body.firstChild) {
                body.insertBefore(node, body.firstChild)
            } else {
                body.appendChild(node)
            }
        }
        const insertAfter = (ref: Element | null, node: HTMLElement) => {
            if (!ref || !ref.parentNode) {
                insertAtTop(node)
                return
            }
            const parent = ref.parentNode
            if (ref.nextSibling) parent.insertBefore(node, ref.nextSibling)
            else parent.appendChild(node)
        }

        const titleNode = body.querySelector('h1')
        if (opts.includeTOC && !hasTOC && nonTitleHeadings.length > 0) {
            const toc = doc.createElement('section')
            toc.className = 'ai-section table-of-contents ai-generated-toc'
            const title = doc.createElement('h2')
            title.className = 'ai-section-title'
            title.textContent = t('editor.table_of_contents', 'Table of Contents')
            const list = doc.createElement('ol')
            list.className = 'ai-ordered-list'
            nonTitleHeadings.forEach((h) => {
                const li = doc.createElement('li')
                const a = doc.createElement('a')
                a.setAttribute('href', `#${h.id}`)
                a.textContent = h.textContent || 'Section'
                li.appendChild(a)
                list.appendChild(li)
            })
            toc.appendChild(title)
            toc.appendChild(list)

            const insertionPoint = body.querySelector('.ai-content') || body
            if (insertionPoint === body) {
                insertAfter(titleNode, toc)
            } else {
                if (insertionPoint.firstChild) insertionPoint.insertBefore(toc, insertionPoint.firstChild)
                else insertionPoint.appendChild(toc)
            }
        }

        if (opts.includeTables && !existingSummaryTables.length && !hasAnyTable) {
            const table = doc.createElement('table')
            table.className = 'ai-table summary-table ai-generated-summary-table'
            const thead = doc.createElement('thead')
            const headRow = doc.createElement('tr')
            const th1 = doc.createElement('th')
            th1.textContent = t('editor.section', 'Section')
            const th2 = doc.createElement('th')
            th2.textContent = t('editor.summary', 'Summary')
            headRow.appendChild(th1)
            headRow.appendChild(th2)
            thead.appendChild(headRow)
            table.appendChild(thead)

            const tbody = doc.createElement('tbody')
            const getSummary = (heading: Element) => {
                let sibling = heading.nextElementSibling
                while (sibling) {
                    if (/^H[1-4]$/.test(sibling.tagName)) break
                    if (sibling.tagName === 'P' && sibling.textContent?.trim()) {
                        return sibling.textContent.trim().slice(0, 180)
                    }
                    sibling = sibling.nextElementSibling
                }
                return ''
            }

            if (nonTitleHeadings.length > 0) {
                nonTitleHeadings.forEach((h) => {
                    const row = doc.createElement('tr')
                    const td1 = doc.createElement('td')
                    td1.textContent = h.textContent || ''
                    const td2 = doc.createElement('td')
                    td2.textContent = getSummary(h)
                    row.appendChild(td1)
                    row.appendChild(td2)
                    tbody.appendChild(row)
                })
            } else {
                const row = doc.createElement('tr')
                const td1 = doc.createElement('td')
                td1.textContent = t('editor.overview', 'Overview')
                const td2 = doc.createElement('td')
                const firstParagraph = body.querySelector('p')?.textContent?.trim() || ''
                td2.textContent = firstParagraph.slice(0, 180)
                row.appendChild(td1)
                row.appendChild(td2)
                tbody.appendChild(row)
            }

            table.appendChild(tbody)
            const tocNode = body.querySelector('.table-of-contents')
            insertAfter(tocNode || titleNode, table)
        }

        if (opts.includeCallouts && !hasCallout) {
            let replaced = false
            const calloutMap: Record<string, string> = {
                IMPORTANT: 'ai-warning-box',
                WARNING: 'ai-warning-box',
                NOTE: 'ai-info-box',
                TIP: 'ai-tip-box',
                REMEMBER: 'ai-highlight-box'
            }

            Array.from(body.querySelectorAll('p')).forEach((p) => {
                const text = p.textContent?.trim() || ''
                const match = text.match(/^(IMPORTANT|WARNING|NOTE|TIP|REMEMBER)\s*[:\-]\s*(.+)$/i)
                if (!match) return
                const label = match[1].toUpperCase()
                const content = match[2]
                const div = doc.createElement('div')
                div.className = `${calloutMap[label] || 'ai-info-box'} ai-generated-callout`
                const strong = doc.createElement('strong')
                strong.textContent = `${label}: `
                div.appendChild(strong)
                div.appendChild(doc.createTextNode(content))
                p.replaceWith(div)
                replaced = true
            })

            if (!replaced) {
                const fallback = doc.createElement('div')
                fallback.className = 'ai-info-box ai-generated-callout'
                const strong = doc.createElement('strong')
                strong.textContent = `${t('editor.note', 'NOTE')}: `
                fallback.appendChild(strong)
                fallback.appendChild(
                    doc.createTextNode(
                        t('editor.callout_fallback', 'Review the table of contents for quick navigation and key steps.')
                    )
                )
                const tocNode = body.querySelector('.table-of-contents')
                const summaryTable = body.querySelector('table.summary-table, table.ai-generated-summary-table')
                insertAfter(summaryTable || tocNode || titleNode, fallback)
            }
        }

        if (opts.includeMermaid && !hasMermaid && nonTitleHeadings.length > 1) {
            const labels = [
                (titleNode?.textContent || t('editor.overview', 'Overview')).trim(),
                ...nonTitleHeadings.slice(0, 4).map((h) => (h.textContent || t('editor.section', 'Section')).trim()),
            ].filter(Boolean)

            if (labels.length > 1) {
                const normalizeMermaidLabel = (value: string) => value.replace(/"/g, '\\"')
                const nodeId = (index: number) => `N${index + 1}`
                const lines = ['flowchart TD']

                labels.forEach((label, index) => {
                    lines.push(`${nodeId(index)}["${normalizeMermaidLabel(label)}"]`)
                    if (index > 0) {
                        lines.push(`${nodeId(index - 1)} --> ${nodeId(index)}`)
                    }
                })

                const mermaidBlock = doc.createElement('pre')
                mermaidBlock.className = 'mermaid ai-generated-mermaid'
                mermaidBlock.textContent = lines.join('\n')

                const summaryTable = body.querySelector('table.summary-table, table.ai-generated-summary-table')
                const tocNode = body.querySelector('.table-of-contents')
                insertAfter(summaryTable || tocNode || titleNode, mermaidBlock)
            }
        }

        return body.innerHTML
    }, [t])

    const finalizeAiHtmlForEditor = useCallback((
        rawResult: string,
        fallbackSource?: string,
        minRetentionRatio = 0
    ) => {
        const extracted = extractTextFromAiResponse(rawResult).trim()
        if (!extracted) return ''

        const resultHtml = toHtmlContent(extracted)
        const fallbackHtml = fallbackSource ? toHtmlContent(fallbackSource) : ''
        const resultPlain = toPlainText(resultHtml)
        const fallbackPlain = toPlainText(fallbackHtml)
        const shouldUseFallback =
            minRetentionRatio > 0 &&
            !!fallbackPlain &&
            resultPlain.length < fallbackPlain.length * minRetentionRatio

        let html = shouldUseFallback ? fallbackHtml : resultHtml

        if (beautifyOptions.includeMermaid) {
            html = transformMermaidCodeBlocks(html)
        } else {
            html = html
                .replace(/<pre[^>]*class=["'][^"']*\bmermaid\b[^"']*["'][^>]*>[\s\S]*?<\/pre>/gi, '')
                .replace(/```mermaid[\s\S]*?```/gi, '')
        }

        const enhanced = ensureBeautifyFeatures(html, beautifyOptions)
        return sanitizeHtml(enhanced)
    }, [beautifyOptions, ensureBeautifyFeatures, toHtmlContent, toPlainText])

    const generateWithAI = async (action: 'outline' | 'expand' | 'improve' | 'summarize') => {
        if (action === 'outline' && !formData.title && !formData.content) {
            toast.error(t('editor.alerts.title_required'))
            return
        }
        if ((action === 'expand' || action === 'improve' || action === 'summarize') && !formData.content) {
            toast.error(t('editor.write_placeholder'))
            return
        }

        setIsGenerating(true)
        try {
            let result: string | null = null

            // Content generation actions (outline, expand, improve)
            if (action === 'outline') {
                const outlineSeed = formData.content?.trim()
                    ? `Create a structured outline from this content with clear sections, numbered steps, and callout-worthy highlights:\n\n${formData.content}`
                    : `Create a detailed outline for this article topic: ${formData.title}`

                // Using any cast to bypass type checking if methods are missing in definition but present in runtime
                // or just relying on updating gemini.ts later.
                result = await (aiService as any).improveContent(outlineSeed, 'expand', aiLanguage, 'html', beautifyOptions)
            } else if (action === 'expand') {
                result = await (aiService as any).improveContent(formData.content, 'expand', aiLanguage, 'html', beautifyOptions)
            } else if (action === 'improve') {
                result = await (aiService as any).improveContent(formData.content, 'professional', aiLanguage, 'html', beautifyOptions)
            } else if (action === 'summarize') {
                // Build language instruction based on selection
                const langInstruction = aiLanguage === 'Arabic'
                    ? 'IMPORTANT: Write your response in ARABIC ONLY. لا تستخدم اللغة الإنجليزية.'
                    : aiLanguage === 'English and Arabic'
                        ? 'IMPORTANT: Write your response in BOTH English AND Arabic. First write in English, then provide the Arabic translation below it.'
                        : 'IMPORTANT: Write your response in ENGLISH ONLY. Do not use any other language.'

                // Generate BOTH summary and description from content
                // Summary: 2-3 sentence overview of key points
                const summaryResult = await aiService.improveContent(
                    `Read this hotel policy/SOP document and write a 2-3 sentence summary that captures: 1) What this document is for, 2) Who it applies to, 3) The key requirement or procedure. Be specific and professional.

${langInstruction}

DOCUMENT:
${formData.content.substring(0, 4000)}

Write ONLY the summary, no labels or prefixes.`,
                    'shorten',
                    aiLanguage
                )
                if (summaryResult) {
                    updateField('summary', extractTextFromAiResponse(summaryResult))
                }

                // Description: Short tagline/subtitle style (max 15 words)
                const descResult = await aiService.improveContent(
                    `Create a SHORT tagline (maximum 10-15 words) for this document. It should be like a subtitle that appears under the title. Do NOT write a full sentence - just a brief phrase.

${langInstruction}

DOCUMENT TITLE: ${formData.title}
CONTENT PREVIEW: ${formData.content.substring(0, 1000)}

Write ONLY the tagline, no quotes or labels.
${aiLanguage === 'English' ? 'Example: "Step-by-step procedures for handling guest complaints"' : ''}
${aiLanguage === 'Arabic' ? 'مثال: "إجراءات التعامل مع شكاوى النزلاء"' : ''}`,
                    'shorten',
                    aiLanguage
                )
                if (descResult) {
                    // Clean up any quotes the AI might add
                    let cleanDesc = extractTextFromAiResponse(descResult).replace(/^["']|["']$/g, '').trim()

                    // Only filter non-ASCII if English-only mode (to remove Chinese mistakes)
                    if (aiLanguage === 'English') {
                        cleanDesc = cleanDesc.replace(/[^\x00-\x7F]/g, '').trim()
                    }
                    updateField('description', cleanDesc)
                }

                toast.success('Summary and description generated!')
                setIsGenerating(false)
                return
            }

            // For content actions only - just update content
            if (result) {
                const sourceForRetention = action === 'outline' ? undefined : formData.content
                const minRetentionRatio = action === 'outline' ? 0 : 0.4
                const preparedHtml = finalizeAiHtmlForEditor(result, sourceForRetention, minRetentionRatio)
                if (preparedHtml) {
                    updateField('content', preparedHtml)
                }
            }
            toast.success(t('editor.alerts.ai_success'))
        } catch (error) {
            toast.error(t('editor.alerts.ai_failed'))
        } finally {
            setIsGenerating(false)
        }
    }

    const beautifyArticle = async () => {
        if (!formData.content || formData.content.trim().length < 10) {
            toast.error('Please add some content before beautifying.')
            return
        }

        setIsGenerating(true)
        try {
            // Using cast to any because beautifyArticle is missing in current gemini.ts definition
            const result = await (aiService as any).beautifyArticle(
                formData.content,
                formData.content_type,
                aiLanguage,
                'professional',
                beautifyOptions
            )

            if (result) {
                const preparedHtml = finalizeAiHtmlForEditor(result, formData.content, 0.6)
                if (!preparedHtml) {
                    toast.error('AI beautification returned empty content. Please try again.')
                    return
                }

                updateField('content', preparedHtml)
                toast.success('Content beautified with AI. Existing options were applied.')
            } else {
                toast.error('AI beautification failed. Please try again.')
            }
        } catch (error) {
            console.error('AI beautification error:', error)
            toast.error('AI beautification failed. Please try again.')
        } finally {
            setIsGenerating(false)
        }
    }

    return {
        isGenerating,
        aiLanguage,
        setAiLanguage,
        beautifyOptions,
        setBeautifyOptions,
        generateWithAI,
        beautifyArticle,
        ensureBeautifyFeatures // Exporting in case used elsewhere, though internal usage is covered
    }
}
