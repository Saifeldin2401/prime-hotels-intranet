import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import {
    AlertTriangle,
    CheckCircle2,
    FileUp,
    Loader2,
    Play,
    RefreshCw,
    ShieldCheck,
    Upload,
    Users
} from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type ProvisioningMethod = 'invite' | 'temporary_password'

interface InputUserRow {
  email: string
  name: string
  phone?: string
  property: string
  dept: string
  role: string
}

interface BulkConfig {
  provisioningMethod: ProvisioningMethod
  createMissingDepartments: boolean
  dryRun: boolean
  delayMs: number
  requestTimeoutMs: number
  maxRetries: number
  retryDelayMs: number
}

interface PreviewRow {
  row: InputUserRow
  validationError: string | null
  isDuplicateInput: boolean
}

interface RunError {
  email: string
  error: string
}

interface RunReport {
  created: number
  skippedInputDuplicates: number
  skippedExisting: number
  failed: number
  errors: RunError[]
}

interface ProgressState {
  processed: number
  total: number
  currentEmail: string
}

interface PropertyRecord {
  id: string
  name: string
  is_active: boolean
}

interface DepartmentRecord {
  id: string
  name: string
  property_id: string
  is_active: boolean
}

interface MapsState {
  propertyByName: Map<string, PropertyRecord>
  departmentByPropertyAndName: Map<string, DepartmentRecord | { id: string }>
}

const DEFAULT_INPUT = [
  'email,name,phone,property,dept,role',
  'example.user@hotel.com,Example User,500000000,Altus Al Hamra Hotel Riyadh,Front Office,staff'
].join('\n')

const VALID_ROLES = new Set([
  'corporate_admin',
  'regional_admin',
  'regional_hr',
  'property_manager',
  'property_hr',
  'department_head',
  'manager',
  'staff'
])

