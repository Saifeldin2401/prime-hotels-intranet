/**
 * Certificate Service - Enterprise-grade PDF certificate generation
 * 
 * Features:
 * - High-quality PDF generation using jsPDF
 * - Altus Advisory branded certificates
 * - Unique certificate numbers and verification codes
 * - Dynamic content population
 * - Audit trail integration
 */

import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'
import { buildCertificateHtml, CERTIFICATE_TEMPLATE_STYLES, CERTIFICATE_HEIGHT_PX, CERTIFICATE_WIDTH_PX } from '@/lib/certificateTemplate'

export interface CertificateData {
    // Recipient
    recipientName: string
    recipientEmail?: string
    userId: string

    // Certificate content
    certificateType: 'training' | 'sop_quiz' | 'compliance' | 'achievement'
    title: string
    description?: string
    completionDate: Date
    expiryDate?: Date
    score?: number
    passingScore?: number

    // Source references
    trainingModuleId?: string
    trainingProgressId?: string
    sopId?: string
    quizAttemptId?: string

    // Context
    propertyId?: string
    propertyName?: string
    departmentId?: string
    departmentName?: string
    issuedBy?: string
    issuedByName?: string
    metadata?: Record<string, unknown>
}

export interface Certificate extends CertificateData {
    id: string
    certificateNumber: string
    verificationCode: string
    status: 'active' | 'revoked' | 'expired' | 'superseded'
    pdfUrl?: string
    createdAt: Date
}

type TrainingProgressSnapshot = {
    id: string
    training_id: string
    quiz_score: number | null
}

type CertificateRecord = {
    id: string
    certificate_number: string
    verification_code: string
    user_id: string
    recipient_name: string
    recipient_email?: string | null
    certificate_type: string
    title: string
    description?: string | null
    completion_date: string
    expiry_date?: string | null
    score?: number | null
    passing_score?: number | null
    training_module_id?: string | null
    training_progress_id?: string | null
    sop_id?: string | null
    quiz_attempt_id?: string | null
    property_id?: string | null
    department_id?: string | null
    issued_by?: string | null
    status: string
    pdf_url?: string | null
    created_at: string
    metadata?: {
        propertyName?: string
        departmentName?: string
        issuedByName?: string
    } | null
}

function resolveCertificateStatus(
    status: string | null | undefined,
    expiryDate: string | Date | null | undefined
): Certificate['status'] {
    const normalizedStatus = (status || 'active') as Certificate['status']
    if (normalizedStatus !== 'active' || !expiryDate) {
        return normalizedStatus
    }

    const expiryTime = expiryDate instanceof Date
        ? expiryDate.getTime()
        : new Date(expiryDate).getTime()

    if (!Number.isFinite(expiryTime)) {
        return normalizedStatus
    }

    return expiryTime <= Date.now() ? 'expired' : normalizedStatus
}

const CERTIFICATE_VERIFY_URL = import.meta.env.VITE_CERTIFICATE_VERIFY_URL || 'altus-advisory.com/verify'

/**
 * Generate a luxury enterprise PDF certificate.
 *
 * Renders the premium HTML/CSS template (src/lib/certificateTemplate.ts) off-screen and
 * rasterizes it to an A4-landscape PDF via html2pdf.js. This replaced the previous jsPDF
 * vector-drawing implementation, which couldn't express custom display typography, layered
 * gradients, or a real CSS Grid layout.
 */
