/**
 * Certificate Service - Enterprise-grade PDF certificate generation
 * 
 * Features:
 * - High-quality PDF generation using jsPDF
 * - Prime Hotels branded certificates
 * - Unique certificate numbers and verification codes
 * - Dynamic content population
 * - Audit trail integration
 */

import { jsPDF } from 'jspdf'
import { supabase } from './supabase'

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
}

export interface Certificate extends CertificateData {
    id: string
    certificateNumber: string
    verificationCode: string
    status: 'active' | 'revoked' | 'expired' | 'superseded'
    pdfUrl?: string
    createdAt: Date
}

// Brand colors for Prime Hotels
const BRAND_COLORS = {
    navy: '#1a365d',
    gold: '#c9a962',
    darkGold: '#a88b4a',
    lightGold: '#e8d5a5',
    white: '#ffffff',
    lightGray: '#f8f9fa',
    darkGray: '#2d3748',
    text: '#1a202c'
}

/**
 * Generate a professional PDF certificate
 */
export async function generateCertificatePDF(
    certificate: Certificate,
    logoDataUrl?: string
): Promise<Blob> {
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
    doc.setDrawColor(201, 169, 98) // Gold
    doc.setLineWidth(2)
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S')

    // Inner decorative border
    doc.setDrawColor(26, 54, 93) // Navy
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
            doc.setTextColor(26, 54, 93)
            doc.setFontSize(24)
            doc.setFont('helvetica', 'bold')
            doc.text('PRIME HOTELS', pageWidth / 2, yPos + 10, { align: 'center' })
            yPos += 20
        }
    } else {
        // Text logo fallback
        doc.setTextColor(26, 54, 93)
        doc.setFontSize(24)
        doc.setFont('helvetica', 'bold')
        doc.text('PRIME HOTELS', pageWidth / 2, yPos + 10, { align: 'center' })
        yPos += 20
    }

    // Certificate type header
    yPos += 5
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(168, 139, 74) // Dark gold
    const typeLabel = getCertificateTypeLabel(certificate.certificateType)
    doc.text(typeLabel, pageWidth / 2, yPos, { align: 'center' })

    // Main title - "CERTIFICATE OF COMPLETION"
    yPos += 12
    doc.setFontSize(32)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 54, 93) // Navy
    doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, yPos, { align: 'center' })

    // Decorative line under title
    yPos += 6
    doc.setDrawColor(201, 169, 98)
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
    doc.setTextColor(26, 54, 93)
    doc.text(certificate.recipientName, pageWidth / 2, yPos, { align: 'center' })

    // Underline for name
    yPos += 3
    doc.setDrawColor(201, 169, 98)
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
    doc.setTextColor(26, 54, 93)

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
            contextText = `${certificate.departmentName} • ${certificate.propertyName}`
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
    doc.text('Verify at: verify.primehotels.com', pageWidth / 2, footerY + 5, { align: 'center' })

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
    doc.setDrawColor(201, 169, 98) // Gold
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
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `CERT-${dateStr}-${randomPart}`
}

/**
 * Generate unique verification code
 */
function generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
}

/**
 * Create a new certificate in the database
 */
export async function createCertificate(data: CertificateData): Promise<Certificate | null> {
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
            score: data.score,
            passing_score: data.passingScore,
            training_module_id: data.trainingModuleId,
            training_progress_id: data.trainingProgressId,
            sop_id: data.sopId,
            quiz_attempt_id: data.quizAttemptId,
            property_id: data.propertyId,
            department_id: data.departmentId,
            issued_by: data.issuedBy,
            status: 'active',
            metadata: {
                propertyName: data.propertyName,
                departmentName: data.departmentName,
                issuedByName: data.issuedByName
            }
        })
        .select()
        .single()

    if (error) {
        console.error('Failed to create certificate:', error)
        return null
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
    return {
        isValid: result.is_valid,
        certificate: {
            certificateNumber: result.certificate_number,
            recipientName: result.recipient_name,
            title: result.title,
            certificateType: result.certificate_type,
            completionDate: new Date(result.completion_date),
            expiryDate: result.expiry_date ? new Date(result.expiry_date) : undefined,
            status: result.status,
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCertificateFromDb(record: any): Certificate {
    return {
        id: record.id,
        certificateNumber: record.certificate_number,
        verificationCode: record.verification_code,
        userId: record.user_id,
        recipientName: record.recipient_name,
        recipientEmail: record.recipient_email,
        certificateType: record.certificate_type,
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
        status: record.status,
        pdfUrl: record.pdf_url,
        createdAt: new Date(record.created_at)
    }
}

/**
 * Load logo as data URL for embedding in PDF
 */
export async function loadLogoAsDataUrl(): Promise<string | null> {
    try {
        const response = await fetch('/prime-hotels-logo.png')
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
