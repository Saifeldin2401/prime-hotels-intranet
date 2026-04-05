import { isAllowedDirection, sanitizeClassNameList } from '@/lib/aiHtml';
import DOMPurify from 'dompurify';

let hooksInitialized = false

// Trusted video embed domains for iframe src validation
const TRUSTED_IFRAME_ORIGINS = [
    'https://www.youtube.com',
    'https://youtube.com',
    'https://www.youtube-nocookie.com',
    'https://player.vimeo.com',
    'https://vimeo.com',
    'https://htsvjfrofcpkfzvjpwvx.supabase.co', // Added Supabase project URL
]

function ensureHooksInitialized() {
    if (hooksInitialized) return

    // Secure anchor tags opened in new tabs
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node instanceof Element) {
            const sanitizedClassName = sanitizeClassNameList(node.getAttribute('class'))
            if (sanitizedClassName) node.setAttribute('class', sanitizedClassName)
            else node.removeAttribute('class')

            const dir = node.getAttribute('dir')
            if (!isAllowedDirection(dir)) node.removeAttribute('dir')
        }

        if (node instanceof HTMLAnchorElement) {
            const target = node.getAttribute('target')
            if (target === '_blank') {
                const existingRel = node.getAttribute('rel')
                const relParts = new Set((existingRel || '').split(' ').map(s => s.trim()).filter(Boolean))
                relParts.add('noopener')
                relParts.add('noreferrer')
                node.setAttribute('rel', Array.from(relParts).join(' '))
            }
        }

        // Validate iframe src — only allow trusted video embed origins
        if (node instanceof HTMLIFrameElement) {
            const src = node.getAttribute('src') || ''
            const isTrusted = TRUSTED_IFRAME_ORIGINS.some(origin => src.startsWith(origin))
            if (!isTrusted) {
                node.remove()
            } else {
                // Enforce safe sandbox attributes
                node.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture')
                node.setAttribute('allowfullscreen', '')
                node.setAttribute('loading', 'lazy')
            }
        }
    })

    hooksInitialized = true
}

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Uses DOMPurify to strip dangerous attributes and tags.
 * Allows safe rich media: images, YouTube/Vimeo iframes, figures, tables.
 *
 * @param html The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
    if (!html) return '';

    ensureHooksInitialized()

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            // Text structure
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'blockquote', 'pre', 'code', 'hr', 'br',
            'div', 'span', 'details', 'summary', 'nl',
            'nav', 'section', 'article', 'header', 'footer', 'main', 'aside',
            // Inline formatting
            'b', 'i', 'strong', 'em', 'strike', 'u', 'mark', 'sub', 'sup',
            // Lists
            'ul', 'ol', 'li',
            // Links
            'a',
            // Tables
            'table', 'thead', 'tbody', 'tfoot', 'caption', 'tr', 'th', 'td', 'colgroup', 'col',
            // Media
            'img', 'figure', 'figcaption',
            // Video (direct files)
            'video', 'source',
            // Video embeds (YouTube/Vimeo) — validated in hook above
            'iframe',
        ],
        ALLOWED_ATTR: [
            // Universal
            'id', 'class', 'dir', 'lang', 'title',
            // NOTE: 'style' removed to prevent CSS-based XSS attacks
            // Links, images & videos
            'href', 'src', 'alt', 'name', 'target', 'rel', 'type',
            // Images & videos
            'width', 'height', 'loading',
            'data-width', 'data-align',
            // Video specific
            'controls', 'poster', 'preload', 'autoplay', 'muted', 'loop', 'playsinline',
            // Iframes
            'allow', 'allowfullscreen', 'frameborder', 'scrolling',
            // Tables
            'colspan', 'rowspan', 'scope', 'align',
        ],
        // Allow data URIs for images only (legacy base64 images still render)
        ALLOW_DATA_ATTR: false,
        ADD_TAGS: ['iframe', 'video', 'source'],
        ADD_ATTR: ['allowfullscreen', 'allow', 'loading', 'controls', 'poster', 'preload', 'autoplay', 'muted', 'loop', 'playsinline'],
    });
};

/**
 * Sanitizes SVG content (used for Mermaid output).
 * Keeps the SVG profile while stripping scripts/foreignObject.
 */
export const sanitizeSvg = (svg: string | null | undefined): string => {
    if (!svg) return ''

    ensureHooksInitialized()

    return DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ['foreignObject', 'script'],
        ADD_ATTR: ['class', 'style', 'xlink:href'],
    })
}
