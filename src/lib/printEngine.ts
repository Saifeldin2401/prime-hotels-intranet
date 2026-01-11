/**
 * Corporate Print Engine
 * 
 * Enterprise-grade PDF report generation following strict corporate standards.
 * Features:
 * - Corporate branding (logo, headers, footers)
 * - A4 format with configurable orientation
 * - Table pagination with totals on page breaks
 * - Black & white friendly colors
 * - Deterministic output with corporate naming convention
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ========== TYPES ==========

export interface PrintConfig {
    reportType: 'flash_report' | 'occupancy' | 'revenue' | 'import_summary' | 'knowledge_article' | 'custom'
    title: string
    hotelName: string
    hotelCode?: string
    period: { start: string; end: string }
    generatedBy: { name: string; role?: string }
    orientation?: 'portrait' | 'landscape'
    includeNotes?: string[]
    confidentialFooter?: boolean
}

export interface TableSection {
    title?: string
    headers: string[]
    rows: (string | number)[][]
    totals?: (string | number)[]
    columnWidths?: number[] // Percentage widths
}

export interface KPISection {
    title: string
    items: { label: string; value: string | number; unit?: string }[]
}

export interface ContentSection {
    title?: string
    content: string // Supports text wrapping and basic layout
}

export interface ReportData {
    kpis?: KPISection[]
    tables?: TableSection[]
    content?: ContentSection[]
    notes?: string[]
}

// ========== CONSTANTS ==========

const BRAND_COLORS = {
    navy: [26, 54, 93] as [number, number, number],
    gold: [201, 169, 98] as [number, number, number],
    darkText: [30, 30, 30] as [number, number, number],
    lightGray: [245, 245, 245] as [number, number, number],
    mediumGray: [180, 180, 180] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
}

const FONTS = {
    title: 16,
    sectionHeader: 12,
    body: 10,
    small: 8,
    footer: 7,
}

const MARGINS = {
    top: 25,
    right: 20,
    bottom: 25,
    left: 20,
}

// ========== MAIN EXPORT FUNCTION ==========

/**
 * Generate a corporate PDF report
 */
export async function generateReport(
    config: PrintConfig,
    data: ReportData,
    logoDataUrl?: string
): Promise<Blob> {
    // Determine orientation based on table width
    const orientation = config.orientation || 'portrait'

    const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const contentWidth = pageWidth - MARGINS.left - MARGINS.right

    let yPos = MARGINS.top

    // ===== HEADER =====
    yPos = drawHeader(doc, config, logoDataUrl, pageWidth, yPos)

    // ===== KPIs =====
    if (data.kpis && data.kpis.length > 0) {
        for (const kpiSection of data.kpis) {
            yPos = drawKPISection(doc, kpiSection, yPos, contentWidth)
        }
    }

    // ===== CONTENT SECTIONS (Knowledge Base) =====
    if (data.content && data.content.length > 0) {
        for (const section of data.content) {
            yPos = drawContentSection(doc, section, yPos, contentWidth, pageHeight)
        }
    }

    // ===== TABLES =====
    if (data.tables && data.tables.length > 0) {
        for (const table of data.tables) {
            yPos = drawTableSection(doc, table, yPos, contentWidth, pageHeight)
        }
    }

    // ===== NOTES =====
    if (data.notes && data.notes.length > 0 || config.includeNotes && config.includeNotes.length > 0) {
        const notes = [...(data.notes || []), ...(config.includeNotes || [])]
        yPos = drawNotes(doc, notes, yPos, contentWidth, pageHeight)
    }

    // ===== FOOTER ON ALL PAGES =====
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        drawFooter(doc, config, pageWidth, pageHeight, i, pageCount)
    }

    return doc.output('blob')
}

/**
 * Download the generated PDF with corporate naming
 */
