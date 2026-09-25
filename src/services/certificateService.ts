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
import type { Json } from '@/types/database.generated'

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
    quizId?: string
    quizAttemptId?: string

    // Context & Multi-Tenant Scoping
    organizationId?: string
    brandId?: string
    hotelId?: string
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
    organization_id?: string | null
    property_id?: string | null
    department_id?: string | null
    issued_by?: string | null
    status: string | null
    pdf_url?: string | null
    created_at: string | null
    // The DB column is JSONB; we control the write shape in createCertificate() below,
    // so it is known to be this shape (or null/absent) even though the generated type is just Json.
    metadata?: Json | null
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
        issuedByName: certificate.issuedByName || (certificate.metadata?.issuedByName as string | undefined),
        issuedByTitle: (certificate.metadata?.issuedByTitle as string | undefined),
        secondarySignatoryName: (certificate.metadata?.secondarySignatoryName as string | undefined),
        secondarySignatoryTitle: (certificate.metadata?.secondarySignatoryTitle as string | undefined),
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
 * Raised when the server refuses to issue a certificate. `code` is the stable
 * rule code the command function returns in its HINT (e.g. CERT_NOT_PASSED,
 * CERT_SELF_ISSUE), so callers can show a specific message.
 */
export class CertificateIssueError extends Error {
    readonly code: string | null

    constructor(message: string, code: string | null) {
        super(message)
        this.name = 'CertificateIssueError'
        this.code = code
    }
}

type IssueRpcName =
    | 'issue_training_certificate'
    | 'issue_quiz_certificate'
    | 'issue_path_certificate'
    | 'issue_manual_certificate'

type IssueRpcResult = {
    data: CertificateRecord | null
    error: { message: string; hint?: string | null } | null
}

// The issue_* command functions are newer than the generated DB types
// (`npm run db:types` needs a valid Supabase CLI token), so they are called
// through this one narrowly typed wrapper.
async function callIssueRpc(fn: IssueRpcName, args: Record<string, unknown>): Promise<CertificateRecord> {
    const rpc = supabase.rpc.bind(supabase) as unknown as (
        name: string,
        params: Record<string, unknown>
    ) => { single: () => PromiseLike<IssueRpcResult> }

    const { data, error } = await rpc(fn, args).single()
    if (error || !data) {
        throw new CertificateIssueError(error?.message || 'The certificate could not be issued.', error?.hint ?? null)
    }
    return data
}

/**
 * Issue a certificate the learner has earned. Certificates are never written
 * from the browser: each kind goes through a server command function that
 * re-checks the rule (completed and passed, same organization, one active
 * certificate per source). Idempotent - a repeat call returns the existing
 * certificate. Throws CertificateIssueError when the server refuses.
 */
export async function createCertificate(data: CertificateData): Promise<Certificate> {
    let record: CertificateRecord
    const pathId = typeof data.metadata?.training_path_id === 'string' ? data.metadata.training_path_id : null

    if (data.certificateType === 'training') {
        if (!data.trainingProgressId) {
            throw new CertificateIssueError('This course completion has no progress record to certify.', 'CERT_NO_PROGRESS')
        }
        record = await callIssueRpc('issue_training_certificate', { p_training_progress_id: data.trainingProgressId })
    } else if (data.certificateType === 'sop_quiz') {
        if (!data.quizId) {
            throw new CertificateIssueError('No quiz was given for this certificate.', 'CERT_QUIZ_NOT_FOUND')
        }
        record = await callIssueRpc('issue_quiz_certificate', { p_quiz_id: data.quizId })
    } else if (data.certificateType === 'achievement' && pathId) {
        record = await callIssueRpc('issue_path_certificate', { p_path_id: pathId })
    } else {
        throw new CertificateIssueError(
            'Only training managers and admins can issue this kind of certificate.',
            'CERT_NOT_ALLOWED'
        )
    }

    const certificate = mapCertificateFromDb(record)
    if (data.recipientEmail) {
        void dispatchCertificateEmail(data, certificate)
    }
    return certificate
}

export interface ManualCertificateInput {
    organizationId: string
    userId: string
    recipientName: string
    recipientEmail?: string
    certificateType: CertificateData['certificateType']
    title: string
    description?: string
    completionDate: Date
    expiryDate?: Date
    trainingModuleId?: string
    metadata?: Record<string, unknown>
}

/**
 * Issue a certificate by hand (classroom training, external course). Only
 * admins and training managers of the organization may do this, never for
 * themselves; the server records who issued it and emits an audit event.
 */
