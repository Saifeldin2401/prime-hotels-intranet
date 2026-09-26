import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
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
import { useTenant } from '@/contexts/TenantContext'
import { useAccountContext } from '@/contexts/auth/AccountContext'
import { platformService } from '@/services/platformService'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Loader2,
  Play,
  RefreshCw,
  Upload,
} from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'

type ProvisioningMethod = 'invite' | 'temporary_password'

interface InputUserRow {
  email: string
  name: string
  phone?: string
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

interface DepartmentRecord {
  id: string
  name: string
  is_active: boolean
}

interface MapsState {
  organizationId: string
  departmentByName: Map<string, DepartmentRecord | { id: string }>
}

const DEFAULT_INPUT = [
  'email,name,phone,dept,role',
  'example.user@example.com,Example User,500000000,Front Office,staff'
].join('\n')

const VALID_ROLES = new Set([
  'administrator',
  'training_manager',
  'knowledge_manager',
  'author',
  'learner',
  'super_admin',
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
    ['administrator', 'training_manager', 'super_admin', 'corporate_admin', 'regional_admin', 'regional_hr'].includes(role)
  )

  if (!hasPermission) {
    throw new Error(`Insufficient privileges. Current roles: ${roles.join(', ') || 'none'}`)
  }
}

async function loadMaps(organizationId: string | undefined) {
  if (!organizationId) {
    throw new Error('Select an organization before importing people.')
  }

  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('id,name,is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  if (deptError) {
    throw new Error(`Failed to load departments: ${deptError.message}`)
  }

  const departmentByName = new Map<string, DepartmentRecord | { id: string }>()
  for (const department of (departments || []) as DepartmentRecord[]) {
    departmentByName.set(normalizeText(department.name), department)
  }

  return { organizationId, departmentByName } as MapsState
}

async function ensureDepartment(maps: MapsState, config: BulkConfig, deptName: string) {
  const key = normalizeText(deptName)
  const existing = maps.departmentByName.get(key)
  if (existing) return existing.id

  if (!config.createMissingDepartments) {
    throw new Error(`Department not found: "${deptName}"`)
  }

  if (config.dryRun) {
    const simulatedId = `dryrun:${key}`
    maps.departmentByName.set(key, { id: simulatedId })
    return simulatedId
  }

  const { data: created, error } = await withRetry(
    `create department ${deptName}`,
    config,
    () => withTimeout(
      Promise.resolve(supabase
        .from('departments')
        .insert({ organization_id: maps.organizationId, name: deptName, is_active: true })
        .select('id,name,is_active')
        .single()),
      config.requestTimeoutMs,
      `Department create (${deptName})`
    )
  )

  if (error) {
    throw new Error(`Failed creating department "${deptName}": ${error.message}`)
  }

  maps.departmentByName.set(key, created as DepartmentRecord)
  return (created as DepartmentRecord).id
}

async function createSingleUser(maps: MapsState, config: BulkConfig, row: InputUserRow) {
  const normalizedRole = normalizeText(row.role).replace(/\s+/g, '_')
  if (!VALID_ROLES.has(normalizedRole)) {
    throw new Error(`Invalid role "${row.role}"`)
  }

  const departmentId = await ensureDepartment(maps, config, row.dept)

  const payload = {
    email: normalizeEmail(row.email),
    fullName: row.name,
    phone: normalizePhone(row.phone),
    role: normalizedRole,
    organizationId: maps.organizationId,
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
  const { currentOrganization } = useTenant()
  const { isPlatformOperator } = useAccountContext()

  const { data: entitlements, refetch: refetchEntitlements } = useQuery({
    queryKey: ['org-effective-entitlements', currentOrganization?.id],
    queryFn: () => currentOrganization?.id ? platformService.getEffectiveEntitlements(currentOrganization.id) : null,
    enabled: !!currentOrganization?.id
  })

  const remainingSeats = entitlements?.max_learners
    ? Math.max(0, entitlements.max_learners - (entitlements?.usage?.learners ?? 0))
    : Number.POSITIVE_INFINITY

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

    if (!config.dryRun && !isPlatformOperator && previewCounts.valid > remainingSeats) {
      toast({
        title: 'Plan Seat Limit Exceeded',
        description: `Your plan has ${remainingSeats} seat(s) remaining, but ${previewCounts.valid} valid user(s) are queued. Please reduce batch or upgrade subscription.`,
        variant: 'destructive'
      })
      return
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

      const maps = await loadMaps(currentOrganization?.id)
      appendLog(`Loaded ${maps.departmentByName.size} active departments.`)

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

  const seatLimit = entitlements?.max_learners ?? null
  const overSeats = seatLimit !== null && !config.dryRun && previewCounts.valid > remainingSeats
  const stepHead = (n: number, title: string, hint?: string) => (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ds-border font-mono text-xs text-ds-ink">{n}</span>
      <div>
        <h2 className="text-lg font-semibold text-ds-ink">{title}</h2>
        {hint && <p className="text-sm text-ds-muted">{hint}</p>}
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <PageHeader
        backTo="/admin/users"
        title="Import people"
        description="Add many people at once from a CSV or JSON file. Check the rows, try a dry run, then import."
        actions={(
          <Button type="button" onClick={() => setRawInput(DEFAULT_INPUT)} variant="outline" className="min-h-[44px]">
            <RefreshCw aria-hidden="true" className="me-2 h-4 w-4" />
            Load an example
          </Button>
        )}
      />

      {/* 1. Add rows */}
      <section aria-label="Add rows" className="space-y-4">
        {stepHead(1, 'Add rows', 'Columns: email, name, phone, dept, role. A JSON array with the same fields also works.')}
        <div className="space-y-3 ps-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="bulk-input-file">Upload a file</Label>
              <Input id="bulk-input-file" type="file" accept=".csv,.json,.txt" onChange={handleLoadFile} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-input-text">Or paste rows</Label>
            <Textarea
              id="bulk-input-text"
              value={rawInput}
              onChange={(event) => {
                setRawInput(event.target.value)
                setParsedRows([])
                setParseError(null)
                setReport(null)
              }}
              className="min-h-[200px] font-mono text-xs"
              placeholder={DEFAULT_INPUT}
              dir="ltr"
            />
          </div>
          {parseError && (
            <p role="alert" className="rounded-md border border-ds-danger/30 bg-ds-danger-soft px-3 py-2 text-sm text-ds-danger">{parseError}</p>
          )}
          <Button type="button" onClick={handlePreview} className="min-h-[44px] bg-ds-ink text-ds-on-ink hover:bg-ds-ink/90">
            <Upload aria-hidden="true" className="me-2 h-4 w-4" />
            Check rows
          </Button>
        </div>
      </section>

      {/* 2. Check */}
      <section aria-label="Check rows" className="space-y-4 border-t border-ds-border pt-8">
        {stepHead(2, 'Check rows', previewRows.length > 0
          ? `${previewCounts.valid} ready · ${previewCounts.duplicates} duplicate · ${previewCounts.invalid} with problems`
          : 'Rows appear here after you check them.')}
        {previewRows.length > 0 && (
          <div className="ms-10 max-h-[360px] overflow-auto rounded-[6px] border border-ds-border bg-ds-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((entry, idx) => (
                  <TableRow key={`${entry.row.email}-${idx}`}>
                    <TableCell className="font-mono text-xs text-ds-muted">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.row.email || '—'}</TableCell>
                    <TableCell>{entry.row.name || '—'}</TableCell>
                    <TableCell>{entry.row.dept || '—'}</TableCell>
                    <TableCell>{entry.row.role || '—'}</TableCell>
                    <TableCell>
                      {entry.validationError ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-ds-danger">
                          <AlertTriangle aria-hidden="true" className="h-3 w-3" />{entry.validationError}
                        </span>
                      ) : entry.isDuplicateInput ? (
                        <span className="text-xs text-ds-muted">Duplicate row</span>
                      ) : (
                        <span className="text-xs text-ds-success">Ready</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* 3. Import */}
      <section aria-label="Import" className="space-y-4 border-t border-ds-border pt-8">
        {stepHead(3, 'Import', config.dryRun
          ? 'Dry run is on: nothing is created. Turn it off when the dry run looks right.'
          : 'Dry run is off: accounts will be created and invitations sent.')}
        <div className="space-y-4 ps-10">
          <div className="divide-y divide-ds-border rounded-[6px] border border-ds-border bg-ds-surface">
            <label className="flex items-center justify-between gap-4 px-4 py-3">
              <span>
                <span className="block text-sm font-medium text-ds-ink">Dry run</span>
                <span className="block text-xs text-ds-muted">Check everything without creating accounts.</span>
              </span>
              <Switch checked={config.dryRun} onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, dryRun: checked }))} />
            </label>
            <label className="flex items-center justify-between gap-4 px-4 py-3">
              <span>
                <span className="block text-sm font-medium text-ds-ink">Create missing departments</span>
                <span className="block text-xs text-ds-muted">If a row names a department the organization does not have yet, create it.</span>
              </span>
              <Switch checked={config.createMissingDepartments} onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, createMissingDepartments: checked }))} />
            </label>
            <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block text-sm font-medium text-ds-ink">How people get access</span>
                <span className="block text-xs text-ds-muted">An invitation email, or a temporary password they must change.</span>
              </span>
              <Select
                value={config.provisioningMethod}
                onValueChange={(value: ProvisioningMethod) => setConfig((prev) => ({ ...prev, provisioningMethod: value }))}
              >
                <SelectTrigger className="min-h-[40px] sm:w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invite">Invitation email</SelectItem>
                  <SelectItem value="temporary_password">Temporary password</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <details className="rounded-[6px] border border-ds-border bg-ds-surface">
            <summary className="flex min-h-[44px] cursor-pointer items-center px-4 text-sm font-medium text-ds-ink">Advanced: pacing and retries</summary>
            <div className="grid gap-4 border-t border-ds-border p-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="delay-ms">Pause between people (ms)</Label>
                <Input id="delay-ms" type="number" min={0} value={config.delayMs}
                  onChange={(event) => setConfig((prev) => ({ ...prev, delayMs: Number(event.target.value || 0) }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timeout-ms">Timeout per person (ms)</Label>
                <Input id="timeout-ms" type="number" min={1000} value={config.requestTimeoutMs}
                  onChange={(event) => setConfig((prev) => ({ ...prev, requestTimeoutMs: Number(event.target.value || prev.requestTimeoutMs) }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-retries">Retries</Label>
                <Input id="max-retries" type="number" min={0} value={config.maxRetries}
                  onChange={(event) => setConfig((prev) => ({ ...prev, maxRetries: Number(event.target.value || 0) }))} />
              </div>
            </div>
          </details>

          {seatLimit !== null && (
            <p className={`text-sm ${overSeats ? 'font-medium text-ds-danger' : 'text-ds-muted'}`}>
              {overSeats
                ? `Only ${remainingSeats} of ${seatLimit} seats are free, but ${previewCounts.valid} people are ready. Remove some rows or ask for more seats.`
                : `${remainingSeats} of ${seatLimit} seats free.`}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runProvisioning} disabled={isRunning || previewRows.length === 0}
              className="min-h-[44px] bg-ds-ink text-ds-on-ink hover:bg-ds-ink/90">
              {isRunning
                ? (<><Loader2 aria-hidden="true" className="me-2 h-4 w-4 animate-spin" />Working…</>)
                : (<><Play aria-hidden="true" className="me-2 h-4 w-4" />{config.dryRun ? 'Run dry run' : `Import ${previewCounts.valid} people`}</>)}
            </Button>
            {report && report.errors.length > 0 && (
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={exportFailures}>Download failed rows</Button>
            )}
          </div>

          {isRunning && (
            <div className="space-y-2 rounded-[6px] border border-ds-border p-3" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{progress.currentEmail || 'Starting…'}</span>
                <span className="font-mono tabular-nums">{progress.processed}/{progress.total}</span>
              </div>
              <Progress value={progressPercent} />
            </div>
          )}
        </div>
      </section>

      {/* 4. Result */}
      {(report || logs.length > 0) && (
        <section aria-label="Result" className="space-y-4 border-t border-ds-border pt-8">
          {stepHead(4, config.dryRun ? 'Dry run result' : 'Result')}
          <div className="space-y-4 ps-10">
            {report && (
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-ds-border bg-ds-border sm:grid-cols-4">
                {[
                  [config.dryRun ? 'Would be created' : 'Created', report.created],
                  ['Already existed', report.skippedExisting],
                  ['Duplicate rows', report.skippedInputDuplicates],
                  ['Failed', report.failed],
                ].map(([label, value]) => (
                  <div key={label as string} className="bg-ds-surface px-4 py-3">
                    <dt className="text-xs text-ds-muted">{label}</dt>
                    <dd className={`mt-0.5 font-mono text-xl tabular-nums ${label === 'Failed' && Number(value) > 0 ? 'text-ds-danger' : 'text-ds-ink'}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {report && report.errors.length > 0 && (
              <div className="max-h-[240px] overflow-auto rounded-[6px] border border-ds-border bg-ds-surface">
                <Table>
                  <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Problem</TableHead></TableRow></TableHeader>
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
              <details className="rounded-[6px] border border-ds-border bg-ds-surface">
                <summary className="flex min-h-[44px] cursor-pointer items-center px-4 text-sm font-medium text-ds-ink">Technical log ({logs.length} lines)</summary>
                <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap border-t border-ds-border p-3 text-xs" dir="ltr">{logs.join('\n')}</pre>
              </details>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