export async function downloadReport(
    config: PrintConfig,
    data: ReportData,
    logoDataUrl?: string
): Promise<void> {
    const blob = await generateReport(config, data, logoDataUrl)
    const fileName = generateFileName(config)

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

// ========== DRAWING FUNCTIONS ==========

function drawHeader(
    doc: jsPDF,
    config: PrintConfig,
    logoDataUrl: string | undefined,
    pageWidth: number,
    yPos: number
): number {
    // Logo (top-left)
    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, 'PNG', MARGINS.left, yPos - 10, 40, 15)
        } catch (e) {
            console.warn('Could not add logo:', e)
            drawTextLogo(doc, MARGINS.left, yPos)
        }
    } else {
        drawTextLogo(doc, MARGINS.left, yPos)
    }

    // Report Title (centered)
    doc.setFontSize(FONTS.title)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_COLORS.navy)
    doc.text(config.title.toUpperCase(), pageWidth / 2, yPos, { align: 'center' })
    yPos += 8

    // Hotel Name and Code
    doc.setFontSize(FONTS.sectionHeader)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND_COLORS.darkText)
    const hotelText = config.hotelCode
        ? `${config.hotelName} (${config.hotelCode})`
        : config.hotelName
    doc.text(hotelText, pageWidth / 2, yPos, { align: 'center' })
    yPos += 6

    // Report Period
    doc.setFontSize(FONTS.body)
    const periodText = `Report Period: ${formatDateRange(config.period.start, config.period.end)}`
    doc.text(periodText, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5

    // Generation Info (right side)
    doc.setFontSize(FONTS.small)
    doc.setTextColor(...BRAND_COLORS.mediumGray)
    const genDate = new Date().toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
    doc.text(`Generated: ${genDate}`, pageWidth - MARGINS.right, MARGINS.top - 5, { align: 'right' })

    const genBy = config.generatedBy.role
        ? `${config.generatedBy.name} (${config.generatedBy.role})`
        : config.generatedBy.name
    doc.text(`By: ${genBy}`, pageWidth - MARGINS.right, MARGINS.top, { align: 'right' })

    // Divider line
    yPos += 3
    doc.setDrawColor(...BRAND_COLORS.gold)
    doc.setLineWidth(0.5)
    doc.line(MARGINS.left, yPos, pageWidth - MARGINS.right, yPos)
    yPos += 8

    return yPos
}

function drawTextLogo(doc: jsPDF, x: number, y: number): void {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_COLORS.navy)
    doc.text('PRIME HOTELS', x, y)
}

function drawKPISection(
    doc: jsPDF,
    section: KPISection,
    yPos: number,
    contentWidth: number
): number {
    // Section title
    doc.setFontSize(FONTS.sectionHeader)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_COLORS.navy)
    doc.text(section.title, MARGINS.left, yPos)
    yPos += 6

    // KPI grid
    const kpiCount = section.items.length
    const kpisPerRow = Math.min(4, kpiCount)
    const kpiWidth = contentWidth / kpisPerRow
    const kpiHeight = 18

    let xPos = MARGINS.left
    let rowY = yPos

    for (let i = 0; i < section.items.length; i++) {
        const item = section.items[i]

        // KPI box background
        doc.setFillColor(...BRAND_COLORS.lightGray)
        doc.roundedRect(xPos, rowY, kpiWidth - 3, kpiHeight, 2, 2, 'F')

        // Label
        doc.setFontSize(FONTS.small)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...BRAND_COLORS.mediumGray)
        doc.text(item.label, xPos + 3, rowY + 5)

        // Value
        doc.setFontSize(FONTS.sectionHeader)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_COLORS.darkText)
        const valueText = item.unit ? `${item.value}${item.unit}` : String(item.value)
        doc.text(valueText, xPos + 3, rowY + 13)

        xPos += kpiWidth
        if ((i + 1) % kpisPerRow === 0 && i < section.items.length - 1) {
            xPos = MARGINS.left
            rowY += kpiHeight + 3
        }
    }

    return rowY + kpiHeight + 8
}

function drawTableSection(
    doc: jsPDF,
    table: TableSection,
    yPos: number,
    contentWidth: number,
    pageHeight: number
): number {
    // Section title
    if (table.title) {
        doc.setFontSize(FONTS.sectionHeader)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_COLORS.navy)
        doc.text(table.title, MARGINS.left, yPos)
        yPos += 6
    }

    // Prepare rows with totals if provided
    const bodyRows = table.rows.map(row => row.map(cell => String(cell)))

    // Add totals row if provided
    if (table.totals) {
        bodyRows.push(table.totals.map(cell => String(cell)))
    }

    // Use autoTable for professional table rendering
    autoTable(doc, {
        startY: yPos,
        head: [table.headers],
        body: bodyRows,
        theme: 'plain',
        margin: { left: MARGINS.left, right: MARGINS.right },
        styles: {
            fontSize: FONTS.body,
            cellPadding: 2,
            textColor: BRAND_COLORS.darkText,
            lineColor: BRAND_COLORS.mediumGray,
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: BRAND_COLORS.navy,
            textColor: BRAND_COLORS.white,
            fontStyle: 'bold',
            halign: 'center',
        },
        alternateRowStyles: {
            fillColor: BRAND_COLORS.lightGray,
        },
        // Style totals row if present
        didParseCell: (data) => {
            if (table.totals && data.section === 'body' && data.row.index === bodyRows.length - 1) {
                data.cell.styles.fontStyle = 'bold'
                data.cell.styles.fillColor = [220, 220, 220]
            }
        },
        // Track where table ends
        didDrawPage: (data) => {
            // Header reminder on new pages
            if (data.pageNumber > 1 && table.title) {
                doc.setFontSize(FONTS.small)
                doc.setFont('helvetica', 'italic')
                doc.setTextColor(...BRAND_COLORS.mediumGray)
                doc.text(`${table.title} (continued)`, MARGINS.left, MARGINS.top - 5)
            }
        },
    })

    // Get final Y position after table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 20
    return finalY + 10
}

