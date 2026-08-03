/**
 * Shared free-text answer matching for fill_blank / scenario (no-options) questions.
 * Normalizes punctuation/whitespace/case so "15 mins" matches "15 minutes." and
 * checks the user's answer against correct_answer plus any accepted_answers alternates.
 */

export function normalizeFreeTextAnswer(value?: string | null): string {
    return (value || '')
        .toLowerCase()
        .trim()
        .replace(/[.,!?;:'"`]/g, '')
        .replace(/\s+/g, ' ')
}

export function isFreeTextAnswerCorrect(
    userAnswer: string | undefined | null,
    correctAnswer: string | undefined | null,
    acceptedAnswers?: string[] | null
): boolean {
    const normalizedUser = normalizeFreeTextAnswer(userAnswer)
    if (!normalizedUser) return false

    const candidates = [correctAnswer, ...(acceptedAnswers || [])]
    return candidates.some(candidate => normalizeFreeTextAnswer(candidate) === normalizedUser)
}
