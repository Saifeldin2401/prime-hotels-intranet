function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export function transformMermaidCodeBlocks(html: string): string {
    if (!html) return ''

    // Convert marked output: <pre><code class="language-mermaid">...</code></pre>
    // or variations to simple: <pre class="mermaid">...</pre>
    return html.replace(
        /<pre[^>]*>\s*<code[^>]*class=["']?[^"']*(?:language-mermaid|mermaid)[^"']*["']?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
        (_m, code) => {
            const decoded = String(code)
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&')
            // Re-escape before interpolation to avoid injecting raw HTML.
            return `<pre class="mermaid">${escapeHtml(decoded.trim())}</pre>`
        }
    )
}

const renderLocks = new WeakMap<HTMLElement, Promise<void>>()
let mermaidInitialized = false

export async function renderMermaidDiagrams(container: HTMLElement | null): Promise<void> {
    if (!container) return

    const existing = renderLocks.get(container)
    if (existing) {
        await existing
        return
    }

    const run = (async () => {
        const nodes = Array.from(container.querySelectorAll('pre.mermaid, .mermaid, .mermaid-diagram'))
        if (nodes.length === 0) return

        const mermaidModule = await import('mermaid')
        const mermaid = mermaidModule.default

        if (!mermaidInitialized) {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'strict',
                fontFamily: 'Inter, system-ui, sans-serif',
                // Avoid DOM/foreignObject label measurement issues that can throw getBoundingClientRect null
                flowchart: { useMaxWidth: true, htmlLabels: false },
                sequence: { useMaxWidth: true },
            })
            mermaidInitialized = true
        }

        for (let idx = 0; idx < nodes.length; idx += 1) {
            const el = nodes[idx]
            const host = el as HTMLElement

            // Avoid re-rendering
            if (host.classList.contains('mermaid-rendered')) continue
            if (host.querySelector('svg')) {
                host.classList.add('mermaid-rendered')
                continue
            }

            let code = host.textContent || ''

            // Robust entity decoding
            code = code
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&')
                .trim()

            if (!code || (!code.startsWith('graph') && !code.startsWith('flowchart') && !code.startsWith('sequenceDiagram'))) {
                // If it doesn't look like mermaid, maybe it's just a class collision, skip
                continue
            }

            try {
                const id = `mermaid-v11-${Date.now()}-${idx}`

                // For v11, providing the element as third arg helps with style scoping
                const { svg } = await mermaid.render(id, code, host)

                if (svg) {
                    host.innerHTML = sanitizeSvg(svg)
                    host.classList.add('mermaid-rendered')

                    // CRITICAL: Overwrite any parent styles that might hide the diagram
                    host.style.display = 'block'
                    host.style.visibility = 'visible'
                    host.style.opacity = '1'
                    host.style.minHeight = '250px' // Ensure it's not collapsed
                    host.style.setProperty('width', '100%')
                    host.style.setProperty('max-width', '100%')
                    host.style.setProperty('height', 'auto')
                    host.style.setProperty('overflow', 'visible')
                    host.style.backgroundColor = 'transparent'
                    host.style.border = 'none'
                    host.style.padding = '0'
                    host.style.margin = '20px 0'

                    // In some environments, the SVG itself might need a kick
                    const svgEl = host.querySelector('svg')
                    if (svgEl) {
                        svgEl.style.maxWidth = '100%'
                        svgEl.style.height = 'auto'
                        svgEl.style.display = 'block'
                        svgEl.style.margin = '0 auto'
                    }
                }
            } catch (err) {
                console.error(`[Mermaid] Failed to hydrate diagram ${idx}:`, err)
                host.classList.add('mermaid-failed')
                // Don't modify innerHTML if it fails, so text stays visible as fallback
            }
        }
    })()

    renderLocks.set(container, run)
    try {
        await run
    } finally {
        renderLocks.delete(container)
    }
}
import { sanitizeSvg } from '@/lib/sanitize'
