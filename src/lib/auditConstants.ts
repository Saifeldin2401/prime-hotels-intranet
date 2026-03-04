/**
 * FORGE X: Enterprise Audit & Compliance Export System
 * Constants and Configuration
 */

import type { AuditExportFormat, AuditExportStatus } from '@/types/audit'

// =============================================================================
// EXPORT FORMAT CONFIGURATION
// =============================================================================

export const EXPORT_FORMATS: Record<
  AuditExportFormat,
  {
    label: string
    extension: string
    mimeType: string
    maxRecords: number
    description: string
    icon: string
  }
> = {
  pdf: {
    label: 'PDF Report',
    extension: 'pdf',
    mimeType: 'application/pdf',
    maxRecords: 10000,
    description: 'Tamper-evident signed report for compliance',
    icon: 'FileText',
  },
  excel: {
    label: 'Excel Spreadsheet',
    extension: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    maxRecords: 50000,
    description: 'Filterable data with pivot tables',
    icon: 'Table',
  },
  csv: {
    label: 'CSV File',
    extension: 'csv',
    mimeType: 'text/csv',
    maxRecords: 100000,
    description: 'Raw data for external tools',
    icon: 'FileSpreadsheet',
  },
  json: {
    label: 'JSON Export',
    extension: 'json',
    mimeType: 'application/json',
    maxRecords: 50000,
    description: 'Machine-readable for SIEM integration',
    icon: 'Code',
  },
}

// =============================================================================
// EXPORT STATUS CONFIGURATION
// =============================================================================

export const EXPORT_STATUSES: Record<
  AuditExportStatus,
  {
    label: string
    color: 'default' | 'primary' | 'secondary' | 'destructive' | 'warning' | 'success'
    description: string
  }
> = {
  pending: {
    label: 'Pending',
    color: 'default',
    description: 'Export request queued',
  },
  generating: {
    label: 'Generating',
    color: 'primary',
    description: 'Export is being processed',
  },
  completed: {
    label: 'Completed',
    color: 'success',
    description: 'Export ready for download',
  },
  failed: {
    label: 'Failed',
    color: 'destructive',
    description: 'Export generation failed',
  },
  expired: {
    label: 'Expired',
    color: 'warning',
    description: 'Retention period expired',
  },
  downloaded: {
    label: 'Downloaded',
    color: 'secondary',
    description: 'Export has been downloaded',
  },
}

// =============================================================================
// ENTITY TYPES FOR AUDIT
// =============================================================================

export const AUDIT_ENTITY_TYPES = [
  { value: 'profiles', label: 'User Profiles', category: 'HR' },
  { value: 'documents', label: 'Documents', category: 'Knowledge' },
  { value: 'training', label: 'Training Modules', category: 'Learning' },
  { value: 'tasks', label: 'Tasks', category: 'Operations' },
  { value: 'maintenance', label: 'Maintenance Tickets', category: 'Operations' },
  { value: 'announcements', label: 'Announcements', category: 'Communication' },
  { value: 'messaging', label: 'Messages', category: 'Communication' },
  { value: 'leave_requests', label: 'Leave Requests', category: 'HR' },
  { value: 'payslips', label: 'Payslips', category: 'HR' },
  { value: 'performance_reviews', label: 'Performance Reviews', category: 'HR' },
  { value: 'goals', label: 'Goals', category: 'HR' },
  { value: 'shifts', label: 'Shifts', category: 'HR' },
  { value: 'approvals', label: 'Approvals', category: 'Workflow' },
  { value: 'audit_exports', label: 'Audit Exports', category: 'Compliance' },
] as const

// =============================================================================
// AUDIT ACTIONS
// =============================================================================

export const AUDIT_ACTIONS = [
  { value: 'create', label: 'Create', icon: 'Plus' },
  { value: 'update', label: 'Update', icon: 'Edit' },
  { value: 'delete', label: 'Delete', icon: 'Trash2' },
  { value: 'view', label: 'View', icon: 'Eye' },
  { value: 'export', label: 'Export', icon: 'Download' },
  { value: 'approve', label: 'Approve', icon: 'CheckCircle' },
  { value: 'reject', label: 'Reject', icon: 'XCircle' },
  { value: 'login', label: 'Login', icon: 'LogIn' },
  { value: 'logout', label: 'Logout', icon: 'LogOut' },
  { value: 'download', label: 'Download', icon: 'Download' },
  { value: 'verify', label: 'Verify', icon: 'ShieldCheck' },
] as const

// =============================================================================
// COMPLIANCE ROLES
// =============================================================================

export const COMPLIANCE_ROLES = [
  'corporate_admin',
  'compliance_officer',
  'regional_admin',
  'regional_hr',
] as const

// =============================================================================
// RETENTION POLICY DEFAULTS
// =============================================================================

export const DEFAULT_RETENTION_DAYS = 90
export const MIN_RETENTION_DAYS = 30
export const MAX_RETENTION_DAYS = 365