export async function generateCertificatePDF(
    certificate: Certificate,
    logoDataUrl?: string
): Promise<Blob> {
    const qrDataUrl = await createQRCodeDataUrl(`https://${CERTIFICATE_VERIFY_URL}?code=${certificate.verificationCode}`)

    const html = buildCertificateHtml({
        recipientName: certificate.recipientName,
        title: certificate.title,
        completionDateLabel: formatDate(certificate.completionDate),
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode,
        verifyUrl: CERTIFICATE_VERIFY_URL,
        score: certificate.score,
        passingScore: certificate.passingScore,
        issuedByName: certificate.issuedByName,
        logoDataUrl,
        qrDataUrl: qrDataUrl || undefined
    })

    let styleEl: HTMLStyleElement | null = null
    let container: HTMLDivElement | null = null

    try {
        styleEl = document.createElement('style')
        styleEl.textContent = CERTIFICATE_TEMPLATE_STYLES
        document.head.appendChild(styleEl)

        container = document.createElement('div')
        container.style.position = 'fixed'
        container.style.left = '-99999px'
        container.style.top = '0'
        container.innerHTML = html
        document.body.appendChild(container)

        const renderElement = container.firstElementChild as HTMLElement | null
        if (!renderElement) throw new Error('Failed to prepare certificate for rendering')

        // Let @font-face requests for the display fonts settle before html2canvas
        // rasterizes text, or the PDF can be captured with fallback system fonts.
        if (document.fonts?.ready) {
            await document.fonts.ready
        }

        // Rasterize with html2canvas directly (rather than the html2pdf.js wrapper) and place
        // the single resulting image onto one jsPDF page ourselves. html2pdf.js's own pagination
        // logic was splitting this onto two pages even though the content fits on one -- driving
        // straight through html2canvas + jsPDF removes that page-break heuristic entirely.
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf')
        ])

        const canvas = await html2canvas(renderElement, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#FDFBF6',
            width: CERTIFICATE_WIDTH_PX,
            height: CERTIFICATE_HEIGHT_PX,
            windowWidth: CERTIFICATE_WIDTH_PX,
            windowHeight: CERTIFICATE_HEIGHT_PX
        })

        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.98)
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        doc.addImage(imageDataUrl, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')

        return doc.output('blob')
    } finally {
        if (container?.parentNode) container.parentNode.removeChild(container)
        if (styleEl?.parentNode) styleEl.parentNode.removeChild(styleEl)
    }
}

/**
 * Generate real ISO-compliant scannable QR Code Data URL
 */
export async function createQRCodeDataUrl(text: string): Promise<string> {
    try {
        return await QRCode.toDataURL(text, {
            width: 240,
            margin: 1,
            color: {
                dark: '#0B1C3E',
                light: '#FAF8F5'
            }
        })
    } catch (e) {
        console.warn('QR Code generation error:', e)
        return ''
    }
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

/**
 * Generate unique certificate number
 */
function generateCertificateNumber(): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const randomPart = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
    return `CERT-${dateStr}-${randomPart}`
}

/**
 * Generate unique verification code
 */
function generateVerificationCode(): string {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
}

/**
 * Create a new certificate in the database
 */
