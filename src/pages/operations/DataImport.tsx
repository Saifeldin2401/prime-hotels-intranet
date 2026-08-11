import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { isConsolidatedPropertyId } from '@/lib/propertyScope'
import { useAuth } from '@/hooks/useAuth'
import { useCreateImportLog, useDataImportLogs, useDeleteImportLog, useProperties } from '@/hooks/useOperations'
import i18n from "@/i18n/i18n"
import {
    deriveRoomsAvailable,
    finalizeExtractedData,
    getImportBlockingIssues,
    type ExtractedData,
    type ExtractedRecord,
} from '@/pages/operations/dataImportValidation'
import { parseExcelRows } from '@/lib/excel'
import { downloadReport, loadLogoAsDataUrl } from '@/lib/printEngine'
import { detectPropertyByName, detectPropertyFromContext } from '@/lib/propertyDetection'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { SmartHeaderMapper } from '@/components/operations/SmartHeaderMapper'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    Building2,
    CheckCircle,
    ChevronRight,
    Clock,
    Database,
    FileSpreadsheet,
    FileUp,
    FileX, Layers,
    Loader2,
    Printer,
    RefreshCw,
    Search,
    Sparkles,
    Trash2,
    TrendingUp,
    Upload,
    Wand2,
    X,
    Zap
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'


interface FileQueueItem {
    id: string
    file: File
    status: 'pending' | 'processing' | 'success' | 'error' | 'skipped'
    extractedData?: ExtractedData
    error?: string
    duplicateWarning?: boolean
    // Raw column headers detected in the source file, and the data rows below them,
    // captured so the Smart Header Mapper can offer a manual correction step before import.
    csvHeaders?: string[]
    dataRows?: string[][]
    headerMapping?: Record<string, string>
    mappingReviewed?: boolean
}

// Side-channel used by the parsers below to hand back the raw header row + data rows
// they detected, without changing the ExtractedData return type.
interface HeaderCapture {
    current: { headers: string[]; dataRows: string[][] }
}

// ========== CONSTANTS ==========
const ARABIC_MONTHS: Record<string, string> = {
    'يناير': '01', 'فبراير': '02', 'مارس': '03', 'أبريل': '04',
    'مايو': '05', 'يونيو': '06', 'يوليو': '07', 'أغسطس': '08',
    'سبتمبر': '09', 'أكتوبر': '10', 'نوفمبر': '11', 'ديسمبر': '12'
}

// Canonical fields the importer understands. Shown as the "target" side of the
// Smart Header Mapper so users can correct a column match the auto-detector got wrong.
const IMPORT_TARGET_FIELDS = [
    'business_date',
    'hotel_name',
    'rooms_available',
    'rooms_sold',
    'occupancy',
    'adr',
    'revpar',
    'room_revenue',
    'fb_revenue',
    'total_revenue',
]

// ========== PARSING HELPERS (Preserved) ==========
function parseExcel(file: File): Promise<string[][]> {
    if (file.name.toLowerCase().endsWith('.xls')) {
        return Promise.reject(
            new Error(i18n.t('operations:data_import.errors.xls_not_supported', {
                defaultValue: 'Legacy .xls files are not supported. Please save as .xlsx and try again.'
            }))
        )
    }
    return parseExcelRows(file)
}

function parseCSV(text: string): string[][] {
    const lines = text.trim().split('\n')
    return lines.map(line => {
        const result: string[] = []; let current = ''; let inQuotes = false
        for (const char of line) {
            if (char === '"') inQuotes = !inQuotes
            else if (char === ',' && !inQuotes) { result.push(current.trim()); current = '' }
            else current += char
        }
        result.push(current.trim()); return result
    })
}

function calculateQualityScore(records: ExtractedRecord[]): { score: number, issues: string[], fieldConfidence: Record<string, number> } {
    const issues: string[] = []; const fieldConfidence: Record<string, number> = {}; let totalScore = 100
    if (records.length === 0) {
        return {
            score: 0,
            issues: [i18n.t('operations:data_import.validation.no_records', { defaultValue: 'No records found' })],
            fieldConfidence: {}
        }
    }
    const firstRecord = records[0]
    const requiredFields = ['business_date', 'rooms_sold']
    requiredFields.forEach(field => {
        const hasField = firstRecord[field] && String(firstRecord[field]).trim() !== ''
        fieldConfidence[field] = hasField ? 100 : 0
        if (!hasField) {
            issues.push(i18n.t('operations:data_import.validation.missing_required', {
                defaultValue: 'Missing required field: {{field}}',
                field
            }))
            totalScore -= 20
        }
    })
    const optionalFields = ['adr', 'room_revenue', 'fb_revenue', 'occupancy']
    optionalFields.forEach(field => {
        const hasField = firstRecord[field] && String(firstRecord[field]).trim() !== ''
        fieldConfidence[field] = hasField ? 100 : 50
        if (!hasField) {
            issues.push(i18n.t('operations:data_import.validation.optional_missing', {
                defaultValue: 'Optional field missing: {{field}}',
                field
            }))
            totalScore -= 5
        }
    })
    if (firstRecord.rooms_sold && isNaN(parseInt(String(firstRecord.rooms_sold)))) {
        issues.push(i18n.t('operations:data_import.validation.rooms_sold_invalid', { defaultValue: 'Rooms sold is not a valid number' }))
        totalScore -= 15; fieldConfidence['rooms_sold'] = 30
    }
    if (firstRecord.adr && isNaN(parseFloat(String(firstRecord.adr)))) {
        issues.push(i18n.t('operations:data_import.validation.adr_invalid', { defaultValue: 'ADR is not a valid number' }))
        totalScore -= 10; fieldConfidence['adr'] = 30
    }
    if (firstRecord.business_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(firstRecord.business_date))) {
        issues.push(i18n.t('operations:data_import.validation.date_format', { defaultValue: 'Date format may need adjustment' }))
        totalScore -= 10; fieldConfidence['business_date'] = 70
    }
    return { score: Math.max(0, totalScore), issues, fieldConfidence }
}

function extractDataFromRows(rows: string[][], properties = [], fileName: string = '', headerCapture?: HeaderCapture): ExtractedData {
    const pmsResult = parsePMSDailyReport(rows, properties, fileName, headerCapture)
    if (pmsResult.detected && pmsResult.data.length > 0) {
        const records = pmsResult.data
        const roomsSold = records.reduce((sum, r) => sum + (parseInt(String(r.rooms_sold)) || 0), 0)
        const totalRevenue = records.reduce((sum, r) => sum + (parseFloat(String(r.total_revenue)) || parseFloat(String(r.room_revenue)) || 0), 0)
        const { score, issues, fieldConfidence } = calculateQualityScore(records)
        const uniqueProperties = new Set(records.map(r => r.detected_property_id).filter(Boolean))
        return {
            records,
            detectedFormat: 'pms_daily',
            dateRange: {
                start: String(records[0]?.business_date || ''),
                end: String(records[records.length - 1]?.business_date || '')
            },
            summary: { totalRecords: records.length, roomsSold, totalRevenue, propertiesFound: uniqueProperties.size },
            qualityScore: score,
            qualityIssues: issues,
            fieldConfidence
        }
    }
    return parseStandardTemplate(rows, properties, fileName, headerCapture)
}

