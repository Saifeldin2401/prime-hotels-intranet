import DOMPurify from 'dompurify';

let hooksInitialized = false

function ensureHooksInitialized() {
    if (hooksInitialized) return
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
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
    })
    hooksInitialized = true
}

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Uses DOMPurify to strip dangerous attributes and tags.
 * 
 * @param html The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
    if (!html) return '';

    ensureHooksInitialized()

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'blockquote', 'p', 'a', 'ul', 'ol', 'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
            'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img', 'span', 'details', 'summary'
        ],
        ALLOWED_ATTR: [
            'href', 'name', 'target', 'src', 'alt', 'title', 'class', 'style', 'id', 'dir'
        ]
    });
};