function drawContentSection(
    doc: jsPDF,
    section: ContentSection,
    yPos: number,
    contentWidth: number,
    pageHeight: number
): number {
    // Section Title
    if (section.title) {
        // Check for page break before title
        if (yPos > pageHeight - 30) {
            doc.addPage()
            yPos = MARGINS.top
        }

        doc.setFontSize(FONTS.sectionHeader)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_COLORS.navy)
        doc.text(section.title, MARGINS.left, yPos)
        yPos += 8
    }

    doc.setFontSize(FONTS.body)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND_COLORS.darkText)

    // Handle multi-line content with page breaking
    const paragraphs = section.content.split('\n')

    for (const para of paragraphs) {
        if (!para.trim()) {
            yPos += 3
            continue
        }

        const lines = doc.splitTextToSize(para, contentWidth)

        for (const line of lines) {
            // Check for page break
            if (yPos > pageHeight - MARGINS.bottom) {
                doc.addPage()
                yPos = MARGINS.top
            }

            doc.text(line, MARGINS.left, yPos)
            yPos += 5
        }
        yPos += 2 // Paragraph spacing
    }

    return yPos + 5
}

function drawNotes(
    doc: jsPDF,
    notes: string[],
    yPos: number,
    contentWidth: number,
    pageHeight: number
): number {
    // Check if we need a new page
    if (yPos > pageHeight - 50) {
        doc.addPage()
        yPos = MARGINS.top
    }

    doc.setFontSize(FONTS.sectionHeader)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_COLORS.navy)
    doc.text('Notes & Assumptions', MARGINS.left, yPos)
    yPos += 6

    doc.setFontSize(FONTS.body)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND_COLORS.darkText)

    for (const note of notes) {
        const lines = doc.splitTextToSize(`• ${note}`, contentWidth)
        doc.text(lines, MARGINS.left, yPos)
        yPos += lines.length * 5
    }

    return yPos + 5
}

function drawFooter(
    doc: jsPDF,
    config: PrintConfig,
    pageWidth: number,
    pageHeight: number,
    currentPage: number,
    totalPages: number
): void {
    const footerY = pageHeight - 10

    doc.setFontSize(FONTS.footer)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND_COLORS.mediumGray)

    // Page number (center)
    doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth / 2, footerY, { align: 'center' })

    // Confidential text (left)
    if (config.confidentialFooter !== false) {
        doc.text('CONFIDENTIAL - For Internal Use Only', MARGINS.left, footerY)
    }

    // Company name (right)
    doc.text('© Prime Hotels', pageWidth - MARGINS.right, footerY, { align: 'right' })

    // Footer line
    doc.setDrawColor(...BRAND_COLORS.gold)
    doc.setLineWidth(0.3)
    doc.line(MARGINS.left, footerY - 4, pageWidth - MARGINS.right, footerY - 4)
}

// ========== UTILITY FUNCTIONS ==========

function formatDateRange(start: string, end: string): string {
    const startDate = new Date(start)
    const endDate = new Date(end)

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    }

    if (start === end) {
        return startDate.toLocaleDateString('en-GB', options)
    }

    return `${startDate.toLocaleDateString('en-GB', options)} – ${endDate.toLocaleDateString('en-GB', options)}`
}

/**
 * Generate corporate filename
 * Format: PRIME_ReportType_Hotel_Period_Date.pdf
 */
function generateFileName(config: PrintConfig): string {
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')

    const company = 'PRIME'
    const reportType = sanitize(config.reportType)
    const hotel = sanitize(config.hotelCode || config.hotelName.substring(0, 10))
    const period = `${config.period.start.replace(/-/g, '')}_${config.period.end.replace(/-/g, '')}`
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')

    return `${company}_${reportType}_${hotel}_${period}_${date}.pdf`
}

/**
 * Load company logo as data URL
 */
export async function loadLogoAsDataUrl(): Promise<string | null> {
    try {
        const response = await fetch('/prime-hotels-logo.png')
        if (!response.ok) return null
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
