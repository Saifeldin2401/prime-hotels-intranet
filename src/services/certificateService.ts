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

import type { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'

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

// Brand colors for Altus Advisory
const _BRAND_COLORS = {
    navy: '#0B1C3E',      // Altus Navy
    gold: '#C39A45',      // Altus Mid-Tone Gold
    darkGold: '#75531B',  // Altus Deep Bronze
    lightGold: '#F2D888', // Altus Highlight Gold
    white: '#ffffff',
    lightGray: '#f8f9fa',
    darkGray: '#2d3748',
    text: '#1a202c'
}

const CERTIFICATE_VERIFY_URL = import.meta.env.VITE_CERTIFICATE_VERIFY_URL || 'altus-advisory.com/verify'

/**
 * Generate a professional PDF certificate
 */
export async function generateCertificatePDF(
    certificate: Certificate,
    logoDataUrl?: string
): Promise<Blob> {
    const { jsPDF } = await import('jspdf')
    
    // Create PDF in landscape A4
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // ===== BACKGROUND =====
    // Cream/off-white background
    doc.setFillColor(252, 251, 248)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')

    // Decorative border - outer gold
    doc.setDrawColor(201, 165, 77) // Gold
    doc.setLineWidth(2)
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S')

    // Inner decorative border
    doc.setDrawColor(11, 21, 40) // Navy
    doc.setLineWidth(0.5)
    doc.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S')

    // Corner decorations
    drawCornerDecoration(doc, 15, 15, 'tl')
    drawCornerDecoration(doc, pageWidth - 15, 15, 'tr')
    drawCornerDecoration(doc, 15, pageHeight - 15, 'bl')
    drawCornerDecoration(doc, pageWidth - 15, pageHeight - 15, 'br')

    // ===== HEADER SECTION =====
    let yPos = 25

    // Logo placeholder - center top
    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, 'PNG', pageWidth / 2 - 30, yPos, 60, 20)
            yPos += 28
        } catch (e) {
            console.warn('Could not add logo:', e)
            // Fallback text logo
            doc.setTextColor(11, 21, 40)
            doc.setFontSize(24)
            doc.setFont('helvetica', 'bold')
            doc.text('ALTUS ADVISORY', pageWidth / 2, yPos + 10, { align: 'center' })
            yPos += 20
        }
    } else {
        // Text logo fallback
        doc.setTextColor(11, 21, 40)
        doc.setFontSize(24)
        doc.setFont('helvetica', 'bold')
        doc.text('ALTUS ADVISORY', pageWidth / 2, yPos + 10, { align: 'center' })
        yPos += 20
    }

    // Certificate type header
    yPos += 5
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(156, 120, 53) // Dark gold
    const typeLabel = getCertificateTypeLabel(certificate.certificateType)
    doc.text(typeLabel, pageWidth / 2, yPos, { align: 'center' })

    // Main title - "CERTIFICATE OF COMPLETION"
    yPos += 12
    doc.setFontSize(32)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(11, 21, 40) // Navy
    doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, yPos, { align: 'center' })

    // Decorative line under title
    yPos += 6
    doc.setDrawColor(201, 165, 77)
    doc.setLineWidth(1)
    doc.line(pageWidth / 2 - 60, yPos, pageWidth / 2 + 60, yPos)

    // ===== RECIPIENT SECTION =====
    yPos += 15
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(45, 55, 72)
    doc.text('This is to certify that', pageWidth / 2, yPos, { align: 'center' })

    // Recipient name - large and prominent
    yPos += 14
    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(11, 21, 40)
    doc.text(certificate.recipientName, pageWidth / 2, yPos, { align: 'center' })

    // Underline for name
    yPos += 3
    doc.setDrawColor(201, 165, 77)
    doc.setLineWidth(0.5)
    const nameWidth = doc.getTextWidth(certificate.recipientName)
    doc.line(pageWidth / 2 - nameWidth / 2 - 5, yPos, pageWidth / 2 + nameWidth / 2 + 5, yPos)

    // ===== ACHIEVEMENT SECTION =====
    yPos += 12
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(45, 55, 72)
    doc.text('has successfully completed', pageWidth / 2, yPos, { align: 'center' })

    // Course/Training title
    yPos += 12
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(11, 21, 40)

    // Handle long titles with word wrap
    const maxTitleWidth = pageWidth - 80
    const titleLines = doc.splitTextToSize(certificate.title, maxTitleWidth)
    doc.text(titleLines, pageWidth / 2, yPos, { align: 'center' })
    yPos += titleLines.length * 8

    // Score if applicable
    if (certificate.score !== undefined && certificate.score !== null) {
        yPos += 6
        doc.setFontSize(14)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(45, 55, 72)
        const scoreText = `Score: ${certificate.score}%${certificate.passingScore ? ` (Passing: ${certificate.passingScore}%)` : ''}`
        doc.text(scoreText, pageWidth / 2, yPos, { align: 'center' })
    }

    // ===== DATE SECTION =====
    yPos += 12
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(45, 55, 72)
    const dateStr = formatDate(certificate.completionDate)
    doc.text(`Completed on ${dateStr}`, pageWidth / 2, yPos, { align: 'center' })

    // Expiry date if applicable
    if (certificate.expiryDate) {
        yPos += 6
        doc.setFontSize(10)
        const expiryStr = formatDate(certificate.expiryDate)
        doc.text(`Valid until ${expiryStr}`, pageWidth / 2, yPos, { align: 'center' })
    }

    // ===== FOOTER SECTION =====
    const footerY = pageHeight - 35

    // Property/Department info
    if (certificate.propertyName || certificate.departmentName) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        let contextText = ''
        if (certificate.propertyName && certificate.departmentName) {
            contextText = `${certificate.departmentName} | ${certificate.propertyName}`
        } else {
            contextText = certificate.propertyName || certificate.departmentName || ''
        }
        doc.text(contextText, pageWidth / 2, footerY - 8, { align: 'center' })
    }

    // Certificate number and verification code
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)

    // Left: Certificate number
    doc.text(`Certificate No: ${certificate.certificateNumber}`, 20, footerY + 5)

    // Center: Verification instructions
    doc.text(`Verify at: ${CERTIFICATE_VERIFY_URL}`, pageWidth / 2, footerY + 5, { align: 'center' })

    // Right: Verification code
    doc.text(`Code: ${certificate.verificationCode}`, pageWidth - 20, footerY + 5, { align: 'right' })

    // QR-code-style verification hint
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text('This certificate can be verified using the code above', pageWidth / 2, footerY + 10, { align: 'center' })

    // Return as blob
    return doc.output('blob')
}

/**
 * Draw decorative corner flourish
 */
function drawCornerDecoration(doc: jsPDF, x: number, y: number, corner: 'tl' | 'tr' | 'bl' | 'br') {
    const size = 8
    doc.setDrawColor(201, 165, 77) // Gold
    doc.setLineWidth(0.5)

    switch (corner) {
        case 'tl':
            doc.line(x, y + size, x, y)
            doc.line(x, y, x + size, y)
            break
        case 'tr':
            doc.line(x - size, y, x, y)
            doc.line(x, y, x, y + size)
            break
        case 'bl':
            doc.line(x, y - size, x, y)
            doc.line(x, y, x + size, y)
            break
        case 'br':
            doc.line(x - size, y, x, y)
            doc.line(x, y, x, y - size)
            break
    }
}

/**
 * Get display label for certificate type
 */
function getCertificateTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        'training': 'PROFESSIONAL TRAINING',
        'sop_quiz': 'STANDARD OPERATING PROCEDURES',
        'compliance': 'COMPLIANCE CERTIFICATION',
        'achievement': 'ACHIEVEMENT RECOGNITION'
    }
    return labels[type] || 'CERTIFICATION'
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
                    templateKey: 'certificate_earned',
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
