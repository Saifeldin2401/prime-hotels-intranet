/**
 * useCertificates Hook - React hook for certificate management
 * 
 * Provides:
 * - Fetch user certificates
 * - Generate PDF on demand
 * - Download certificates
 * - Verify certificates
 */

import { useAuth } from '@/hooks/useAuth'
import {
    generateCertificatePDF,
    getCertificate,
    getUserCertificates,
    loadLogoAsDataUrl,
    logCertificateAction,
    mapCertificateFromDb,
    verifyCertificate
} from '@/services/certificateService'
import { supabase } from '@/lib/supabase'
import { showErrorToast, showSuccessToast } from '@/lib/toastHelpers'
import { useMutation, useQuery } from '@tanstack/react-query'

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
 * Fetch all certificates (admin view)
 */
export function useAllCertificates() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['certificates', 'all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('certificates')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data.map(mapCertificateFromDb)
        },
        enabled: !!user?.id
    })
}

/**
 * Look up an organization's uploaded logo, for on-screen certificate previews that
 * render their own <img> (e.g. TrainingCertificates.tsx's print/preview dialog) rather
 * than going through generateCertificatePDF()'s own logo resolution.
 */
export function useOrganizationLogo(organizationId?: string | null) {
    return useQuery({
        queryKey: ['organization-logo', organizationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('organizations')
                .select('logo_url')
                .eq('id', organizationId!)
                .maybeSingle()
            if (error) throw error
            return data?.logo_url || null
        },
        enabled: !!organizationId,
        staleTime: 5 * 60 * 1000
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

            // Load logo for PDF -- prefers the issuing tenant's own uploaded logo
            // (certificate.organizationId, now populated by mapCertificateFromDb),
            // falling back to the ALTUS default when the tenant has none set.
            const logoDataUrl = await loadLogoAsDataUrl(certificate.organizationId)

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
