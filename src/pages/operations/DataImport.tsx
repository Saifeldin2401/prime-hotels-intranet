import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateImportLog } from '@/hooks/useOperations'
import { toast } from '@/components/ui/use-toast'
import type { OccupancyCSVRow, RevenueCSVRow } from '@/types/operations'

type ImportType = 'occupancy' | 'revenue'

interface ValidationError {
    row: number
    field: string
    message: string
}

interface ImportState {
    status: 'idle' | 'validating' | 'importing' | 'success' | 'error'
    progress: number
    totalRows: number
    processedRows: number
    errors: ValidationError[]
}

// CSV Template definitions
const CSV_TEMPLATES = {
    occupancy: {
        headers: ['business_date', 'rooms_available', 'rooms_sold', 'rooms_ooo', 'adults', 'children', 'no_shows', 'cancellations', 'walk_ins'],
        sample: [
            ['2026-01-08', '100', '75', '2', '120', '15', '3', '5', '8'],
            ['2026-01-09', '100', '82', '1', '130', '18', '2', '3', '10'],
        ]
    },
    revenue: {
        headers: ['business_date', 'room_revenue', 'fb_revenue', 'spa_revenue', 'other_revenue', 'rooms_sold', 'cash_collections', 'credit_collections', 'ar_collections'],
        sample: [
            ['2026-01-08', '45000', '12000', '3500', '1500', '75', '15000', '35000', '8000'],
            ['2026-01-09', '52000', '14500', '4200', '2100', '82', '18000', '42000', '9500'],
        ]
    }
}

function parseCSV(text: string): string[][] {
    const lines = text.trim().split('\n')
    return lines.map(line => {
        // Handle quoted fields with commas
        const result: string[] = []
        let current = ''
        let inQuotes = false

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim())
                current = ''
            } else {
                current += char
            }
        }
        result.push(current.trim())
        return result
    })
}

function validateOccupancyRow(row: Record<string, string>, rowIndex: number): ValidationError[] {
    const errors: ValidationError[] = []

    // Required fields
    if (!row.business_date) {
        errors.push({ row: rowIndex, field: 'business_date', message: 'Business date is required' })
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.business_date)) {
        errors.push({ row: rowIndex, field: 'business_date', message: 'Invalid date format (use YYYY-MM-DD)' })
    }

    if (!row.rooms_available || isNaN(Number(row.rooms_available))) {
        errors.push({ row: rowIndex, field: 'rooms_available', message: 'Rooms available must be a number' })
    }

    if (!row.rooms_sold || isNaN(Number(row.rooms_sold))) {
        errors.push({ row: rowIndex, field: 'rooms_sold', message: 'Rooms sold must be a number' })
    }

    // Logical validation
    if (Number(row.rooms_sold) > Number(row.rooms_available)) {
        errors.push({ row: rowIndex, field: 'rooms_sold', message: 'Rooms sold cannot exceed rooms available' })
    }

    return errors
}

function validateRevenueRow(row: Record<string, string>, rowIndex: number): ValidationError[] {
    const errors: ValidationError[] = []

    if (!row.business_date) {
        errors.push({ row: rowIndex, field: 'business_date', message: 'Business date is required' })
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.business_date)) {
        errors.push({ row: rowIndex, field: 'business_date', message: 'Invalid date format (use YYYY-MM-DD)' })
    }

    if (!row.room_revenue || isNaN(Number(row.room_revenue))) {
        errors.push({ row: rowIndex, field: 'room_revenue', message: 'Room revenue must be a number' })
    }

    if (!row.rooms_sold || isNaN(Number(row.rooms_sold))) {
        errors.push({ row: rowIndex, field: 'rooms_sold', message: 'Rooms sold must be a number' })
    }

    return errors
}

