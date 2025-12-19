/**
 * useCertificates Hook - React hook for certificate management
 * 
 * Provides:
 * - Fetch user certificates
 * - Generate PDF on demand
 * - Download certificates
 * - Verify certificates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import {
    createCertificate,
    getCertificate,
    getUserCertificates,
    generateCertificatePDF,
    verifyCertificate,
    logCertificateAction,
    revokeCertificate,
    loadLogoAsDataUrl,
    type CertificateData,
    type Certificate
} from '@/lib/certificateService'
import { showSuccessToast, showErrorToast } from '@/lib/toastHelpers'

/**
 * Fetch all certificates for the current user
 */
export function useMyCertificates() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['certificates', 'my', user?.id],
        queryFn: () => getUserCertificates(user!.id),
        enabled: !!user?.id
    })
}

/**
 * Fetch certificates for any user (admin view)
 */
export function useUserCertificates(userId?: string) {
    return useQuery({
        queryKey: ['certificates', 'user', userId],
        queryFn: () => getUserCertificates(userId!),
        enabled: !!userId
    })
}

/**
 * Fetch a single certificate
 */
export function useCertificate(certificateId?: string) {
    return useQuery({
        queryKey: ['certificate', certificateId],
        queryFn: () => getCertificate(certificateId!),
        enabled: !!certificateId
    })
}

/**
 * Create a new certificate
 */
export function useCreateCertificate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: CertificateData) => {
            const certificate = await createCertificate(data)
            if (!certificate) {
                throw new Error('Failed to create certificate')
            }
            return certificate
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['certificates'] })
            showSuccessToast('Certificate created successfully')
            return data
        },
        onError: (error) => {
            showErrorToast('Failed to create certificate')
            console.error('Certificate creation error:', error)
        }
    })
}

/**
 * Generate and download a certificate PDF
 */
export function useDownloadCertificate() {
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (certificateId: string) => {
            // Fetch the certificate
            const certificate = await getCertificate(certificateId)
            if (!certificate) {
                throw new Error('Certificate not found')
            }

            // Check if certificate is valid
            if (certificate.status !== 'active') {
                throw new Error(`Certificate is ${certificate.status}`)
            }

            // Load logo for PDF
            const logoDataUrl = await loadLogoAsDataUrl()

            // Generate PDF
            const pdfBlob = await generateCertificatePDF(certificate, logoDataUrl || undefined)

            // Log the download action
            await logCertificateAction(certificateId, 'downloaded', user?.id)

            // Trigger download
            const url = URL.createObjectURL(pdfBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${certificate.certificateNumber}-${certificate.recipientName.replace(/\s+/g, '_')}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            return certificate
        },
        onSuccess: () => {
            showSuccessToast('Certificate downloaded successfully')
        },
        onError: (error) => {
            showErrorToast(`Failed to download: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    })
}

/**
 * View certificate (logs view action)
 */
export function useViewCertificate() {
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (certificateId: string) => {
            const certificate = await getCertificate(certificateId)
            if (certificate) {
                await logCertificateAction(certificateId, 'viewed', user?.id)
            }
            return certificate
        }
    })
}

/**
 * Verify a certificate
 */
export function useVerifyCertificate() {
    return useMutation({
        mutationFn: async (verificationCode: string) => {
            const result = await verifyCertificate(verificationCode)
            return result
        }
    })
}

/**
 * Revoke a certificate (admin action)
 */
export function useRevokeCertificate() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({ certificateId, reason }: { certificateId: string; reason: string }) => {
            if (!user?.id) throw new Error('Must be authenticated')
            const success = await revokeCertificate(certificateId, reason, user.id)
            if (!success) throw new Error('Failed to revoke certificate')
            return success
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['certificates'] })
            showSuccessToast('Certificate revoked')
        },
        onError: (error) => {
            showErrorToast(`Failed to revoke: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    })
}

/**
 * Hook to generate certificate on training completion
 */
export function useGenerateTrainingCertificate() {
    const queryClient = useQueryClient()
    const { user, profile } = useAuth()

    return useMutation({
        mutationFn: async ({
            trainingModule,
            progress,
            score
        }: {
            trainingModule: { id: string; title: string; }
            progress: { id: string }
            score?: number
        }) => {
            if (!user?.id || !profile) {
                throw new Error('User must be authenticated')
            }

            const certificateData: CertificateData = {
                userId: user.id,
                recipientName: profile.full_name || user.email || 'Participant',
                recipientEmail: user.email,
                certificateType: 'training',
                title: trainingModule.title,
                completionDate: new Date(),
                score: score,
                trainingModuleId: trainingModule.id,
                trainingProgressId: progress.id
            }

            const certificate = await createCertificate(certificateData)
            return certificate
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['certificates'] })
            showSuccessToast('🎓 Certificate generated!')
        }
    })
}

/**
 * Hook to generate certificate on SOP quiz pass
 */
export function useGenerateSOPCertificate() {
    const queryClient = useQueryClient()
    const { user, profile } = useAuth()

    return useMutation({
        mutationFn: async ({
            sop,
            quizAttempt,
            score,
            passingScore
        }: {
            sop: { id: string; title: string }
            quizAttempt: { id: string }
            score: number
            passingScore: number
        }) => {
            if (!user?.id || !profile) {
                throw new Error('User must be authenticated')
            }

            // Only generate if passed
            if (score < passingScore) {
                throw new Error('Quiz not passed - certificate not generated')
            }

            const certificateData: CertificateData = {
                userId: user.id,
                recipientName: profile.full_name || user.email || 'Participant',
                recipientEmail: user.email,
                certificateType: 'sop_quiz',
                title: `${sop.title} - SOP Certification`,
                completionDate: new Date(),
                score: score,
                passingScore: passingScore,
                sopId: sop.id,
                quizAttemptId: quizAttempt.id
            }

            const certificate = await createCertificate(certificateData)
            return certificate
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['certificates'] })
            showSuccessToast('🎓 Certificate generated!')
        },
        onError: (error) => {
            if (error instanceof Error && error.message.includes('not passed')) {
                // Don't show error for expected non-pass scenario
                return
            }
            showErrorToast('Failed to generate certificate')
        }
    })
}

export type { Certificate, CertificateData }
