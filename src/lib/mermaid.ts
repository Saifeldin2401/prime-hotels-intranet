export function transformMermaidCodeBlocks(html: string): string {
    if (!html) return ''

    // Convert marked output: <pre><code class="language-mermaid">...</code></pre>
    // or variations to simple: <pre class="mermaid">...</pre>
    return html.replace(
        /<pre[^>]*>\s*<code[^>]*class=["']?[^"']*(?:language-mermaid|mermaid)[^"']*["']?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
        (_m, code) => {
            const decoded = String(code)
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
            return `<pre class="mermaid">${decoded.trim()}</pre>`
        }
    )
}

const renderLocks = new WeakMap<HTMLElement, Promise<void>>()

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

        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'strict',
            fontFamily: 'Inter, system-ui, sans-serif',
            // Avoid DOM/foreignObject label measurement issues that can throw getBoundingClientRect null
            flowchart: { useMaxWidth: true, htmlLabels: false },
            sequence: { useMaxWidth: true },
        })

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
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim()

            if (!code || (!code.startsWith('graph') && !code.startsWith('flowchart') && !code.startsWith('sequenceDiagram'))) {
                // If it doesn't look like mermaid, maybe it's just a class collision, skip
                continue
            }

            try {
                const id = `mermaid-v11-${Date.now()}-${idx}`
                console.log(`[Mermaid] Hydrating diagram ${idx}. Host: <${host.tagName.toLowerCase()}>, Text length: ${code.length}`)

                // For v11, providing the element as third arg helps with style scoping
                const { svg } = await mermaid.render(id, code, host)

                if (svg) {
                    console.log(`[Mermaid] Render success for [${idx}]. Injecting SVG...`)
                    host.innerHTML = svg
                    host.classList.add('mermaid-rendered')

                    // CRITICAL: Overwrite any parent styles that might hide the diagram
                    host.style.display = 'block'
                    host.style.visibility = 'visible'
                    host.style.opacity = '1'
                    host.style.minHeight = '250px' // Ensure it's not collapsed
                    host.style.width = '100% !important'
                    host.style.maxWidth = '100% !important'
                    host.style.height = 'auto !important'
                    host.style.overflow = 'visible !important'
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

                    console.log(`[Mermaid] Diagram ${idx} fully visible.`)
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