export const FORMAT_RETENTION_OVERRIDES: Record<AuditExportFormat, number> = {
  pdf: 180,
  excel: 90,
  csv: 30,
  json: 90,
}

export const ROLE_RETENTION_OVERRIDES: Record<string, number> = {
  corporate_admin: 365,
  compliance_officer: 180,
}

// =============================================================================
// ANOMOLY DETECTION THRESHOLDS
// =============================================================================

export const ANOMALY_THRESHOLDS = {
  // PII Access
  high_volume_pii_access: 50,      // Accesses per day
  off_hours_pii_access: 5,         // Off-hours accesses
  unique_pii_targets: 20,          // Unique users' PII accessed
  
  // Export Activity
  bulk_download_threshold: 10,     // Downloads in 1 hour
  unusual_export_count: 5,         // Exports in short period
  
  // Time windows (hours)
  lookback_hours_default: 24,
  off_hours_start: 22,  // 10 PM
  off_hours_end: 6,     // 6 AM
} as const

// =============================================================================
// DASHBOARD CONFIGURATION
// =============================================================================

export const COMPLIANCE_DASHBOARD_DEFAULTS = {
  dateRangeDays: 30,
  maxRecentExports: 10,
  refreshIntervalMs: 300000, // 5 minutes
  anomalyAlertThreshold: 'high',
} as const

// =============================================================================
// SIEM PROVIDER CONFIGURATION
// =============================================================================

export const SIEM_PROVIDERS = {
  splunk: {
    label: 'Splunk HEC',
    defaultPort: 8088,
    authType: 'bearer',
    docsUrl: 'https://docs.splunk.com/Documentation/Splunk/latest/Data/HECExamples',
  },
  elastic: {
    label: 'Elastic Stack',
    defaultPort: 9200,
    authType: 'api_key',
    docsUrl: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html',
  },
  datadog: {
    label: 'Datadog',
    defaultPort: null,
    authType: 'api_key',
    docsUrl: 'https://docs.datadoghq.com/api/latest/logs/',
  },
  sumo_logic: {
    label: 'Sumo Logic',
    defaultPort: null,
    authType: 'bearer',
    docsUrl: 'https://help.sumologic.com/docs/send-data/hosted-collectors/http-source/',
  },
  azure_sentinel: {
    label: 'Azure Sentinel',
    defaultPort: null,
    authType: 'bearer',
    docsUrl: 'https://docs.microsoft.com/en-us/azure/sentinel/',
  },
  google_chronicle: {
    label: 'Google Chronicle',
    defaultPort: null,
    authType: 'bearer',
    docsUrl: 'https://cloud.google.com/chronicle/docs',
  },
  custom_webhook: {
    label: 'Custom Webhook',
    defaultPort: null,
    authType: 'none',
    docsUrl: null,
  },
} as const

// =============================================================================
// SCHEDULED REPORT DEFAULTS
// =============================================================================

export const DEFAULT_SCHEDULED_REPORTS = [
  {
    report_name: 'Daily PII Access Summary',
    report_type: 'pii_access_review' as const,
    cron: '0 8 * * *', // 8 AM daily
    description: 'Daily summary of PII access events',
  },
  {
    report_name: 'Weekly Executive Compliance Report',
    report_type: 'weekly_executive' as const,
    cron: '0 9 * * 1', // 9 AM Monday
    description: 'High-level compliance metrics for executives',
  },
  {
    report_name: 'Monthly Compliance Archive',
    report_type: 'monthly_compliance' as const,
    cron: '0 2 1 * *', // 2 AM on 1st
    description: 'Complete monthly audit trail',
  },
  {
    report_name: 'Security Anomaly Report',
    report_type: 'anomaly_report' as const,
    cron: '0 */12 * * *', // Every 12 hours
    description: 'Automated anomaly detection results',
  },
] as const

// =============================================================================
// VALIDATION RULES
// =============================================================================

export const EXPORT_VALIDATION = {
  nameMinLength: 3,
  nameMaxLength: 200,
  descriptionMaxLength: 1000,
  maxDateRangeDays: 365,
  maxPropertyIds: 50,
  maxUserIds: 100,
  maxEntityTypes: 20,
} as const

// =============================================================================
// ERROR MESSAGES
// =============================================================================

export const AUDIT_ERROR_MESSAGES = {
  insufficient_permissions: 'You do not have permission to perform this audit operation',
  export_not_found: 'The requested audit export was not found',
  integrity_check_failed: 'Export integrity verification failed - file may be corrupted',
  max_records_exceeded: (format: string, max: number) => 
    `Export would exceed ${format} format maximum of ${max.toLocaleString()} records`,
  invalid_date_range: 'Invalid date range specified',
  property_access_denied: 'Access denied to one or more requested properties',
  retention_period_invalid: `Retention period must be between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS} days`,
} as const
