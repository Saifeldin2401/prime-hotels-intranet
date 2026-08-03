import { describe, expect, it } from 'vitest'
import {
    decodeMatchingAnswer,
    encodeMatchingAnswer,
    isMatchingAnswerCorrect,
    isOrderingAnswerCorrect
} from './questionOrderingMatching'

describe('isOrderingAnswerCorrect', () => {
    const options = [
        { id: 'a', display_order: 2 },
        { id: 'b', display_order: 1 },
        { id: 'c', display_order: 3 }
    ]

    it('accepts the answer when submitted in display_order sequence', () => {
        expect(isOrderingAnswerCorrect(['b', 'a', 'c'], options)).toBe(true)
    })

    it('rejects a wrong sequence', () => {
        expect(isOrderingAnswerCorrect(['a', 'b', 'c'], options)).toBe(false)
    })

    it('rejects an incomplete sequence', () => {
        expect(isOrderingAnswerCorrect(['b', 'a'], options)).toBe(false)
    })

    it('rejects an empty/undefined answer', () => {
        expect(isOrderingAnswerCorrect(undefined, options)).toBe(false)
        expect(isOrderingAnswerCorrect([], options)).toBe(false)
    })
})

describe('matching answer encode/decode', () => {
    it('round-trips a mapping through JSON', () => {
        const mapping = { opt1: 'Bleach', opt2: 'Stainless steel' }
        expect(decodeMatchingAnswer(encodeMatchingAnswer(mapping))).toEqual(mapping)
    })

    it('decodes an undefined/invalid value as an empty object', () => {
        expect(decodeMatchingAnswer(undefined)).toEqual({})
        expect(decodeMatchingAnswer('not json')).toEqual({})
    })
})

describe('isMatchingAnswerCorrect', () => {
    const options = [
        { id: 'opt1', match_value: 'Stainless steel surfaces' },
        { id: 'opt2', match_value: 'Wooden surfaces' }
    ]

    it('accepts a fully correct mapping', () => {
        const answer = encodeMatchingAnswer({ opt1: 'Stainless steel surfaces', opt2: 'Wooden surfaces' })
        expect(isMatchingAnswerCorrect(answer, options)).toBe(true)
    })

    it('rejects a partially wrong mapping', () => {
        const answer = encodeMatchingAnswer({ opt1: 'Wooden surfaces', opt2: 'Wooden surfaces' })
        expect(isMatchingAnswerCorrect(answer, options)).toBe(false)
    })

    it('rejects an incomplete mapping', () => {
        const answer = encodeMatchingAnswer({ opt1: 'Stainless steel surfaces' })
        expect(isMatchingAnswerCorrect(answer, options)).toBe(false)
    })

    it('rejects an undefined answer', () => {
        expect(isMatchingAnswerCorrect(undefined, options)).toBe(false)
    })
})