export default function DataImport() {
    const { t } = useTranslation(['operations', 'common'])
    const { currentProperty } = useProperty()
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const createImportLog = useCreateImportLog()

    const [importType, setImportType] = useState<ImportType>('occupancy')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<Record<string, string>[]>([])
    const [state, setState] = useState<ImportState>({
        status: 'idle',
        progress: 0,
        totalRows: 0,
        processedRows: 0,
        errors: []
    })

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.csv')) {
            toast({
                title: 'Invalid file type',
                description: 'Please select a CSV file',
                variant: 'destructive'
            })
            return
        }

        setSelectedFile(file)
        setState(prev => ({ ...prev, status: 'idle', errors: [] }))

        // Parse the file
        const reader = new FileReader()
        reader.onload = (e) => {
            const text = e.target?.result as string
            const rows = parseCSV(text)

            if (rows.length < 2) {
                toast({
                    title: 'Empty file',
                    description: 'The CSV file must have a header row and at least one data row',
                    variant: 'destructive'
                })
                return
            }

            const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'))
            const data = rows.slice(1).map(row => {
                const obj: Record<string, string> = {}
                headers.forEach((header, index) => {
                    obj[header] = row[index] || ''
                })
                return obj
            })

            setParsedData(data)
            setState(prev => ({ ...prev, totalRows: data.length }))
        }
        reader.readAsText(file)
    }, [])

    const handleValidate = useCallback(() => {
        setState(prev => ({ ...prev, status: 'validating', errors: [], progress: 0 }))

        const errors: ValidationError[] = []
        const validateFn = importType === 'occupancy' ? validateOccupancyRow : validateRevenueRow

        parsedData.forEach((row, index) => {
            const rowErrors = validateFn(row, index + 2) // +2 for header row and 1-indexing
            errors.push(...rowErrors)
        })

        if (errors.length > 0) {
            setState(prev => ({ ...prev, status: 'error', errors, progress: 100 }))
        } else {
            setState(prev => ({ ...prev, status: 'idle', errors: [], progress: 100 }))
            toast({
                title: 'Validation successful',
                description: `${parsedData.length} rows ready to import`,
            })
        }
    }, [parsedData, importType])

    const handleImport = useCallback(async () => {
        if (!currentProperty?.id || !user?.id) {
            toast({
                title: 'Error',
                description: 'Please select a property',
                variant: 'destructive'
            })
            return
        }

        setState(prev => ({ ...prev, status: 'importing', progress: 0, processedRows: 0 }))

        // Create import log
        const importLog = await createImportLog.mutateAsync({
            property_id: currentProperty.id,
            import_type: 'csv',
            file_name: selectedFile?.name,
            imported_by: user.id,
            business_date_start: parsedData[0]?.business_date,
            business_date_end: parsedData[parsedData.length - 1]?.business_date,
        })

        const tableName = importType === 'occupancy' ? 'daily_occupancy' : 'daily_revenue'
        let processedCount = 0
        let failedCount = 0
        const errors: ValidationError[] = []

        for (const row of parsedData) {
            try {
                const data: Record<string, unknown> = {
                    property_id: currentProperty.id,
                    business_date: row.business_date,
                    source_import_id: importLog.id
                }

                if (importType === 'occupancy') {
                    data.rooms_available = parseInt(row.rooms_available) || 0
                    data.rooms_sold = parseInt(row.rooms_sold) || 0
                    data.rooms_ooo = parseInt(row.rooms_ooo) || 0
                    data.adults = parseInt(row.adults) || 0
                    data.children = parseInt(row.children) || 0
                    data.no_shows = parseInt(row.no_shows) || 0
                    data.cancellations = parseInt(row.cancellations) || 0
                    data.walk_ins = parseInt(row.walk_ins) || 0
                } else {
                    data.room_revenue = parseFloat(row.room_revenue) || 0
                    data.fb_revenue = parseFloat(row.fb_revenue) || 0
                    data.spa_revenue = parseFloat(row.spa_revenue) || 0
                    data.other_revenue = parseFloat(row.other_revenue) || 0
                    data.rooms_sold = parseInt(row.rooms_sold) || 0
                    data.cash_collections = parseFloat(row.cash_collections) || 0
                    data.credit_collections = parseFloat(row.credit_collections) || 0
                    data.ar_collections = parseFloat(row.ar_collections) || 0
                }

                const { error } = await supabase
                    .from(tableName)
                    .upsert(data, { onConflict: 'property_id,business_date' })

                if (error) throw error
                processedCount++
            } catch (err) {
                failedCount++
                errors.push({
                    row: parsedData.indexOf(row) + 2,
                    field: 'general',
                    message: err instanceof Error ? err.message : 'Unknown error'
                })
            }

            setState(prev => ({
                ...prev,
                processedRows: processedCount + failedCount,
                progress: Math.round(((processedCount + failedCount) / parsedData.length) * 100)
            }))
        }

        // Update import log
        await supabase
            .from('data_import_logs')
            .update({
                status: failedCount === 0 ? 'completed' : 'failed',
                completed_at: new Date().toISOString(),
                records_processed: processedCount,
                records_failed: failedCount,
                error_details: errors.length > 0 ? errors : null
            })
            .eq('id', importLog.id)

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['daily-occupancy'] })
        queryClient.invalidateQueries({ queryKey: ['daily-revenue'] })
        queryClient.invalidateQueries({ queryKey: ['operations-kpis'] })
        queryClient.invalidateQueries({ queryKey: ['data-import-logs'] })

        if (failedCount === 0) {
            setState(prev => ({ ...prev, status: 'success', errors: [] }))
            toast({
                title: 'Import successful',
                description: `${processedCount} records imported successfully`
            })
        } else {
            setState(prev => ({ ...prev, status: 'error', errors }))
            toast({
                title: 'Import completed with errors',
                description: `${processedCount} succeeded, ${failedCount} failed`,
                variant: 'destructive'
            })
        }
    }, [currentProperty, user, selectedFile, parsedData, importType, createImportLog, queryClient])

    const handleDownloadTemplate = useCallback(() => {
        const template = CSV_TEMPLATES[importType]
        const csvContent = [
            template.headers.join(','),
            ...template.sample.map(row => row.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${importType}_template.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [importType])

    const handleReset = useCallback(() => {
        setSelectedFile(null)
        setParsedData([])
        setState({
            status: 'idle',
            progress: 0,
            totalRows: 0,
            processedRows: 0,
            errors: []
        })
    }, [])

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {t('operations:import.title', 'Data Import')}
                    </h1>
                    <p className="text-muted-foreground">
                        {currentProperty?.name || 'All Properties'} - {t('operations:import.subtitle', 'Upload operational data from PMS exports')}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Upload Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            {t('operations:import.upload_csv', 'Upload CSV File')}
                        </CardTitle>
                        <CardDescription>
                            {t('operations:import.upload_description', 'Select the data type and upload a CSV file')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('operations:import.data_type', 'Data Type')}</Label>
                            <Select value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="occupancy">{t('operations:import.occupancy', 'Daily Occupancy')}</SelectItem>
                                    <SelectItem value="revenue">{t('operations:import.revenue', 'Daily Revenue')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('operations:import.csv_file', 'CSV File')}</Label>
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={handleFileSelect}
                                className="cursor-pointer"
                            />
                        </div>

                        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                            <Download className="h-4 w-4 mr-2" />
                            {t('operations:import.download_template', 'Download Template')}
                        </Button>

                        {selectedFile && (
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{selectedFile.name}</p>
                                    <p className="text-xs text-muted-foreground">{parsedData.length} rows detected</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={handleReset}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {parsedData.length > 0 && state.status !== 'importing' && (
                            <div className="flex gap-2">
                                <Button onClick={handleValidate} variant="outline" disabled={state.status === 'validating'}>
                                    {t('operations:import.validate', 'Validate')}
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={state.errors.length > 0 || state.status === 'validating'}
                                >
                                    {t('operations:import.import', 'Import Data')}
                                </Button>
                            </div>
                        )}

                        {state.status === 'importing' && (
                            <div className="space-y-2">
                                <Progress value={state.progress} />
                                <p className="text-sm text-muted-foreground text-center">
                                    {t('operations:import.processing', 'Processing')} {state.processedRows} / {state.totalRows}
                                </p>
                            </div>
                        )}

                        {state.status === 'success' && (
                            <Alert>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription>
                                    {t('operations:import.success', 'Import completed successfully!')}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Validation/Errors Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            {t('operations:import.validation', 'Validation Results')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {state.errors.length === 0 && state.status === 'idle' && (
                            <p className="text-muted-foreground text-center py-8">
                                {t('operations:import.no_errors', 'Upload a file to see validation results')}
                            </p>
                        )}

                        {state.errors.length === 0 && parsedData.length > 0 && state.status !== 'error' && (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription>
                                    {t('operations:import.valid_data', 'All rows are valid and ready to import')}
                                </AlertDescription>
                            </Alert>
                        )}

                        {state.errors.length > 0 && (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {state.errors.slice(0, 20).map((error, index) => (
                                    <div key={index} className="flex items-start gap-2 p-2 bg-red-50 rounded text-sm">
                                        <Badge variant="destructive" className="shrink-0">Row {error.row}</Badge>
                                        <span className="text-red-800">
                                            <strong>{error.field}:</strong> {error.message}
                                        </span>
                                    </div>
                                ))}
                                {state.errors.length > 20 && (
                                    <p className="text-sm text-muted-foreground text-center">
                                        ...and {state.errors.length - 20} more errors
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Preview Table */}
            {parsedData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('operations:import.preview', 'Data Preview')}</CardTitle>
                        <CardDescription>First 5 rows of your data</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        {Object.keys(parsedData[0] || {}).map((key) => (
                                            <th key={key} className="text-left p-2 font-medium">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.slice(0, 5).map((row, index) => (
                                        <tr key={index} className="border-b">
                                            {Object.values(row).map((value, vIndex) => (
                                                <td key={vIndex} className="p-2">{value}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
