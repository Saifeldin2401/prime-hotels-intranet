function splitPlainText(value: string, maxChars: number) {
    const safeMax = Math.max(500, Math.floor(maxChars))
    const chunks: string[] = []
    let remaining = value.trim()

    while (remaining.length > safeMax) {
        const slice = remaining.slice(0, safeMax)
        const candidates = [
            slice.lastIndexOf('\n\n'),
            slice.lastIndexOf('\n'),
            slice.lastIndexOf('. '),
            slice.lastIndexOf('! '),
            slice.lastIndexOf('? '),
            slice.lastIndexOf(' '),
        ].filter(index => index >= Math.floor(safeMax * 0.5))

        const breakIndex = candidates.length > 0 ? Math.max(...candidates) : -1
        const cutIndex = breakIndex >= 0 ? breakIndex + 1 : safeMax
        chunks.push(remaining.slice(0, cutIndex).trim())
        remaining = remaining.slice(cutIndex).trim()
    }

    if (remaining) {
        chunks.push(remaining)
    }

    return chunks
}

export function normalizeTranslationErrorMessage(message: string) {
    const trimmed = (message || '').trim()
    if (!trimmed) return 'Translation failed'

    if (trimmed.includes('502 Bad Gateway')) {
        return 'Translation service timed out while processing this content. Please retry.'
    }

    if (trimmed.startsWith('<html') || trimmed.startsWith('<!doctype html')) {
        return 'Translation service returned an invalid upstream response. Please retry.'
    }

    return trimmed.replace(/\s+/g, ' ').slice(0, 240)
}
