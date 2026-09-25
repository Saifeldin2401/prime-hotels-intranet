import { describe, expect, it, beforeAll } from 'vitest'
import i18n from '@/i18n/i18n'
import { getUserFriendlyError } from './errorMessages'
import { CertificateIssueError } from '@/services/certificateService'

describe('getUserFriendlyError - server rule codes', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('en')
    })

    it('maps a PostgREST error carrying a rule code in HINT to the translated message', () => {
        const result = getUserFriendlyError({
            code: '42501',
            message: 'You cannot issue a certificate to yourself',
            hint: 'CERT_SELF_ISSUE',
        })
        expect(result.code).toBe('CERT_SELF_ISSUE')
        expect(result.message).toBe(i18n.t('errors:rules.CERT_SELF_ISSUE'))
        expect(result.retryable).toBe(false)
    })

    it('uses the server message when no translation exists for the code', () => {
        const result = getUserFriendlyError({
            code: 'P0001',
            message: 'Seat limit reached for this plan',
            hint: 'ORG_SEAT_LIMIT_TEST_ONLY',
        })
        expect(result.code).toBe('ORG_SEAT_LIMIT_TEST_ONLY')
        expect(result.message).toBe('Seat limit reached for this plan')
    })

    it('understands CertificateIssueError thrown by the certificate service', () => {
        const result = getUserFriendlyError(new CertificateIssueError('server text', 'CERT_PATH_INCOMPLETE'))
        expect(result.message).toBe(i18n.t('errors:rules.CERT_PATH_INCOMPLETE'))
    })

    it('translates rule codes in Arabic', async () => {
        await i18n.changeLanguage('ar')
        const result = getUserFriendlyError({ code: '42501', message: 'x', hint: 'CERT_NOT_ALLOWED' })
        expect(result.message).toBe(i18n.t('errors:rules.CERT_NOT_ALLOWED', { lng: 'ar' }))
        expect(result.message).not.toBe('x')
        await i18n.changeLanguage('en')
    })

    it('does not treat Postgres SQLSTATE codes as rule codes', () => {
        const result = getUserFriendlyError({ code: '23505', message: 'duplicate key value' })
        expect(result.code).toBe('23505')
        expect(result.message).toMatch(/already exists/i)
    })

    it('maps Phase 4 business rule codes correctly in English and Arabic', async () => {
        await i18n.changeLanguage('en')
        const enCourse = getUserFriendlyError({ code: '42501', hint: 'COURSE_SELF_APPROVAL' })
        expect(enCourse.message).toBe(i18n.t('errors:rules.COURSE_SELF_APPROVAL'))

        const enAssign = getUserFriendlyError({ code: 'P0001', hint: 'ASSIGN_COURSE_NOT_PUBLISHED' })
        expect(enAssign.message).toBe(i18n.t('errors:rules.ASSIGN_COURSE_NOT_PUBLISHED'))

        await i18n.changeLanguage('ar')
        const arCourse = getUserFriendlyError({ code: '42501', hint: 'COURSE_SELF_APPROVAL' })
        expect(arCourse.message).toBe(i18n.t('errors:rules.COURSE_SELF_APPROVAL', { lng: 'ar' }))

        await i18n.changeLanguage('en')
    })
})
