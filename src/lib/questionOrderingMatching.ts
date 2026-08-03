/**
 * Grading + answer encoding helpers for the 'ordering' and 'matching' question types.
 *
 * ordering: the correct answer is unified_question_options sorted by display_order.
 * matching: each option is one pair (option_text = left/prompt, match_value = right/answer);
 * the user's answer is encoded as a JSON string mapping optionId -> chosen right-hand value.
 */

export function isOrderingAnswerCorrect(
    selectedOrderIds: string[] | undefined,
    options: Array<{ id: string; display_order: number }> | undefined
): boolean {
    if (!selectedOrderIds || selectedOrderIds.length === 0) return false

    const correctOrder = [...(options || [])]
        .sort((a, b) => a.display_order - b.display_order)
        .map(o => o.id)

    if (correctOrder.length === 0 || selectedOrderIds.length !== correctOrder.length) return false
    return correctOrder.every((id, idx) => selectedOrderIds[idx] === id)
}

export function encodeMatchingAnswer(mapping: Record<string, string>): string {
    return JSON.stringify(mapping)
}

export function decodeMatchingAnswer(value: string | undefined): Record<string, string> {
    if (!value) return {}
    try {
        const parsed: unknown = JSON.parse(value)
        return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {}
    } catch {
        return {}
    }
}

export function isMatchingAnswerCorrect(
    selectedAnswer: string | undefined,
    options: Array<{ id: string; match_value?: string | null }> | undefined
): boolean {
    const mapping = decodeMatchingAnswer(selectedAnswer)
    const relevantOptions = (options || []).filter(o => !!o.match_value)

    if (relevantOptions.length === 0) return false
    if (Object.keys(mapping).length !== relevantOptions.length) return false

    return relevantOptions.every(o => {
        const selected = mapping[o.id]
        return typeof selected === 'string' && selected.trim() === (o.match_value || '').trim()
    })
}