export async function createCertificate(data: CertificateData): Promise<Certificate | null> {
    let resolvedTrainingModuleId = data.trainingModuleId
    let resolvedTrainingProgressId = data.trainingProgressId
    let resolvedScore = data.score
    let resolvedPassingScore = data.passingScore

    if (data.certificateType === 'training' && data.userId) {
        const resolveProgressById = async (progressId: string): Promise<TrainingProgressSnapshot | null> => {
            const { data: progress, error } = await supabase
                .from('training_progress')
                .select('id, training_id, quiz_score')
                .eq('id', progressId)
                .eq('user_id', data.userId)
                .eq('is_deleted', false)
                .maybeSingle()

            if (error || !progress) return null
            return progress as TrainingProgressSnapshot
        }

        const resolveProgressByModule = async (moduleId: string): Promise<TrainingProgressSnapshot | null> => {
            const { data: progress, error } = await supabase
                .from('training_progress')
                .select('id, training_id, quiz_score')
                .eq('user_id', data.userId)
                .eq('training_id', moduleId)
                .eq('is_deleted', false)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error || !progress) return null
            return progress as TrainingProgressSnapshot
        }

        if (resolvedTrainingProgressId) {
            const progress = await resolveProgressById(resolvedTrainingProgressId)
            if (progress) {
                if (!resolvedTrainingModuleId) {
                    resolvedTrainingModuleId = progress.training_id
                }
                if (resolvedScore === undefined || resolvedScore === null) {
                    resolvedScore = progress.quiz_score ?? undefined
                }
            }
        }

        if (!resolvedTrainingProgressId && resolvedTrainingModuleId) {
            const progress = await resolveProgressByModule(resolvedTrainingModuleId)
            if (progress) {
                resolvedTrainingProgressId = progress.id
                if (resolvedScore === undefined || resolvedScore === null) {
                    resolvedScore = progress.quiz_score ?? undefined
                }
            }
        }

        if (!resolvedPassingScore && resolvedTrainingModuleId) {
            const { data: moduleInfo } = await supabase
                .from('training_modules')
                .select('passing_score_percentage')
                .eq('id', resolvedTrainingModuleId)
                .maybeSingle()

            const modulePassingScore = moduleInfo?.passing_score_percentage
            if (typeof modulePassingScore === 'number') {
                resolvedPassingScore = modulePassingScore
            }
        }

        if (resolvedTrainingProgressId) {
            const { data: existingCert, error: existingCertError } = await supabase
                .from('certificates')
                .select('*')
                .eq('training_progress_id', resolvedTrainingProgressId)
                .eq('certificate_type', 'training')
                .eq('status', 'active')
                .maybeSingle()

            const mappedExistingCert = existingCert ? mapCertificateFromDb(existingCert) : null
            if (!existingCertError && mappedExistingCert?.status === 'active') {
                return mappedExistingCert
            }
        }
    }

    const pathCertificateId =
        data.certificateType === 'achievement' &&
        data.metadata &&
        typeof data.metadata.training_path_id === 'string'
            ? data.metadata.training_path_id
            : null

    if (pathCertificateId) {
        const { data: existingPathCert, error: existingPathCertError } = await supabase
            .from('certificates')
            .select('*')
            .eq('user_id', data.userId)
            .eq('certificate_type', 'achievement')
            .eq('status', 'active')
            .contains('metadata', { training_path_id: pathCertificateId })
            .maybeSingle()

        const mappedExistingPathCert = existingPathCert ? mapCertificateFromDb(existingPathCert) : null
        if (!existingPathCertError && mappedExistingPathCert?.status === 'active') {
            return mappedExistingPathCert
        }
    }

    const certificateNumber = generateCertificateNumber()
    const verificationCode = generateVerificationCode()

    const { data: cert, error } = await supabase
        .from('certificates')
        .insert({
            user_id: data.userId,
            recipient_name: data.recipientName,
            recipient_email: data.recipientEmail,
            certificate_type: data.certificateType,
            certificate_number: certificateNumber,
            verification_code: verificationCode,
            title: data.title,
            description: data.description,
            completion_date: data.completionDate.toISOString(),
            expiry_date: data.expiryDate?.toISOString(),
            score: resolvedScore,
            passing_score: resolvedPassingScore,
            training_module_id: resolvedTrainingModuleId,
            training_progress_id: resolvedTrainingProgressId,
            sop_id: data.sopId,
            quiz_attempt_id: data.quizAttemptId,
            property_id: data.propertyId,
            department_id: data.departmentId,
            issued_by: data.issuedBy,
            status: 'active',
            metadata: {
                propertyName: data.propertyName,
                departmentName: data.departmentName,
                issuedByName: data.issuedByName,
                ...(data.metadata || {})
            }
        })
        .select()
        .single()

    if (error) {
        if (resolvedTrainingProgressId && error.code === '23505') {
            const { data: existingCert, error: existingCertError } = await supabase
                .from('certificates')
                .select('*')
                .eq('training_progress_id', resolvedTrainingProgressId)
                .eq('certificate_type', 'training')
                .eq('status', 'active')
                .maybeSingle()

            const mappedExistingCert = existingCert ? mapCertificateFromDb(existingCert) : null
            if (!existingCertError && mappedExistingCert?.status === 'active') {
                return mappedExistingCert
            }
        }
        console.error('Failed to create certificate:', error)
        return null
    }

    // Automated email dispatch for attained certificates
    try {
        if (data.recipientEmail) {
            const resultCertificate = mapCertificateFromDb(cert)
            let attachments: Array<{ filename: string; content: string }> | undefined
            
            try {
                const logoDataUrl = await loadLogoAsDataUrl()
                const pdfBlob = await generateCertificatePDF(resultCertificate, logoDataUrl || undefined)
                const fileReader = new FileReader()
                const base64Promise = new Promise<string>((resolve, reject) => {
                    fileReader.onloadend = () => {
                        const result = fileReader.result as string
                        const base64Content = result.split(',')[1]
                        resolve(base64Content)
                    }
                    fileReader.onerror = reject
                    fileReader.readAsDataURL(pdfBlob)
                })
                const base64Content = await base64Promise
                
                attachments = [
                    {
                        filename: `${data.title.replace(/[^a-zA-Z0-9 -]/g, '')} - Certificate.pdf`,
                        content: base64Content
                    }
                ]
            } catch (pdfError) {
                console.warn('Failed to generate PDF for email attachment:', pdfError)
            }

            await supabase.functions.invoke('send-email', {
                body: {
                    to: data.recipientEmail,
                    userId: data.userId,
                    templateKey: 'training_certificate_earned',
                    subject: 'Your Certificate of Completion: ' + data.title,
                    title: 'Certificate Attained',
                    message: `Congratulations ${data.recipientName}! You have successfully earned the ${data.title} certificate.`,
                    actionUrl: '/training/certificates',
                    businessDomain: 'operations',
                    notificationType: 'training_completed',
                    attachments,
                    variables: {
                        recipient_name: data.recipientName,
                        module_title: data.title,
                        certificate_number: certificateNumber,
                        verification_code: verificationCode
                    }
                }
            })
        }
    } catch (emailError) {
        console.error('Failed to dispatch certificate email:', emailError)
    }

    return mapCertificateFromDb(cert)
}