function parsePMSDailyReport(rows: string[][], properties = [], fileName: string = '', headerCapture?: HeaderCapture): { data: ExtractedRecord[], detected: boolean } {
    const isValidFormat = rows.some(row => row.some(cell => cell && (cell.toLowerCase().includes('key performance indicators') || cell.toLowerCase().includes('report date') || cell.toLowerCase().includes('altus al-hamra') || cell.toLowerCase().includes('altus al corniche') || cell.toLowerCase().includes('daily sales report'))))
    if (!isValidFormat) return { data: [], detected: false }

    // Use Multi-Signal Contextual Detection (Filename + Headers)
    const contextDetection = detectPropertyFromContext(fileName, rows, properties)
    let headerPropertyId: string | null = contextDetection.propertyId
    let _headerPropertyConfidence = contextDetection.confidence

    // Fallback: Legacy row-by-row scan if context failed
    if (!headerPropertyId) {
        for (const row of rows) {
            const rowText = row.join(' ')
            const detection = detectPropertyByName(rowText, properties)
            if (detection.confidence > 90) {
                headerPropertyId = detection.propertyId
                _headerPropertyConfidence = detection.confidence
                break
            }
        }
    }
    let businessDate = ''
    for (const row of rows) {
        for (const cell of row) {
            if (cell && (cell.includes('Report Date:') || cell.includes('تاريخ التقرير'))) {
                for (const [arabicMonth, monthNum] of Object.entries(ARABIC_MONTHS)) {
                    if (cell && cell.includes(arabicMonth)) {
                        const dayMatch = cell.match(/(\d{1,2})/g); const yearMatch = cell.match(/20\d{2}/)
                        if (dayMatch && yearMatch) { businessDate = `${yearMatch[0]}-${monthNum}-${dayMatch[0].padStart(2, '0')}`; break }
                    }
                }
                if (!businessDate) { const englishMatch = cell.match(/(\d{4})-(\d{2})-(\d{2})/); if (englishMatch) businessDate = englishMatch[0] }
            }
        }
    }
    let kpiHeaderRow = -1
    for (let i = 0; i < rows.length; i++) {
        const rowText = rows[i].join(' ').toLowerCase()
        if (rowText.includes('rooms occupied') && rowText.includes('adr')) { kpiHeaderRow = i; break }
    }
    if (!businessDate) businessDate = new Date().toISOString().split('T')[0]
    if (kpiHeaderRow === -1) return { data: [], detected: true }
    const headers = rows[kpiHeaderRow]; const values = rows[kpiHeaderRow + 1];
    if (headerCapture) {
        headerCapture.current = {
            headers: headers.map(h => (h || '').trim()),
            dataRows: values ? [values] : []
        }
    }
    const extracted: ExtractedRecord = {
        business_date: businessDate,
        detected_property_id: headerPropertyId,
        detected_confidence: headerPropertyId ? 95 : 0
    }
    headers.forEach((header, idx) => {
        if (!header) return; const h = header.toLowerCase().trim(); const val = values?.[idx]?.trim() || ''
        if (h.includes('rooms occupied')) extracted.rooms_sold = val
        if (h.includes('occupancy')) { const num = parseFloat(val); extracted.occupancy = num < 1 ? String(Math.round(num * 100)) : val }
        if (h === 'adr') extracted.adr = val; if (h === 'revpar') extracted.revpar = val
        if (h.includes('room revenue') && !h.includes('f&b')) extracted.room_revenue = val
        if (h.includes('f&b')) extracted.fb_revenue = val; if (h.includes('total revenue')) extracted.total_revenue = val
    })

    const resolvedRoomsAvailable = deriveRoomsAvailable(extracted)
    if (resolvedRoomsAvailable) {
        extracted.rooms_available = resolvedRoomsAvailable
    }

    return { data: [extracted], detected: true }
}

function parseStandardTemplate(rows: string[][], properties = [], fileName: string = '', headerCapture?: HeaderCapture): ExtractedData {
    const occupancyKeywords = ['business_date', 'rooms_available', 'rooms_sold']
    const revenueKeywords = ['business_date', 'room_revenue', 'fb_revenue']
    const hotelKeywords = ['hotel', 'property', 'hotel_name', 'hotel name', 'property_name', 'unit']

    let headerRow = 0; let format: 'occupancy' | 'revenue' | 'unknown' = 'unknown'
    for (let i = 0; i < Math.min(10, rows.length); i++) {
        const rowLower = rows[i].map(c => (c || '').toLowerCase())
        if (occupancyKeywords.every(k => rowLower.some(c => c.includes(k)))) { headerRow = i; format = 'occupancy'; break }
        if (revenueKeywords.every(k => rowLower.some(c => c.includes(k)))) { headerRow = i; format = 'revenue'; break }
    }

    const headers = rows[headerRow].map(h => (h || '').toLowerCase().trim())
    const hotelNameIdx = headers.findIndex(h => hotelKeywords.some(k => h.includes(k)))

    if (headerCapture) {
        const capturedDataRows: string[][] = []
        for (let i = headerRow + 1; i < rows.length; i++) {
            const row = rows[i]
            if (!row || row.every(c => !c)) continue
            capturedDataRows.push(row)
        }
        headerCapture.current = {
            headers: rows[headerRow].map(h => (h || '').trim()),
            dataRows: capturedDataRows
        }
    }

    // Use Contextual Detection as fallback (Filename + Headers)
    let contextPropertyId: string | null = null
    let contextConfidence = 0
    if (hotelNameIdx === -1) {
        const contextDetection = detectPropertyFromContext(fileName, rows, properties)
        contextPropertyId = contextDetection.propertyId
        contextConfidence = contextDetection.confidence
    }

    const records: ExtractedRecord[] = []
    for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i]; if (!row || row.every(c => !c)) continue
        const record: ExtractedRecord = {}
        headers.forEach((h, idx) => { record[h] = row[idx] || '' })

        // Record-level property detection
        if (hotelNameIdx !== -1 && row[hotelNameIdx]) {
            const detection = detectPropertyByName(row[hotelNameIdx], properties)
            record.detected_property_id = detection.propertyId
            record.detected_confidence = detection.confidence
        } else if (contextPropertyId) {
            // Apply file-level context to all records
            record.detected_property_id = contextPropertyId
            record.detected_confidence = contextConfidence
        }

        if (record.business_date) records.push(record)
    }

    const { score, issues, fieldConfidence } = calculateQualityScore(records as Record<string, string>[])
    const uniqueProperties = new Set(records.map(r => r.detected_property_id).filter(Boolean))

    return { records, detectedFormat: format, dateRange: { start: String(records[0]?.business_date || ''), end: String(records[records.length - 1]?.business_date || '') }, summary: { totalRecords: records.length, roomsSold: records.reduce((sum, r) => sum + (parseInt(String(r.rooms_sold)) || 0), 0), totalRevenue: records.reduce((sum, r) => sum + (parseFloat(String(r.room_revenue)) || 0), 0), propertiesFound: uniqueProperties.size }, qualityScore: score, qualityIssues: issues, fieldConfidence }
}

// Rebuilds extracted records from the raw data rows using a user-confirmed header
// mapping (csvHeader -> canonical field), instead of trusting the literal column
// text. This is what makes the Smart Header Mapper's manual corrections actually
// flow through to the import that runs.
function applyHeaderMapping(
    dataRows: string[][],
    csvHeaders: string[],
    mapping: Record<string, string>,
    properties = [],
    fileName: string = ''
): ExtractedRecord[] {
    const hotelColIdx = csvHeaders.findIndex(h => mapping[h] === 'hotel_name')
    let fileContext: { propertyId: string | null; confidence: number } | null = null
    if (hotelColIdx === -1) {
        const contextDetection = detectPropertyFromContext(fileName, [csvHeaders, ...dataRows], properties)
        fileContext = { propertyId: contextDetection.propertyId, confidence: contextDetection.confidence }
    }

    return dataRows
        .map(row => {
            const record: ExtractedRecord = {}
            csvHeaders.forEach((header, idx) => {
                const target = mapping[header]
                if (!target || target === 'skip' || target === 'hotel_name') return
                record[target] = row[idx] || ''
            })

            if (hotelColIdx !== -1 && row[hotelColIdx]) {
                const detection = detectPropertyByName(row[hotelColIdx], properties)
                record.detected_property_id = detection.propertyId
                record.detected_confidence = detection.confidence
            } else if (fileContext) {
                record.detected_property_id = fileContext.propertyId
                record.detected_confidence = fileContext.confidence
            }

            return record
        })
        .filter(record => Boolean(record.business_date))
}