const DEFAULT_CONFIG: BulkConfig = {
  provisioningMethod: 'invite',
  createMissingDepartments: true,
  dryRun: true,
  delayMs: 250,
  requestTimeoutMs: 20000,
  maxRetries: 2,
  retryDelayMs: 800
}

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeEmail(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function normalizePhone(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D+/g, '')
  return digits || undefined
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function validateUserRow(row: InputUserRow) {
  const email = normalizeEmail(row.email)
  if (!email) return 'Missing email'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return `Invalid email "${row.email}"`
  if (!String(row.name || '').trim()) return 'Missing full name'
  if (!String(row.property || '').trim()) return 'Missing property'
  if (!String(row.dept || '').trim()) return 'Missing department'
  if (!String(row.role || '').trim()) return 'Missing role'
  return null
}

function isAlreadyExistsError(message: string) {
  const text = normalizeText(message)
  return (
    text.includes('already registered') ||
    text.includes('already exists') ||
    text.includes('duplicate') ||
    text.includes('email address has already')
  )
}

function isRetryableErrorMessage(message: string) {
  const text = normalizeText(message)
  return (
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('network') ||
    text.includes('failed to fetch') ||
    text.includes('503') ||
    text.includes('502') ||
    text.includes('504') ||
    text.includes('rate limit') ||
    text.includes('too many requests')
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timeoutId: number | undefined
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.floor(timeoutMs / 1000)}s`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
}

async function withRetry<T>(operationName: string, config: BulkConfig, task: () => Promise<T>) {
  let attempt = 0
  while (attempt <= config.maxRetries) {
    try {
      return await task()
    } catch (error: any) {
      const message = error?.message || String(error)
      const canRetry = attempt < config.maxRetries && isRetryableErrorMessage(message)
      if (!canRetry) throw error
      await sleep(config.retryDelayMs * (attempt + 1))
      attempt += 1
    }
  }

  throw new Error(`${operationName} failed after retries`)
}

async function parseInvokeError(fnError: { message?: string, context?: { response?: Response } }) {
  const message = fnError?.message || 'Unknown function invocation error'
  const response = fnError?.context?.response
  if (!response) return message

  try {
    const text = await response.text()
    if (!text) return message
    const parsed = JSON.parse(text) as { error?: string }
    return parsed?.error || text || message
  } catch {
    return message
  }
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

function parseCsvRows(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim())
    .map(parseCsvLine)
}

function readByAliases(record: Record<string, string>, aliases: string[]) {
  for (const key of aliases) {
    const value = record[key]
    if (value !== undefined && String(value).trim()) {
      return String(value).trim()
    }
  }
  return ''
}

function mapRecordToUserRow(record: Record<string, string>) {
  return {
    email: readByAliases(record, ['email', 'mail', 'emailaddress']),
    name: readByAliases(record, ['name', 'fullname', 'full_name', 'employeename']),
    phone: readByAliases(record, ['phone', 'mobile', 'phonenumber', 'phone_number', 'contact']),
    property: readByAliases(record, ['property', 'propertyname', 'hotel', 'hotelname']),
    dept: readByAliases(record, ['dept', 'department', 'departmentname']),
    role: readByAliases(record, ['role', 'userrole', 'permission'])
  } as InputUserRow
}

function parseUsersInput(rawInput: string) {
  const trimmed = rawInput.trim()
  if (!trimmed) throw new Error('Input is empty. Paste CSV or JSON first.')

  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed)
    if (!Array.isArray(parsed)) {
      throw new Error('JSON input must be an array of user objects.')
    }

    return parsed.map((item) => {
      const normalized = Object.fromEntries(
        Object.entries((item || {}) as Record<string, unknown>).map(([key, value]) => [
          normalizeHeader(key),
          String(value ?? '')
        ])
      ) as Record<string, string>
      return mapRecordToUserRow(normalized)
    })
  }

  const rows = parseCsvRows(trimmed)
  if (rows.length < 2) {
    throw new Error('CSV input needs one header row and at least one data row.')
  }

  const headers = rows[0].map(normalizeHeader)
  return rows.slice(1).map((line) => {
    const record: Record<string, string> = {}
    headers.forEach((header, idx) => {
      record[header] = line[idx] || ''
    })
    return mapRecordToUserRow(record)
  })
}

async function assertPrerequisites() {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('No active session found. Please log in first.')
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Unable to resolve current authenticated user.')
  }

  const { data: roleRows, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)

  if (roleError) {
    throw new Error(`Unable to verify roles: ${roleError.message}`)
  }

  const roles = (roleRows || []).map((row) => row.role)
  const hasPermission = roles.some((role) =>
    ['corporate_admin', 'regional_admin', 'regional_hr'].includes(role)
  )

  if (!hasPermission) {
    throw new Error(`Insufficient privileges. Current roles: ${roles.join(', ') || 'none'}`)
  }
}

async function loadMaps() {
  const { data: properties, error: propError } = await supabase
    .from('hotels')
    .select('id,name,is_active')
    .eq('is_active', true)
    .eq('is_deleted', false)

  if (propError) {
    throw new Error(`Failed to load hotels: ${propError.message}`)
  }

  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('id,name,property_id,is_active')
    .eq('is_active', true)

  if (deptError) {
    throw new Error(`Failed to load departments: ${deptError.message}`)
  }

  const propertyByName = new Map<string, PropertyRecord>()
  for (const property of (properties || []) as PropertyRecord[]) {
    propertyByName.set(normalizeText(property.name), property)
  }

  const departmentByPropertyAndName = new Map<string, DepartmentRecord>()
  for (const department of (departments || []) as DepartmentRecord[]) {
    const key = `${department.property_id}::${normalizeText(department.name)}`
    departmentByPropertyAndName.set(key, department)
  }

  return { propertyByName, departmentByPropertyAndName } as MapsState
}

async function ensureDepartment(maps: MapsState, config: BulkConfig, propertyId: string, deptName: string) {
  const key = `${propertyId}::${normalizeText(deptName)}`
  const existing = maps.departmentByPropertyAndName.get(key)
  if (existing) return existing.id

  if (!config.createMissingDepartments) {
    throw new Error(`Department not found: "${deptName}"`)
  }

  if (config.dryRun) {
    const simulatedId = `dryrun:${key}`
    maps.departmentByPropertyAndName.set(key, { id: simulatedId })
    return simulatedId
  }

  const { data: created, error } = await withRetry(
    `create department ${deptName}`,
    config,
    () => withTimeout(
      Promise.resolve(supabase
        .from('departments')
        .insert({ property_id: propertyId, name: deptName, is_active: true })
        .select('id,name,property_id,is_active')
        .single()),
      config.requestTimeoutMs,
      `Department create (${deptName})`
    )
  )

  if (error) {
    throw new Error(`Failed creating department "${deptName}": ${error.message}`)
  }

  maps.departmentByPropertyAndName.set(key, created as DepartmentRecord)
  return (created as DepartmentRecord).id
}

async function createSingleUser(maps: MapsState, config: BulkConfig, row: InputUserRow) {
  const normalizedRole = normalizeText(row.role).replace(/\s+/g, '_')
  if (!VALID_ROLES.has(normalizedRole)) {
    throw new Error(`Invalid role "${row.role}"`)
  }

  const property = maps.propertyByName.get(normalizeText(row.property))
  if (!property) {
    throw new Error(`Property not found: "${row.property}"`)
  }

  const departmentId = await ensureDepartment(maps, config, property.id, row.dept)

  const payload = {
    email: normalizeEmail(row.email),
    fullName: row.name,
    phone: normalizePhone(row.phone),
    role: normalizedRole,
    propertyIds: [property.id],
    departmentIds: [departmentId],
    provisioningMethod: config.provisioningMethod,
    appUrl: window.location.origin
  }

  if (config.dryRun) {
    return { dryRun: true }
  }

  const { data, error } = await withRetry(
    `create-user for ${payload.email}`,
    config,
    () => withTimeout(
      supabase.functions.invoke('create-user', { body: payload }),
      config.requestTimeoutMs,
      `create-user (${payload.email})`
    )
  )

  if (error) {
    const detailed = await parseInvokeError(error as { message?: string, context?: { response?: Response } })
    throw new Error(detailed)
  }

  if (data?.error) {
    throw new Error(String(data.error))
  }

  return data || {}
}

export default function BulkUserProvisioning() {
  const { toast } = useToast()
  const [rawInput, setRawInput] = useState(DEFAULT_INPUT)
  const [config, setConfig] = useState<BulkConfig>(DEFAULT_CONFIG)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<InputUserRow[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<ProgressState>({ processed: 0, total: 0, currentEmail: '' })
  const [report, setReport] = useState<RunReport | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const previewRows = useMemo<PreviewRow[]>(() => {
    const seen = new Set<string>()
    return parsedRows.map((row) => {
      const email = normalizeEmail(row.email)
      const duplicate = !!email && seen.has(email)
      if (email) seen.add(email)
      return {
        row,
        validationError: validateUserRow(row),
        isDuplicateInput: duplicate
      }
    })
  }, [parsedRows])

  const previewCounts = useMemo(() => {
    const invalid = previewRows.filter((entry) => !!entry.validationError).length
    const duplicates = previewRows.filter((entry) => entry.isDuplicateInput).length
    const valid = Math.max(previewRows.length - invalid - duplicates, 0)
    return { valid, invalid, duplicates }
  }, [previewRows])

  const appendLog = (message: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${time}] ${message}`].slice(-250))
  }

  const handlePreview = () => {
    try {
      const rows = parseUsersInput(rawInput)
      setParsedRows(rows)
      setParseError(null)
      setReport(null)
      setLogs([])
      toast({ title: 'Preview generated', description: `Loaded ${rows.length} row(s) for validation.` })
    } catch (error: any) {
      const message = error?.message || String(error)
      setParsedRows([])
      setParseError(message)
      toast({ title: 'Invalid input', description: message, variant: 'destructive' })
    }
  }

  const handleLoadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      setRawInput(text)
      setParsedRows([])
      setParseError(null)
      setReport(null)
      setLogs([])
    } catch {
      toast({
        title: 'Failed to read file',
        description: 'Please upload a valid UTF-8 CSV or JSON file.',
        variant: 'destructive'
      })
    } finally {
      event.target.value = ''
    }
  }

  const runProvisioning = async () => {
    if (isRunning) return

    let rowsToRun = parsedRows
    if (rowsToRun.length === 0) {
      try {
        rowsToRun = parseUsersInput(rawInput)
        setParsedRows(rowsToRun)
        setParseError(null)
      } catch (error: any) {
        const message = error?.message || String(error)
        setParseError(message)
        toast({ title: 'Invalid input', description: message, variant: 'destructive' })
        return
      }
    }

    if (!config.dryRun) {
      const confirmed = window.confirm(`This will invoke create-user for ${rowsToRun.length} row(s). Continue?`)
      if (!confirmed) return
    }

    setIsRunning(true)
    setProgress({ processed: 0, total: rowsToRun.length, currentEmail: '' })
    setReport({ created: 0, skippedInputDuplicates: 0, skippedExisting: 0, failed: 0, errors: [] })
    setLogs([])

    try {
      appendLog('Running pre-checks...')
      await assertPrerequisites()
      appendLog('Authenticated and privileges verified.')

      const maps = await loadMaps()
      appendLog(`Loaded ${maps.propertyByName.size} active properties.`)

      const seenInputEmails = new Set<string>()
      const localReport: RunReport = {
        created: 0,
        skippedInputDuplicates: 0,
        skippedExisting: 0,
        failed: 0,
        errors: []
      }

      for (let i = 0; i < rowsToRun.length; i += 1) {
        const row = rowsToRun[i]
        const email = normalizeEmail(row.email) || row.email
        setProgress({ processed: i + 1, total: rowsToRun.length, currentEmail: email })

        const validationError = validateUserRow(row)
        if (validationError) {
          localReport.failed += 1
          localReport.errors.push({ email: row.email || '(missing-email)', error: validationError })
          appendLog(`Failed validation: ${row.email || '(missing-email)'} - ${validationError}`)
          setReport(localReport)
          await sleep(config.delayMs)
          continue
        }

        if (seenInputEmails.has(email)) {
          localReport.skippedInputDuplicates += 1
          appendLog(`Skipped duplicate input: ${email}`)
          setReport(localReport)
          await sleep(config.delayMs)
          continue
        }
        seenInputEmails.add(email)

        try {
          await createSingleUser(maps, config, row)
          localReport.created += 1
          appendLog(`${config.dryRun ? 'Dry-run validated' : 'Processed'}: ${email}`)
        } catch (error: any) {
          const message = error?.message || String(error)
          if (isAlreadyExistsError(message)) {
            localReport.skippedExisting += 1
            appendLog(`Already exists: ${email}`)
          } else {
            localReport.failed += 1
            localReport.errors.push({ email, error: message })
            appendLog(`Failed: ${email} - ${message}`)
          }
        }

        setReport(localReport)
        await sleep(config.delayMs)
      }

      toast({
        title: config.dryRun ? 'Dry run completed' : 'Bulk provisioning completed',
        description: `${localReport.created} processed, ${localReport.skippedExisting} already existed, ${localReport.failed} failed.`
      })
    } catch (error: any) {
      const message = error?.message || String(error)
      appendLog(`Fatal error: ${message}`)
      toast({ title: 'Bulk provisioning failed', description: message, variant: 'destructive' })
    } finally {
      setIsRunning(false)
    }
  }

  const exportFailures = () => {
    if (!report || report.errors.length === 0) return
    const csv = ['email,error', ...report.errors.map((entry) => `"${entry.email.replace(/"/g, '""')}","${entry.error.replace(/"/g, '""')}"`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `bulk-user-provisioning-failures-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const progressPercent = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk User Provisioning"
        description="Paste CSV/JSON user rows, validate, run dry-run or execute real invitations using the create-user edge function."
        actions={(
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/users">Back to Users</Link>
            </Button>
            <Button type="button" onClick={() => setRawInput(DEFAULT_INPUT)} variant="outline">
              <RefreshCw className="w-4 h-4 me-2" />
              Load Sample
            </Button>
          </div>
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-hotel-gold" />
            Input
          </CardTitle>
          <CardDescription>
            CSV headers: email, name, phone, property, dept, role. JSON array is also supported.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex-1">
              <Label htmlFor="bulk-input-file">Upload CSV / JSON</Label>
              <Input id="bulk-input-file" type="file" accept=".csv,.json,.txt" onChange={handleLoadFile} />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handlePreview}>
                <Upload className="w-4 h-4 me-2" />
                Preview Rows
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-input-text">Rows Input</Label>
            <Textarea
              id="bulk-input-text"
              value={rawInput}
              onChange={(event) => {
                setRawInput(event.target.value)
                setParsedRows([])
                setParseError(null)
                setReport(null)
              }}
              className="min-h-[220px] font-mono text-xs"
              placeholder={DEFAULT_INPUT}
            />
          </div>

          {parseError && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {parseError}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Execution Settings</CardTitle>
          <CardDescription>Keep dry-run enabled first, then disable it when the preview looks clean.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Provisioning Method</Label>
            <Select
              value={config.provisioningMethod}
              onValueChange={(value: ProvisioningMethod) => setConfig((prev) => ({ ...prev, provisioningMethod: value }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="invite">invite</SelectItem>
                <SelectItem value="temporary_password">temporary_password</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delay-ms">Delay (ms)</Label>
            <Input
              id="delay-ms"
              type="number"
              min={0}
              value={config.delayMs}
              onChange={(event) => setConfig((prev) => ({ ...prev, delayMs: Number(event.target.value || 0) }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeout-ms">Request Timeout (ms)</Label>
            <Input
              id="timeout-ms"
              type="number"
              min={1000}
              value={config.requestTimeoutMs}
              onChange={(event) => setConfig((prev) => ({ ...prev, requestTimeoutMs: Number(event.target.value || prev.requestTimeoutMs) }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-retries">Max Retries</Label>
            <Input
              id="max-retries"
              type="number"
              min={0}
              value={config.maxRetries}
              onChange={(event) => setConfig((prev) => ({ ...prev, maxRetries: Number(event.target.value || 0) }))}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2 md:col-span-2 lg:col-span-2">
            <div>
              <p className="text-sm font-medium">Create Missing Departments</p>
              <p className="text-xs text-muted-foreground">Auto-create department if missing for a valid property.</p>
            </div>
            <Switch checked={config.createMissingDepartments} onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, createMissingDepartments: checked }))} />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2 md:col-span-2 lg:col-span-2">
            <div>
              <p className="text-sm font-medium">Dry Run</p>
              <p className="text-xs text-muted-foreground">Validates and simulates execution without writes.</p>
            </div>
            <Switch checked={config.dryRun} onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, dryRun: checked }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-hotel-navy" />
            Preview ({previewRows.length})
          </CardTitle>
          <CardDescription>
            <span className="inline-flex items-center gap-2">
              <Badge variant="default">{previewCounts.valid} valid</Badge>
              <Badge variant="secondary">{previewCounts.duplicates} duplicate</Badge>
              <Badge variant={previewCounts.invalid > 0 ? 'destructive' : 'secondary'}>{previewCounts.invalid} invalid</Badge>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runProvisioning} disabled={isRunning || previewRows.length === 0}>
              {isRunning ? (<><Loader2 className="w-4 h-4 animate-spin me-2" />Processing...</>) : (<><Play className="w-4 h-4 me-2" />{config.dryRun ? 'Run Dry-Run' : 'Run Provisioning'}</>)}
            </Button>
            {report && report.errors.length > 0 && (
              <Button type="button" variant="outline" onClick={exportFailures}>Export Failed Rows</Button>
            )}
          </div>

          {isRunning && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between text-sm">
                <span>{progress.currentEmail || 'Starting...'}</span>
                <span>{progress.processed}/{progress.total}</span>
              </div>
              <Progress value={progressPercent} />
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="max-h-[360px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((entry, idx) => (
                    <TableRow key={`${entry.row.email}-${idx}`}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.row.email || '-'}</TableCell>
                      <TableCell>{entry.row.name || '-'}</TableCell>
                      <TableCell>{entry.row.property || '-'}</TableCell>
                      <TableCell>{entry.row.dept || '-'}</TableCell>
                      <TableCell>{entry.row.role || '-'}</TableCell>
                      <TableCell>
                        {entry.validationError ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {entry.validationError}
                          </Badge>
                        ) : entry.isDuplicateInput ? (
                          <Badge variant="secondary">Duplicate in input</Badge>
                        ) : (
                          <Badge variant="default" className="gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Ready
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {(report || logs.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Execution Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Created / Processed</p><p className="text-2xl font-bold">{report.created}</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Skipped Existing</p><p className="text-2xl font-bold">{report.skippedExisting}</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Skipped Duplicates</p><p className="text-2xl font-bold">{report.skippedInputDuplicates}</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold">{report.failed}</p></div>
              </div>
            )}

            {report && report.errors.length > 0 && (
              <div className="max-h-[240px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Error</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {report.errors.map((entry, idx) => (
                      <TableRow key={`${entry.email}-${idx}`}>
                        <TableCell className="font-mono text-xs">{entry.email}</TableCell>
                        <TableCell>{entry.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {logs.length > 0 && (
              <div className="max-h-[220px] overflow-auto rounded-md border bg-muted/30 p-3">
                <pre className="text-xs whitespace-pre-wrap">{logs.join('\n')}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