export async function issueManualCertificate(input: ManualCertificateInput): Promise<Certificate> {
    const record = await callIssueRpc('issue_manual_certificate', {
        p_organization_id: input.organizationId,
        p_user_id: input.userId,
        p_certificate_type: input.certificateType,
        p_title: input.title,
        p_completion_date: input.completionDate.toISOString(),
        p_description: input.description ?? null,
        p_training_module_id: input.trainingModuleId ?? null,
        p_expiry_date: input.expiryDate?.toISOString() ?? null,
        p_metadata: input.metadata ?? {},
    })

    const certificate = mapCertificateFromDb(record)
    if (input.recipientEmail) {
        void dispatchCertificateEmail(
            {
                userId: input.userId,
                recipientName: input.recipientName,
                recipientEmail: input.recipientEmail,
                certificateType: input.certificateType,
                title: input.title,
                completionDate: input.completionDate,
                organizationId: input.organizationId,
            },
            certificate
        )
    }
    return certificate
}

/**
 * Generate the certificate PDF and email it to the recipient. Failures here
 * are logged, not thrown - the certificate itself is already persisted by
 * the time this runs, so an email/PDF hiccup shouldn't fail the caller.
 */
async function dispatchCertificateEmail(data: CertificateData, resultCertificate: Certificate): Promise<void> {
    try {
        let attachments: Array<{ filename: string; content: string }> | undefined

        try {
            const logoDataUrl = await loadLogoAsDataUrl(data.organizationId)
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
                actionUrl: '/learn/certificates',
                businessDomain: 'operations',
                notificationType: 'training_completed',
                attachments,
                variables: {
                    recipient_name: data.recipientName,
                    module_title: data.title,
                    certificate_number: resultCertificate.certificateNumber,
                    verification_code: resultCertificate.verificationCode
                }
            }
        })
    } catch (emailError) {
        console.error('Failed to dispatch certificate email:', emailError)
    }
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
    certificate?: Partial<Certificate> & { organizationName?: string; organizationLogoUrl?: string }
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
            verificationCode: result.verification_code,
            recipientName: result.recipient_name,
            title: result.title,
            certificateType: result.certificate_type as CertificateData['certificateType'],
            completionDate: new Date(result.completion_date),
            expiryDate: result.expiry_date ? new Date(result.expiry_date) : undefined,
            status: resolvedStatus,
            createdAt: new Date(result.issued_at),
            propertyName: result.property_name ?? undefined,
            departmentName: result.department_name ?? undefined,
            organizationName: result.organization_name ?? undefined,
            organizationLogoUrl: result.organization_logo_url ?? undefined
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
 * Map database record to Certificate type
 */
export function mapCertificateFromDb(record: CertificateRecord): Certificate {
    // metadata is JSONB; createCertificate() always writes this shape, so the cast is safe
    // even though the generated column type is the generic Json union.
    const metadata = record.metadata as { propertyName?: string; departmentName?: string; issuedByName?: string } | null | undefined

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
        organizationId: record.organization_id || undefined,
        propertyId: record.property_id,
        propertyName: metadata?.propertyName,
        departmentId: record.department_id,
        departmentName: metadata?.departmentName,
        issuedBy: record.issued_by,
        issuedByName: metadata?.issuedByName,
        status: resolveCertificateStatus(record.status, record.expiry_date),
        pdfUrl: record.pdf_url,
        createdAt: record.created_at ? new Date(record.created_at) : new Date()
    }
}

/**
 * Fetch any image URL and convert it to a data URL, e.g. for a logo already resolved
 * elsewhere (a verify_certificate RPC result carries organization_logo_url directly, so
 * that call site doesn't need loadLogoAsDataUrl()'s own organizationId DB lookup below).
 */
export async function fetchAsDataUrl(url: string): Promise<string | null> {
    try {
        const response = await fetch(url)
        if (!response.ok) return null
        const blob = await response.blob()
        return await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

/**
 * Load a logo as a data URL for embedding in the certificate PDF. Previously always
 * fetched the static ALTUS logo regardless of which tenant issued the certificate --
 * organizationId (now populated by mapCertificateFromDb, and available directly on
 * CertificateData at creation time) is used to look up that org's own uploaded
 * logo_url first, falling back to the ALTUS default when the org has none set or the
 * lookup/fetch fails.
 */
export async function loadLogoAsDataUrl(organizationId?: string | null): Promise<string | null> {
    if (organizationId) {
        const { data: org } = await supabase
            .from('organizations')
            .select('logo_url')
            .eq('id', organizationId)
            .maybeSingle()

        if (org?.logo_url) {
            const tenantLogo = await fetchAsDataUrl(org.logo_url)
            if (tenantLogo) return tenantLogo
        }
    }

    return fetchAsDataUrl('/altus-logo-web.png')
}