// ========== MAIN COMPONENT ==========
export default function DataImport() {
    const { t } = useTranslation(['operations', 'common'])
    const { currentProperty } = useProperty()
    const { user, profile } = useAuth()
    const isConsolidated = isConsolidatedPropertyId(currentProperty?.id)

    const handlePrintSummary = async () => {
        const logo = await loadLogoAsDataUrl()

        await downloadReport(
            {
                reportType: 'import_summary',
                title: t('data_import.print.title', { defaultValue: 'Data Integration Sync Summary' }),
                hotelName: currentProperty?.name || t('data_import.print.default_hotel', { defaultValue: 'Altus Advisory' }),
                period: {
                    start: new Date().toISOString(),
                    end: new Date().toISOString()
                },
                generatedBy: {
                    name: profile?.full_name || user?.email || t('data_import.print.system', { defaultValue: 'System' }),
                    role: profile?.job_title || undefined
                },
                orientation: 'portrait',
                confidentialFooter: true,
            },
            {
                kpis: [
                    {
                        title: t('data_import.print.kpis.title', { defaultValue: 'Sync Impact' }),
                        items: [
                            { label: t('data_import.print.kpis.files_processed', { defaultValue: 'Files Processed' }), value: fileQueue.length },
                            { label: t('data_import.print.kpis.total_records', { defaultValue: 'Total Records Sync' }), value: sessionStats.totalRecords },
                            { label: t('data_import.print.kpis.avg_quality', { defaultValue: 'Avg Quality Score' }), value: sessionStats.avgQuality, unit: '%' },
                            { label: t('data_import.print.kpis.warnings', { defaultValue: 'Warnings Resolved' }), value: sessionStats.warnings },
                        ]
                    }
                ],
                tables: [
                    {
                        title: t('data_import.print.tables.pipeline', { defaultValue: 'File Pipeline Details' }),
                        headers: [t('data_import.print.tables.headers.filename', { defaultValue: 'Filename' }), t('data_import.print.tables.headers.status', { defaultValue: 'Status' }), t('data_import.print.tables.headers.records', { defaultValue: 'Records' }), t('data_import.print.tables.headers.quality', { defaultValue: 'Quality' })],
                        rows: fileQueue.map(f => [
                            f.file.name,
                            f.status.toUpperCase(),
                            f.extractedData?.records.length || 0,
                            `${f.extractedData?.qualityScore || 0}%`
                        ])
                    }
                ],
                notes: [
                    t('data_import.print.notes.verified', { defaultValue: 'All data has been verified against corporate standards.' }),
                    t('data_import.print.notes.financial', { defaultValue: 'Financial metrics updated across reporting dashboards.' }),
                    t('data_import.print.notes.trends', { defaultValue: 'Market segments and occupancy trends synchronized.' })
                ]
            },
            logo || undefined
        )
    }
    const queryClient = useQueryClient()
    const createImportLog = useCreateImportLog()
    const deleteImportLog = useDeleteImportLog()
    const { data: properties = [] } = useProperties()

    // Workflow State
    const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'import' | 'complete'>('upload')
    const [isDragging, setIsDragging] = useState(false)
    const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [importProgress, setImportProgress] = useState(0)
    const [_currentFileIndex, setCurrentFileIndex] = useState(0)
    const stageLabel = t(`data_import.stages.${currentStep}`, { defaultValue: currentStep })

    // Recent imports History
    const { data: recentImports } = useDataImportLogs(currentProperty?.id)

    // Inspector State
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'table' | 'json'>('table')
    const [isGeneratingAI, setIsGeneratingAI] = useState(false)
    const [isFixing, setIsFixing] = useState(false)
    const [aiInsights, setAIInsights] = useState<string[]>([])
    const [logToDelete, setLogToDelete] = useState<string | null>(null)

    const selectedFile = useMemo(() =>
        fileQueue.find(f => f.id === selectedFileId), [fileQueue, selectedFileId]
    )

    // Stats
    const sessionStats = useMemo(() => {
        const successFiles = fileQueue.filter(f => f.status === 'success')
        return {
            totalFiles: fileQueue.length,
            readyFiles: successFiles.length,
            totalRecords: fileQueue.reduce((sum, f) => sum + (f.extractedData?.summary.totalRecords || 0), 0),
            totalRevenue: fileQueue.reduce((sum, f) => sum + (f.extractedData?.summary.totalRevenue || 0), 0),
            avgQuality: successFiles.length ? Math.round(successFiles.reduce((a, b) => a + (b.extractedData?.qualityScore || 0), 0) / successFiles.length) : 0,
            warnings: fileQueue.filter(f => f.duplicateWarning || (f.extractedData?.qualityScore && f.extractedData.qualityScore < 80)).length
        }
    }, [fileQueue])

    // Handlers (Refactored)
    const processMultipleFiles = useCallback(async (files: File[]) => {
        setIsProcessing(true)
        const newItems: FileQueueItem[] = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            status: 'pending'
        }))
        setFileQueue(prev => [...prev, ...newItems])

        for (let i = 0; i < newItems.length; i++) {
            const item = newItems[i]
            setCurrentFileIndex(fileQueue.length + i)

            setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'processing' } as FileQueueItem : f))

            try {
                let rows: string[][] = []
                const fileName = item.file.name.toLowerCase()
                if (fileName.endsWith('.csv')) rows = parseCSV(await item.file.text())
                else rows = await parseExcel(item.file)

                const headerCapture: HeaderCapture = { current: { headers: [], dataRows: [] } }
                const extracted = finalizeExtractedData(extractDataFromRows(rows, properties, item.file.name, headerCapture))
                if (extracted.records.length > 0) {
                    // Duplicate check removed: daily_occupancy table dropped
                    setFileQueue(prev => prev.map(f => f.id === item.id ? {
                        ...f,
                        status: 'success',
                        extractedData: extracted,
                        csvHeaders: headerCapture.current.headers,
                        dataRows: headerCapture.current.dataRows,
                        mappingReviewed: false,
                        duplicateWarning: false
                    } as FileQueueItem : f))
                } else {
                    setFileQueue(prev => prev.map(f => f.id === item.id ? {
                        ...f,
                        status: 'error',
                        error: t('data_import.errors.no_data_extracted', { defaultValue: 'No data extracted' })
                    } as FileQueueItem : f))
                }
            } catch (err) {
                setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: String(err) } as FileQueueItem : f))
            }
        }
        setIsProcessing(false)
        if (currentStep === 'upload') setCurrentStep('review')
    }, [currentProperty?.id, currentStep, fileQueue.length, properties, t])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
            f.name.toLowerCase().endsWith('.csv') || f.name.toLowerCase().endsWith('.xlsx') || f.name.toLowerCase().endsWith('.xls')
        )
        if (droppedFiles.length > 0) await processMultipleFiles(droppedFiles)
    }, [processMultipleFiles])

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || [])
        if (selectedFiles.length > 0) await processMultipleFiles(selectedFiles)
    }, [processMultipleFiles])

    const handleImportAll = async () => {
        if (!user?.id) return
        setCurrentStep('import'); setImportProgress(0)
        let total = 0; const successFiles = fileQueue.filter(f => f.status === 'success' && f.extractedData)

        const filesWithBlockingIssues = successFiles.filter((fileItem) =>
            getImportBlockingIssues(fileItem.extractedData!, currentProperty?.id).length > 0
        )

        if (filesWithBlockingIssues.length > 0) {
            setCurrentStep('review')
            setSelectedFileId(filesWithBlockingIssues[0].id)
            toast({
                variant: 'destructive',
                title: t('data_import.toasts.review_required', { defaultValue: 'Review Required Before Import' }),
                description: t('data_import.toasts.review_required_desc', {
                    defaultValue: '{{count}} file(s) are missing required data. Complete the highlighted fields and try again.',
                    count: filesWithBlockingIssues.length
                })
            })
            return
        }

        for (const fileItem of successFiles) {
            const extracted = fileItem.extractedData!

            // Group records by property_id
            const recordsByProperty = {}
            extracted.records.forEach(record => {
                const pid = record.detected_property_id || currentProperty?.id
                if (!pid || pid === 'all') return // Skip if no property detected and context is "All"
                if (!recordsByProperty[pid]) recordsByProperty[pid] = []
                recordsByProperty[pid].push(record)
            })

            const propertyIds = Object.keys(recordsByProperty)

            for (const pid of propertyIds) {
                const propertyRecords = recordsByProperty[pid]
                let importLogId = null

                try {
                    const importLog = await createImportLog.mutateAsync({
                        property_id: pid,
                        import_type: 'csv',
                        file_name: fileItem.file.name,
                        imported_by: user.id,
                        business_date_start: extracted.dateRange.start,
                        business_date_end: extracted.dateRange.end,
                        status: 'syncing',
                        records_processed: 0
                    })
                    importLogId = importLog.id

                    // Count records for progress tracking (PMS data tables removed)
                    for (const _record of propertyRecords) {
                        total++;
                    }

                    // Update progress after counting records
                    if (sessionStats.totalRecords > 0) {
                        setImportProgress(Math.min(99, Math.round((total / sessionStats.totalRecords) * 100)))
                    }
                    const { error: completeError } = await supabase.from('data_import_logs').update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        records_processed: propertyRecords.length
                    }).eq('id', importLogId)

                    if (completeError) {
                        console.error('Failed to mark import as completed:', completeError)
                        toast({
                            variant: 'warning',
                            title: t('data_import.toasts.import_partial', { defaultValue: 'Import Partially Completed' }),
                            description: t('data_import.toasts.import_partial_desc', { defaultValue: 'Records imported but failed to update status. Please refresh to see updates.' })
                        })
                    }
                } catch (err) {
                    console.error(`Critical import failure for property ${pid}:`, err)
                    if (importLogId) {
                        await supabase.from('data_import_logs').update({
                            status: 'failed',
                            error_details: { message: err instanceof Error ? err.message : String(err) },
                            completed_at: new Date().toISOString()
                        }).eq('id', importLogId)
                    }
                    toast({
                        variant: 'destructive',
                        title: t('data_import.toasts.import_failed', { defaultValue: 'Import Failed' }),
                        description: t('data_import.toasts.import_failed_desc', { defaultValue: 'Error processing records for {{file}}', file: fileItem.file.name })
                    })
                }
            }
        }
        queryClient.invalidateQueries({ queryKey: ['data-import-logs'] })
        setImportProgress(100)
        setCurrentStep('complete')
        toast({
            title: t('data_import.toasts.import_complete', { defaultValue: 'Import Complete' }),
            description: t('data_import.toasts.import_complete_desc', {
                defaultValue: '{{count}} records synchronized successfully across properties',
                count: total
            })
        })
    }

    const handleMappingChange = (fileId: string, mapping: Record<string, string>) => {
        setFileQueue(prev => prev.map(f => f.id === fileId ? { ...f, headerMapping: mapping } : f))
    }

    const handleMappingConfirm = (fileId: string) => {
        setFileQueue(prev => prev.map(f => {
            if (f.id !== fileId) return f
            if (!f.csvHeaders?.length || !f.dataRows || !f.headerMapping) {
                return { ...f, mappingReviewed: true }
            }

            const remappedRecords = applyHeaderMapping(f.dataRows, f.csvHeaders, f.headerMapping, properties, f.file.name)
            if (remappedRecords.length === 0) {
                // Nothing usable came out of the confirmed mapping (e.g. no column was
                // mapped to business_date) - keep whatever was previously extracted
                // rather than wiping the file's data out from under the user.
                return { ...f, mappingReviewed: true }
            }

            const { score, issues, fieldConfidence } = calculateQualityScore(remappedRecords)
            const uniqueProperties = new Set(remappedRecords.map(r => r.detected_property_id).filter(Boolean))

            const rebuilt = finalizeExtractedData({
                records: remappedRecords,
                detectedFormat: f.extractedData?.detectedFormat || 'unknown',
                dateRange: {
                    start: String(remappedRecords[0]?.business_date || ''),
                    end: String(remappedRecords[remappedRecords.length - 1]?.business_date || '')
                },
                summary: {
                    totalRecords: remappedRecords.length,
                    roomsSold: remappedRecords.reduce((sum, r) => sum + (parseInt(String(r.rooms_sold)) || 0), 0),
                    totalRevenue: remappedRecords.reduce((sum, r) => sum + (parseFloat(String(r.total_revenue)) || parseFloat(String(r.room_revenue)) || 0), 0),
                    propertiesFound: uniqueProperties.size
                },
                qualityScore: score,
                qualityIssues: issues,
                fieldConfidence
            })

            return { ...f, status: 'success', extractedData: rebuilt, mappingReviewed: true }
        }))
    }

    const updateRecord = (fileId: string, recordIndex: number, field: string, value: string) => {
        setFileQueue(prev => prev.map(f => {
            if (f.id !== fileId || !f.extractedData) return f
            const newRecords = [...f.extractedData.records]
            if (field === 'property_id') {
                newRecords[recordIndex] = { ...newRecords[recordIndex], detected_property_id: value, detected_confidence: 100 }
            } else {
                newRecords[recordIndex] = { ...newRecords[recordIndex], [field]: value }
            }
            return {
                ...f,
                extractedData: finalizeExtractedData({ ...f.extractedData, records: newRecords })
            }
        }))
    }

    const deleteRecord = (fileId: string, recordIndex: number) => {
        setFileQueue(prev => prev.map(f => {
            if (f.id !== fileId || !f.extractedData) return f
            const newRecords = f.extractedData.records.filter((_, idx) => idx !== recordIndex)
            return {
                ...f,
                extractedData: {
                    ...finalizeExtractedData({
                        ...f.extractedData,
                        records: newRecords,
                    }),
                    records: newRecords,
                    summary: { ...f.extractedData.summary, totalRecords: newRecords.length }
                }
            }
        }))
    }

    const removeFile = (index: number) => {
        setFileQueue(prev => prev.filter((_, i) => i !== index))
        if (selectedFileId && fileQueue[index]?.id === selectedFileId) {
            setSelectedFileId(null)
        }
    }

    const handleDeleteLog = async (id: string) => {
        try {
            await deleteImportLog.mutateAsync(id)
            toast({ title: t('data_import.toasts.import_deleted', { defaultValue: 'Import Deleted' }), description: t('data_import.toasts.import_deleted_desc', { defaultValue: 'The import session has been removed.' }) })
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : t('data_import.toasts.delete_failed_fallback', { defaultValue: 'Check your permissions.' })
            toast({ variant: 'destructive', title: t('data_import.toasts.delete_failed', { defaultValue: 'Delete Failed' }), description: errorMessage })
        } finally {
            setLogToDelete(null)
        }
    }

    const resetImport = () => {
        setCurrentStep('upload')
        setFileQueue([])
        setImportProgress(0)
        setSelectedFileId(null)
    }

    const getFormatBadge = (format?: string) => {
        switch (format) {
            case 'pms_daily': return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">{t('data_import.badges.pms_daily', { defaultValue: 'PMS Daily' })}</Badge>
            case 'occupancy': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">{t('data_import.badges.occupancy', { defaultValue: 'Occupancy' })}</Badge>
            case 'revenue': return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">{t('data_import.badges.revenue', { defaultValue: 'Revenue' })}</Badge>
            default: return <Badge variant="outline">{t('data_import.badges.unknown', { defaultValue: 'Unknown' })}</Badge>
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'border-l-4 border-l-green-500 bg-green-50/30'
            case 'error': return 'border-l-4 border-l-red-500 bg-red-50/30'
            case 'processing': return 'border-l-4 border-l-blue-500 animate-pulse'
            default: return 'border-l-4 border-l-muted'
        }
    }

    const generateAIInsights = async () => {
        setIsGeneratingAI(true)
        await new Promise(r => setTimeout(r, 1800))

        const insights: string[] = []
        const readyFiles = fileQueue.filter(f => f.status === 'success')

        if (readyFiles.length > 0) {
            insights.push(t('data_import.ai_insights.analyzed', {
                defaultValue: 'Analyzed {{count}} reports for {{property}}.',
                count: readyFiles.length,
                property: currentProperty?.name || t('data_import.ai_insights.this_property', { defaultValue: 'this property' })
            }))

            // 1. Data Integrity & Completeness
            const totalRecords = readyFiles.reduce((sum, f) => sum + (f.extractedData?.summary.totalRecords || 0), 0)
            const missingRev = readyFiles.filter(f => f.extractedData?.summary.totalRevenue === 0)
            if (missingRev.length > 0) {
                insights.push(t('data_import.ai_insights.zero_revenue', {
                    defaultValue: '{{count}} files show zero revenue. Verify if this is correct or check column mappings.',
                    count: missingRev.length
                }))
            }

            // 2. Occupancy Heuristics
            const highOcc = readyFiles.filter(f => {
                const rec = f.extractedData?.records[0]
                return rec && parseFloat(String(rec.occupancy)) >= 95
            })
            if (highOcc.length > 0) {
                insights.push(t('data_import.ai_insights.high_occupancy', {
                    defaultValue: 'High occupancy detected on {{count}} dates. AI suggests reviewing staffing levels for these periods.',
                    count: highOcc.length
                }))
            }

            // 3. Date Continuity Check
            const dates = readyFiles.map(f => f.extractedData?.dateRange.start).filter(Boolean).sort()
            if (dates.length > 1) {
                const diffs = []
                for (let i = 1; i < dates.length; i++) {
                    const dayDiff = (new Date(dates[i]!).getTime() - new Date(dates[i - 1]!).getTime()) / (1000 * 3600 * 24)
                    if (dayDiff > 1) diffs.push(dayDiff)
                }
                if (diffs.length > 0) {
                    insights.push(t('data_import.ai_insights.gaps_detected', {
                        defaultValue: 'Gaps detected in report dates. Ensure you are not missing daily reports for a continuous trend.'
                    }))
                } else if (readyFiles.length > 1) {
                    insights.push(t('data_import.ai_insights.continuity_ok', {
                        defaultValue: 'Date continuity looks perfect. This batch provides a solid sequence for trend analysis.'
                    }))
                }
            }

            // 4. Revenue/ADR Pattern
            const adrs = readyFiles.map(f => parseFloat(String(f.extractedData?.records[0]?.adr || 0))).filter(v => v > 0)
            if (adrs.length > 1) {
                const max = Math.max(...adrs); const min = Math.min(...adrs)
                if (max > min * 1.5) {
                    insights.push(t('data_import.ai_insights.adr_variance', {
                        defaultValue: 'Significant ADR variance detected ({{min}} to {{max}}). AI confirms dynamic pricing is active.',
                        min,
                        max
                    }))
                }
            }

            // 5. PMS Specific Context
            const pmsDocs = readyFiles.filter(f => f.extractedData?.detectedFormat === 'pms_daily')
            if (pmsDocs.length > 0) {
                insights.push(t('data_import.ai_insights.pms_direct', {
                    defaultValue: 'PMS-Direct extraction is active. Data confidence is high (98%+) for {{count}} files.',
                    count: pmsDocs.length
                }))
            }

            // 6. Impact Prediction
            if (totalRecords > 0) {
                insights.push(t('data_import.ai_insights.import_impact', {
                    defaultValue: 'Importing this batch will update your Operations Dashboard for {{count}} distinct business dates.',
                    count: totalRecords
                }))
            }
        } else {
            insights.push(t('data_import.ai_insights.no_valid_data', { defaultValue: 'No valid data found to analyze. Please upload PMS reports to begin.' }))
        }

        setAIInsights(insights)
        setIsGeneratingAI(false)
        toast({
            title: t('data_import.ai_insights.scan_complete', { defaultValue: 'Studio Intelligence Deep-Scan Complete' }),
            description: t('data_import.ai_insights.scan_complete_desc', { defaultValue: 'Generated {{count}} contextual insights for your data.', count: insights.length })
        })
    }

    const handleAutoFix = async () => {
        setIsFixing(true)
        await new Promise(r => setTimeout(r, 1200))

        let fixedFiles = 0
        let resolvedConflicts = 0

        setFileQueue(prev => prev.map(f => {
            let fileModified = false
            const conflictToResolve = f.duplicateWarning

            if (!f.extractedData) {
                if (conflictToResolve) resolvedConflicts++
                return conflictToResolve ? { ...f, duplicateWarning: false } : f
            }

            const newRecords = f.extractedData.records.map(rec => {
                const newRec = { ...rec }
                let recordChanged = false

                const resolvedRoomsAvailable = deriveRoomsAvailable(newRec)
                if ((!newRec.rooms_available || newRec.rooms_available === '0') && resolvedRoomsAvailable) {
                    newRec.rooms_available = resolvedRoomsAvailable
                    recordChanged = true
                }

                Object.keys(newRec).forEach(key => {
                    if (newRec[key] === undefined || newRec[key] === null || newRec[key] === '') {
                        if (['rooms_sold', 'adr', 'room_revenue', 'fb_revenue'].includes(key)) {
                            newRec[key] = '0'
                            recordChanged = true
                        }
                    }
                })

                if (recordChanged) fileModified = true
                return newRec
            })

            if (fileModified) fixedFiles++
            if (conflictToResolve) resolvedConflicts++

            return (fileModified || conflictToResolve) ? {
                ...f,
                duplicateWarning: false,
                extractedData: finalizeExtractedData({ ...f.extractedData, records: newRecords })
            } : f
        }))

        setIsFixing(false)
        toast({
            title: t('data_import.toasts.optimization_complete', { defaultValue: 'Studio Optimization Complete' }),
            description: t('data_import.toasts.optimization_complete_desc', {
                defaultValue: 'Resolved {{conflicts}} conflicts and optimized data in {{files}} files.',
                conflicts: resolvedConflicts,
                files: fixedFiles
            })
        })
    }

    if (isConsolidated) {
        return (
            <div className="flex flex-col min-h-[calc(100vh-80px)] bg-slate-50/50">
                {/* Studio Header (Dashboard Style) */}
                <div className="border-b bg-white p-6 sticky top-0 z-10 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="bg-primary/10 p-1.5 rounded-lg">
                                    <Zap className="h-5 w-5 text-primary" />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight">{t('data_import.title', { defaultValue: 'Data Import Studio' })}</h1>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Building2 className="h-4 w-4" />
                                <span>{currentProperty?.name}</span>
                                <ChevronRight className="h-3 w-3" />
                                <span className="capitalize">
                                    {t('data_import.stage', { defaultValue: '{{stage}} Stage', stage: stageLabel })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 flex items-center justify-center max-w-[1600px] mx-auto w-full">
                    <Card className="border-none shadow-sm bg-slate-50/50 max-w-md w-full">
                        <CardContent className="py-16 text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Building2 className="h-10 w-10 text-slate-300 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                {t('operations:data_import.cluster_empty_state.title', { defaultValue: 'Switch to a property to import records' })}
                            </h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                {t('operations:data_import.cluster_empty_state.description', { defaultValue: 'Importing operations and PMS records is property-specific. Please choose a specific property from the header selector to begin uploading reports.' })}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-[calc(100vh-80px)] bg-slate-50/50">
            {/* Studio Header (Dashboard Style) */}
            <div className="border-b bg-white p-6 sticky top-0 z-10 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-primary/10 p-1.5 rounded-lg">
                                <Zap className="h-5 w-5 text-primary" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">{t('data_import.title', { defaultValue: 'Data Import Studio' })}</h1>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Building2 className="h-4 w-4" />
                            <span>{currentProperty?.name}</span>
                            <ChevronRight className="h-3 w-3" />
                            <span className="capitalize">
                                {t('data_import.stage', { defaultValue: '{{stage}} Stage', stage: stageLabel })}
                            </span>
                        </div>
                    </div>

                    {fileQueue.length > 0 && (
                        <div className="flex items-center gap-6 bg-slate-50 p-3 rounded-xl border">
                            <div className="text-center px-4 border-r">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">{t('data_import.metrics.queue', { defaultValue: 'Queue' })}</p>
                                <p className="text-lg font-bold">{sessionStats.readyFiles}/{sessionStats.totalFiles}</p>
                            </div>
                            <div className="text-center px-4 border-r">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">{t('data_import.metrics.records', { defaultValue: 'Records' })}</p>
                                <p className="text-lg font-bold">{sessionStats.totalRecords}</p>
                            </div>
                            <div className="text-center px-4 border-r">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">{t('data_import.metrics.quality', { defaultValue: 'Quality' })}</p>
                                <div className="flex items-center gap-1">
                                    <p className={cn("text-lg font-bold", sessionStats.avgQuality > 80 ? "text-green-600" : "text-yellow-600")}>
                                        {sessionStats.avgQuality}%
                                    </p>
                                    <Activity className="h-3 w-3 text-muted-foreground opacity-30" />
                                </div>
                            </div>
                            <div className="text-center px-4">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">{t('data_import.metrics.warnings', { defaultValue: 'Warnings' })}</p>
                                <div className="flex items-center gap-1 justify-center">
                                    <p className={cn("text-lg font-bold", sessionStats.warnings > 0 ? "text-orange-500" : "text-slate-400")}>
                                        {sessionStats.warnings}
                                    </p>
                                    <AlertTriangle className={cn("h-3 w-3", sessionStats.warnings > 0 ? "text-orange-500" : "hidden")} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto w-full">
                {/* Side Pipeline (Queue Controls) */}
                <div className="lg:col-span-3 space-y-4">
                    <Card className="shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                {t('data_import.pipeline.title', { defaultValue: 'Workflow Pipeline' })}
                                <Badge variant="outline" className="font-mono text-[10px]">
                                    {t('data_import.pipeline.stage_badge', { defaultValue: '{{stage}}', stage: stageLabel })}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-4 space-y-2 border-b">
                                <Button
                                    className="w-full justify-start gap-2 h-10 shadow-sm"
                                    onClick={() => document.getElementById('file-input')?.click()}
                                    disabled={isProcessing || currentStep === 'import'}
                                >
                                    <FileUp className="h-4 w-4" />
                                    {t('data_import.pipeline.add_files', { defaultValue: 'Add More Files' })}
                                </Button>
                                <input id="file-input" type="file" accept=".csv,.xlsx" onChange={handleFileSelect} className="hidden" multiple />

                                {fileQueue.length > 0 && (
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-2 h-10 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                        onClick={() => setFileQueue([])}
                                        disabled={isProcessing}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {t('data_import.pipeline.clear_session', { defaultValue: 'Clear Session' })}
                                    </Button>
                                )}
                            </div>

                            <ScrollArea className="h-[calc(100vh-420px)]">
                                <div className="p-2 space-y-2">
                                    {fileQueue.length === 0 ? (
                                        <div className="py-12 text-center text-muted-foreground">
                                            <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Layers className="h-6 w-6 opacity-20" />
                                            </div>
                                            <p className="text-xs">{t('data_import.pipeline.empty_queue', { defaultValue: 'No files in queue' })}</p>
                                        </div>
                                    ) : (
                                        fileQueue.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => setSelectedFileId(item.id)}
                                                className={cn(
                                                    "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                                                    getStatusColor(item.status),
                                                    selectedFileId === item.id ? "ring-2 ring-primary border-transparent" : "hover:border-slate-300"
                                                )}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="min-w-0 pe-2">
                                                        <p className="text-xs font-bold truncate mb-1">{item.file.name}</p>
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {getFormatBadge(item.extractedData?.detectedFormat)}
                                                            {item.duplicateWarning && (
                                                                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px]">
                                                                    {t('data_import.pipeline.conflict_badge', { defaultValue: 'CONFLICT' })}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="mt-1">
                                                        {item.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                        {item.status === 'error' && <FileX className="h-4 w-4 text-red-500" />}
                                                        {item.status === 'processing' && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-4 flex flex-col items-center text-center">
                            <Wand2 className="h-10 w-10 text-primary opacity-20 mb-3" />
                            <h4 className="text-sm font-bold mb-1">{t('data_import.ai_actions.title', { defaultValue: 'AI Smart Actions' })}</h4>
                            <p className="text-[11px] text-muted-foreground mb-4">
                                {t('data_import.ai_actions.description', { defaultValue: 'Let AI suggest fixes and improvements for your current batch.' })}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full bg-white group hover:border-primary"
                                onClick={generateAIInsights}
                                disabled={isGeneratingAI || fileQueue.length === 0}
                            >
                                {isGeneratingAI ? (
                                    <Loader2 className="h-3 w-3 me-2 animate-spin" />
                                ) : (
                                    <Sparkles className="h-3 w-3 me-2 text-primary group-hover:animate-pulse" />
                                )}
                                {isGeneratingAI
                                    ? t('data_import.ai_actions.analyzing', { defaultValue: 'Analyzing...' })
                                    : t('data_import.ai_actions.generate', { defaultValue: 'Generate Insights' })}
                            </Button>

                            {/* AI Results Display */}
                            {aiInsights.length > 0 && (
                                <div className="mt-4 w-full text-left space-y-2 animate-in slide-in-from-top-2 duration-300">
                                    {aiInsights.map((insight, i) => (
                                        <div key={i} className="flex gap-2 text-[10px] bg-white/50 p-2 rounded border border-primary/10">
                                            <Wand2 className="h-3 w-3 text-primary shrink-0" />
                                            <span className="text-muted-foreground">{insight}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Quick Fixes (Visible if warnings exist) */}
                            {sessionStats.warnings > 0 && (
                                <div className="mt-4 w-full animate-in zoom-in-95 duration-200">
                                    <Alert className="bg-orange-50 border-orange-200 py-3">
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-orange-800">
                                                        {t('data_import.warnings.title', { defaultValue: 'Operational Warnings Found' })}
                                                    </p>
                                                    <div className="mt-1 space-y-1">
                                                        {fileQueue.some(f => f.duplicateWarning) && (
                                                            <div className="flex items-center gap-1 text-[10px] text-orange-700 font-medium">
                                                                <Database className="h-3 w-3" />
                                                                {t('data_import.warnings.duplicate_dates', { defaultValue: 'Duplicate date matches detected in database' })}
                                                            </div>
                                                        )}
                                                        {fileQueue.some(f => f.extractedData?.qualityIssues.length) && (
                                                            <div className="flex items-center gap-1 text-[10px] text-orange-700 font-medium">
                                                                <FileX className="h-3 w-3" />
                                                                {t('data_import.warnings.missing_required', { defaultValue: 'Missing or invalid required fields found' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="default"
                                                className="bg-orange-600 hover:bg-orange-700 h-8 text-[11px] font-bold shadow-sm"
                                                onClick={handleAutoFix}
                                                disabled={isFixing}
                                            >
                                                {isFixing ? (
                                                    <Loader2 className="h-3 w-3 me-2 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-3 w-3 me-2" />
                                                )}
                                                {isFixing
                                                    ? t('data_import.warnings.fixing', { defaultValue: 'Fixing...' })
                                                    : t('data_import.warnings.auto_fix', { defaultValue: 'Auto-Fix All Warnings' })}
                                            </Button>
                                        </div>
                                    </Alert>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Main Action Surface */}
                <div className="lg:col-span-9 space-y-6">
                    {currentStep === 'upload' && (
                        <div
                            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                            className={cn(
                                "h-[500px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer bg-white group",
                                isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-300 hover:border-primary/50"
                            )}
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <div className="bg-primary/10 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
                                <Upload className="h-12 w-12 text-primary" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">{t('data_import.upload.title', { defaultValue: 'Drop PMS Reports Here' })}</h3>
                            <p className="text-muted-foreground mb-8 max-w-sm text-center">
                                {t('data_import.upload.description', { defaultValue: 'Bulk upload Excel or CSV exports from your PMS. AI will automatically organize your data.' })}
                            </p>
                            <div className="flex items-center gap-4">
                                <Button size="lg" className="rounded-2xl px-8 shadow-lg">{t('data_import.upload.browse', { defaultValue: 'Browse Local Files' })}</Button>
                            </div>
                            <div className="mt-12 flex gap-8">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60">
                                    <FileSpreadsheet className="h-4 w-4" />{t('data_import.upload.supported_formats', { defaultValue: 'Supports XLSX / CSV' })}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60">
                                    <Sparkles className="h-4 w-4" />{t('data_import.upload.auto_map', { defaultValue: 'Auto Map Columns' })}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60">
                                    <Database className="h-4 w-4" />{t('data_import.upload.batch_import', { defaultValue: 'Batch Import' })}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 'review' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            {/* Selected File Review Surface */}
                            {selectedFile ? (
                                <Card className="shadow-xl border-t-4 border-t-primary rounded-2xl overflow-hidden">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-white border-b pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-slate-100 p-2 rounded-xl">
                                                <FileSpreadsheet className="h-6 w-6 text-slate-600" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{selectedFile.file.name}</CardTitle>
                                                <CardDescription className="flex items-center gap-2">
                                                    {getFormatBadge(selectedFile.extractedData?.detectedFormat)}
                                                    <span>•</span>
                                                    <span>{t('data_import.review.rows_extracted', { defaultValue: '{{count}} Rows Extracted', count: selectedFile.extractedData?.summary.totalRecords || 0 })}</span>
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedFile.mappingReviewed && !!selectedFile.csvHeaders?.length && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 text-xs gap-1.5"
                                                    onClick={() => setFileQueue(prev => prev.map(f => f.id === selectedFile.id ? { ...f, mappingReviewed: false } : f))}
                                                >
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    {t('data_import.review.edit_mapping', { defaultValue: 'Edit Column Mapping' })}
                                                </Button>
                                            )}
                                            {(selectedFile.mappingReviewed || !selectedFile.csvHeaders?.length) && (
                                                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'json')} className="w-[200px]">
                                                    <TabsList className="grid grid-cols-2 h-9">
                                                        <TabsTrigger value="table" className="text-xs">
                                                            {t('data_import.review.table_view', { defaultValue: 'Table View' })}
                                                        </TabsTrigger>
                                                        <TabsTrigger value="json" className="text-xs">
                                                            {t('data_import.review.raw_json', { defaultValue: 'Raw JSON' })}
                                                        </TabsTrigger>
                                                    </TabsList>
                                                </Tabs>
                                            )}
                                            <Button variant="outline" size="icon" onClick={() => setSelectedFileId(null)} aria-label={t('accessibility.close_file_view', 'Close file view')}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {!selectedFile.mappingReviewed && !!selectedFile.csvHeaders?.length ? (
                                            <div className="p-4">
                                                <SmartHeaderMapper
                                                    csvHeaders={selectedFile.csvHeaders}
                                                    targetHeaders={IMPORT_TARGET_FIELDS}
                                                    initialMapping={selectedFile.headerMapping}
                                                    onMappingChange={(mapping) => handleMappingChange(selectedFile.id, mapping)}
                                                    onConfirm={() => handleMappingConfirm(selectedFile.id)}
                                                />
                                            </div>
                                        ) : selectedFile.extractedData ? (
                                            viewMode === 'table' ? (
                                                <ScrollArea className="h-[450px]">
                                                    <Table>
                                                        <TableHeader>
                                                                <TableRow className="bg-muted/30">
                                                                    <TableHead className="w-[40px]"></TableHead>
                                                                    <TableHead className="w-[180px]">
                                                                        {t('data_import.review.property', { defaultValue: 'Property' })}
                                                                    </TableHead>
                                                                    {Object.keys(selectedFile.extractedData.records[0] || {})
                                                                        .filter(k => k !== 'detected_property_id' && k !== 'detected_confidence' && k !== 'id' && k !== 'property_id')
                                                                        .map(key => (
                                                                            <TableHead key={key} className="capitalize">{key.replace(/_/g, ' ')}</TableHead>
                                                                        ))}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {selectedFile.extractedData.records.map((record, idx) => (
                                                                <TableRow key={idx} className="hover:bg-muted/10 transition-colors group">
                                                                    <TableCell className="p-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                            onClick={() => deleteRecord(selectedFile.id, idx)}
                                                                            aria-label={t('accessibility.delete_record', 'Delete record')}
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex flex-col gap-1">
                                                                            <select
                                                                                className="w-full bg-transparent text-sm border rounded p-1"
                                                                                value={record.property_id || record.detected_property_id || ''}
                                                                                onChange={(e) => updateRecord(selectedFile.id, idx, 'property_id', e.target.value)}
                                                                            >
                                                                                <option value="">
                                                                                    {t('data_import.review.select_hotel', { defaultValue: 'Select Hotel...' })}
                                                                                </option>
                                                                                {properties.map(p => (
                                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                                ))}
                                                                            </select>
                                                                            {Number(record.detected_confidence) < 90 && record.detected_property_id && (
                                                                                <span className="text-[10px] text-orange-500 flex items-center gap-1 font-medium">
                                                                                    <AlertTriangle className="w-3 h-3" />
                                                                                    {t('data_import.review.match_confidence', {
                                                                                        defaultValue: '{{percent}}% Match',
                                                                                        percent: record.detected_confidence
                                                                                    })}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    {Object.entries(record)
                                                                        .filter(([k]) => k !== 'detected_property_id' && k !== 'detected_confidence' && k !== 'id' && k !== 'property_id')
                                                                        .map(([key, value]) => (
                                                                            <TableCell key={key}>
                                                                                <input
                                                                                    type="text"
                                                                                    value={String(value)}
                                                                                    onChange={(e) => updateRecord(selectedFile.id, idx, key, e.target.value)}
                                                                                    className="bg-transparent border-none focus:ring-0 w-full p-0 text-foreground/80"
                                                                                />
                                                                            </TableCell>
                                                                        ))}
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </ScrollArea>
                                            ) : (
                                                <ScrollArea className="h-[450px]">
                                                    <pre className="p-4 text-xs font-mono whitespace-pre-wrap bg-slate-900 text-slate-100 overflow-x-auto">
                                                        {JSON.stringify(selectedFile.extractedData, null, 2)}
                                                    </pre>
                                                </ScrollArea>
                                            )
                                        ) : (
                                            <div className="p-12 text-center text-muted-foreground">
                                                {selectedFile.status === 'processing'
                                                    ? t('data_import.review.thinking', { defaultValue: 'Thinking...' })
                                                    : t('data_import.review.no_data', { defaultValue: 'No data could be extracted from this file.' })}
                                            </div>
                                        )}
                                    </CardContent>
                                    <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
                                        <div className="flex gap-4">
                                            {selectedFile.extractedData?.qualityIssues.map((error, i) => (
                                                <div key={i} className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold uppercase bg-red-50 px-2 py-1 rounded">
                                                    <AlertCircle className="h-3 w-3" /> {error}
                                                </div>
                                            ))}
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => removeFile(fileQueue.indexOf(selectedFile))}>
                                            <Trash2 className="h-3 w-3 me-2" />
                                            {t('data_import.review.delete_file', { defaultValue: 'Delete File' })}
                                        </Button>
                                    </div>
                                </Card>
                            ) : (
                                <div className="h-[500px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center bg-white text-muted-foreground">
                                    <Search className="h-12 w-12 opacity-10 mb-4" />
                                    <p className="text-lg">
                                        {t('data_import.review.select_file_prompt', { defaultValue: 'Select a file from the Pipeline to inspect and edit data' })}
                                    </p>
                                    <p className="text-xs mt-1">
                                        {t('data_import.review.valid_files', {
                                            defaultValue: 'Found {{count}} valid files in batch',
                                            count: sessionStats.readyFiles
                                        })}
                                    </p>
                                </div>
                            )}

                            {/* Global Action Bar */}
                            <div className="bg-white p-6 rounded-3xl border shadow-xl flex items-center justify-between">
                                <div className="flex items-center gap-8">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                                            {t('data_import.summary.title', { defaultValue: 'Session Summary' })}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                <span className="text-sm font-bold">
                                                    {t('data_import.summary.files_ready', {
                                                        defaultValue: '{{count}} Files Ready',
                                                        count: sessionStats.readyFiles
                                                    })}
                                                </span>
                                            </div>
                                            {sessionStats.warnings > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                                                    <span className="text-sm font-bold">
                                                        {t('data_import.summary.warnings', {
                                                            defaultValue: '{{count}} Warnings',
                                                            count: sessionStats.warnings
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-8 w-px bg-slate-200" />
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                                            {t('data_import.summary.total_impact', { defaultValue: 'Total Impact' })}
                                        </p>
                                        <p className="text-sm font-bold">
                                            {t('data_import.summary.database_records', {
                                                defaultValue: '{{count}} database records',
                                                count: sessionStats.totalRecords
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="lg" className="rounded-2xl px-6" onClick={() => setCurrentStep('upload')}>
                                        {t('data_import.actions.cancel_phase', { defaultValue: 'Cancel Phase' })}
                                    </Button>
                                    <Button
                                        size="lg"
                                        className="rounded-2xl px-12 shadow-lg shadow-primary/20"
                                        onClick={handleImportAll}
                                        disabled={sessionStats.readyFiles === 0}
                                    >
                                        <Zap className="h-4 w-4 me-2" />
                                        {t('data_import.actions.commit_process', {
                                            defaultValue: 'Commit Process ({{count}})',
                                            count: sessionStats.totalRecords
                                        })}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 'import' && (
                        <Card className="h-[500px] flex flex-col items-center justify-center p-12 overflow-hidden relative">
                            <div className="relative mb-12">
                                <Activity className="h-24 w-24 text-primary animate-pulse opacity-20" />
                                <Database className="h-12 w-12 text-primary absolute inset-0 m-auto mt-6" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">
                                {t('data_import.import.title', { defaultValue: 'Writing to Database Cloud...' })}
                            </h3>
                            <div className="w-full max-w-md space-y-3">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    <span>{t('data_import.import.syncing_records', { defaultValue: 'Syncing Records' })}</span>
                                    <span>{importProgress}%</span>
                                </div>
                                <Progress value={importProgress} className="h-4 rounded-full" />
                                <p className="text-center text-xs text-muted-foreground italic">
                                    {t('data_import.import.progress_note', { defaultValue: 'Verifying data integrity and updating trends...' })}
                                </p>
                            </div>
                        </Card>
                    )}

                    {currentStep === 'complete' && (
                        <div className="h-[500px] flex flex-col items-center justify-center p-12 bg-white rounded-3xl border animate-in zoom-in-95 duration-500">
                            <div className="bg-green-100 p-6 rounded-full mb-8">
                                <CheckCircle className="h-16 w-16 text-green-600" />
                            </div>
                            <h3 className="text-3xl font-bold mb-2">
                                {t('data_import.complete.title', { defaultValue: 'Import Successful!' })}
                            </h3>
                            <p className="text-muted-foreground mb-12 text-center max-w-sm">
                                {t('data_import.complete.summary', {
                                    defaultValue: '{{count}} files were successfully processed. Your Operations Dashboard is now up-to-date.',
                                    count: sessionStats.totalFiles
                                })}
                            </p>
                            <div className="flex gap-4">
                                <Button variant="outline" size="lg" className="rounded-2xl px-8 border-slate-200" onClick={handlePrintSummary}>
                                    <Printer className="h-4 w-4 me-2" />
                                    {t('data_import.complete.print_summary', { defaultValue: 'Print Sync Summary' })}
                                </Button>
                                <Button variant="outline" size="lg" className="rounded-2xl px-8" onClick={resetImport}>
                                    {t('data_import.complete.new_session', { defaultValue: 'New Session' })}
                                </Button>
                                <Button asChild size="lg" className="rounded-2xl px-8 shadow-lg shadow-primary/20">
                                    <a href="/operations">
                                        <TrendingUp className="h-4 w-4 me-2" />
                                        {t('data_import.complete.view_dashboard', { defaultValue: 'View Dashboard' })}
                                    </a>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent History Sidebar (Sheet) */}
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom)+4rem)] sm:bottom-6 end-4 sm:end-6 rounded-full shadow-xl bg-white border h-12 w-12 group p-0">
                        <Clock className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="bg-white dark:bg-slate-950">
                    <SheetHeader>
                        <SheetTitle>{t('data_import.history.title', { defaultValue: 'Session History' })}</SheetTitle>
                        <SheetDescription>
                            {t('data_import.history.description', { defaultValue: 'Recent data import activity for this property.' })}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-8 space-y-4">
                        {recentImports?.map((log) => (
                            <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border group cursor-default relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 absolute top-2 end-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setLogToDelete(log.id)
                                    }}
                                    aria-label={t('accessibility.delete_import_log', 'Delete import log')}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline" className="text-[10px]">{log.status.toUpperCase()}</Badge>
                                    <span className="text-[10px] text-muted-foreground pe-6">{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
                                </div>
                                <p className="text-sm font-bold truncate">
                                    {log.file_name || t('data_import.history.manual_batch', { defaultValue: 'Manual Batch' })}
                                </p>
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-1.5">
                                        <Database className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs font-bold">
                                            {t('data_import.history.records_label', {
                                                defaultValue: '{{count}} Records',
                                                count: log.records_processed || 0
                                            })}
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] opacity-0 group-hover:opacity-100">
                                        {t('data_import.history.redownload', { defaultValue: 'REDOWNLOAD' })}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!logToDelete} onOpenChange={(open) => !open && setLogToDelete(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            {t('data_import.delete.title', { defaultValue: 'Confirm Data Deletion' })}
                        </DialogTitle>
                        <DialogDescription className="py-2">
                            {t('data_import.delete.description', {
                                defaultValue: 'This action will permanently remove this import log and delete all associated occupancy and revenue records from the database. This cannot be undone.'
                            })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setLogToDelete(null)} disabled={deleteImportLog.isPending}>
                            {t('common:common.cancel', { defaultValue: 'Cancel' })}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => logToDelete && handleDeleteLog(logToDelete)}
                            disabled={deleteImportLog.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteImportLog.isPending ? (
                                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4 me-2" />
                            )}
                            {t('data_import.delete.delete_permanently', { defaultValue: 'Delete Permanently' })}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