/**
 * Get certificate by ID
 */
export async function getCertificate(certificateId: string): Promise<Certificate | null> {
    const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', certificateId)
        .single()

    if (error || !data) return null
    return mapCertificateFromDb(data)
}

/**
 * Get certificates for a user
 */
export async function getUserCertificates(userId: string): Promise<Certificate[]> {
    const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error || !data) return []
    return data.map(mapCertificateFromDb)
}

/**
 * Verify a certificate by its verification code
 */
export async function verifyCertificate(verificationCode: string): Promise<{
    isValid: boolean
    certificate?: Partial<Certificate>
}> {
    const { data, error } = await supabase
        .rpc('verify_certificate', { verification_code_param: verificationCode })

    if (error || !data || data.length === 0) {
        return { isValid: false }
    }

    const result = data[0]
    const resolvedStatus = resolveCertificateStatus(result.status, result.expiry_date)
    return {
        isValid: Boolean(result.is_valid) && resolvedStatus === 'active',
        certificate: {
            certificateNumber: result.certificate_number,
            recipientName: result.recipient_name,
            title: result.title,
            certificateType: result.certificate_type,
            completionDate: new Date(result.completion_date),
            expiryDate: result.expiry_date ? new Date(result.expiry_date) : undefined,
            status: resolvedStatus,
            createdAt: new Date(result.issued_at)
        }
    }
}

/**
 * Log certificate action for audit trail
 */
export async function logCertificateAction(
    certificateId: string,
    action: 'viewed' | 'downloaded' | 'verified',
    performedBy?: string
): Promise<void> {
    await supabase
        .from('certificate_history')
        .insert({
            certificate_id: certificateId,
            action,
            performed_by: performedBy,
            details: { timestamp: new Date().toISOString() }
        })
}

/**
 * Revoke a certificate
 */
export async function revokeCertificate(
    certificateId: string,
    reason: string,
    revokedBy: string
): Promise<boolean> {
    const { error } = await supabase
        .from('certificates')
        .update({
            status: 'revoked',
            revocation_reason: reason,
            revoked_by: revokedBy,
            revoked_at: new Date().toISOString()
        })
        .eq('id', certificateId)

    if (!error) {
        await supabase.from('certificate_history').insert({
            certificate_id: certificateId,
            action: 'revoked',
            performed_by: revokedBy,
            details: { reason }
        })
    }

    return !error
}

/**
 * Map database record to Certificate type
 */
export function mapCertificateFromDb(record: CertificateRecord): Certificate {
    return {
        id: record.id,
        certificateNumber: record.certificate_number,
        verificationCode: record.verification_code,
        userId: record.user_id,
        recipientName: record.recipient_name,
        recipientEmail: record.recipient_email,
        certificateType: record.certificate_type as CertificateData['certificateType'],
        title: record.title,
        description: record.description,
        completionDate: new Date(record.completion_date),
        expiryDate: record.expiry_date ? new Date(record.expiry_date) : undefined,
        score: record.score,
        passingScore: record.passing_score,
        trainingModuleId: record.training_module_id,
        trainingProgressId: record.training_progress_id,
        sopId: record.sop_id,
        quizAttemptId: record.quiz_attempt_id,
        propertyId: record.property_id,
        propertyName: record.metadata?.propertyName,
        departmentId: record.department_id,
        departmentName: record.metadata?.departmentName,
        issuedBy: record.issued_by,
        issuedByName: record.metadata?.issuedByName,
        status: resolveCertificateStatus(record.status, record.expiry_date),
        pdfUrl: record.pdf_url,
        createdAt: new Date(record.created_at)
    }
}

/**
 * Load logo as data URL for embedding in PDF
 */
export async function loadLogoAsDataUrl(): Promise<string | null> {
    try {
        const response = await fetch('/altus-logo-web.png')
        const blob = await response.blob()
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}
