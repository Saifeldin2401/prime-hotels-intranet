/**
 * FORGE X: Enterprise Audit & Compliance Export System
 * TypeScript Type Definitions
 */

// =============================================================================
// ENUMS
// =============================================================================

export type AuditExportStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'downloaded'

export type AuditExportFormat = 'pdf' | 'excel' | 'csv' | 'json'

export type ExportAccessType = 'view' | 'download' | 'verify' | 'delete'

export type AnomalyType =
  | 'high_volume'
  | 'off_hours_access'
  | 'bulk_access_pattern'
  | 'bulk_export_download'
  | 'off_hours_export_access'
  | 'unauthorized_export_access_attempt'

export type ScheduledReportType =
  | 'daily_summary'
  | 'weekly_executive'
  | 'monthly_compliance'
  | 'quarterly_audit'
  | 'pii_access_review'
  | 'anomaly_report'
  | 'custom'

export type SIEMProvider =
  | 'splunk'
  | 'elastic'
  | 'datadog'
  | 'sumo_logic'
  | 'azure_sentinel'
  | 'google_chronicle'
  | 'custom_webhook'

// =============================================================================
// CORE INTERFACES
// =============================================================================

export interface AuditExport {
  id: string
  requested_by: string
  export_name: string
  description: string | null
  export_scope: ExportScope
  format: AuditExportFormat
  status: AuditExportStatus
  storage_path: string | null
  file_size_bytes: number | null
  file_name: string | null
  sha256_hash: string | null
  integrity_verified: boolean
  verified_at: string | null
  verified_by: string | null
  retention_until: string
  download_count: number
  last_downloaded_at: string | null
  last_downloaded_by: string | null
  record_count: number | null
  processing_started_at: string | null
  processing_completed_at: string | null
  processing_duration_ms: number | null
  error_message: string | null
  created_at: string
  updated_at: string
  // Joined fields
  requested_by_name?: string
  verified_by_name?: string
}

export interface ExportScope {
  type: 'property' | 'user' | 'date_range' | 'full' | 'pii_summary' | 'executive_summary' | 'anomaly_detection'
  property_ids?: string[]
  user_ids?: string[]
  date_from?: string
  date_to?: string
  entity_types?: string[]
  actions?: string[]
  lookback_hours?: number
}

export interface ExportTemplate {
  id: string
  template_name: string
  description: string | null
  format: AuditExportFormat
  header_config: Record<string, unknown>
  column_config: ExportColumnConfig[]
  filter_config: Record<string, unknown>
  entity_types: string[]
  required_role: string
  is_active: boolean
  is_system: boolean
}

export interface ExportColumnConfig {
  field: string
  header: string
  format: 'text' | 'datetime' | 'uuid' | 'json' | 'iso_datetime' | 'json_object'
  width?: number
}

// =============================================================================
// PII & COMPLIANCE INTERFACES
// =============================================================================

export interface PIIAccessSummary {
  access_date: string
  access_count: number
  unique_accessors: number
  top_accessed_fields: string[]
  risk_score: number
}

export interface TopPIIAccessor {
  accessor_id: string
  accessor_name: string | null
  accessor_role: string | null
  total_accesses: number
  unique_targets: number
  most_accessed_field: string
  last_accessed_at: string
}

export interface AnomalyDetection {
  anomaly_type: AnomalyType
  user_id: string
  user_name: string | null
  details: {
    access_count?: number
    unique_exports?: number
    unique_targets?: number
    date_range?: { from: string; to: string }
    access_times?: number[]
    records_accessed?: number
    time_window?: string
    avg_baseline?: number
    entities?: string[]
    denial_reasons?: string[]
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  detected_at: string
}

export interface ComplianceDashboardMetric {
  metric_name: string
  metric_value: number
  metric_details: Record<string, unknown>
}

export interface ChainOfCustodyEvent {
  event_type: 'export_created' | 'integrity_verified' | 'downloaded'
  event_at: string
  event_by: string
  event_by_name: string | null
  details: Record<string, unknown>
}

// =============================================================================
// META AUDIT INTERFACES
// =============================================================================

export interface AuditExportAccessLog {
  id: string
  export_id: string
  accessed_by: string
  accessed_at: string
  access_type: ExportAccessType
  ip_address: string | null
  user_agent: string | null
  access_granted: boolean
  denial_reason: string | null
  is_bulk_download: boolean
  related_export_ids: string[] | null
}

export interface SuspiciousActivity {
  alert_type: AnomalyType
  user_id: string
  user_name: string | null
  details: {
    download_count?: number
    unique_exports?: number
    first_download?: string
    last_download?: string
    access_count?: number
    access_times?: number[]
    attempt_count?: number
    denial_reasons?: string[]
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  detected_at: string
}

// =============================================================================
// RETENTION POLICY INTERFACES
// =============================================================================

export interface RetentionPolicy {
  id: string
  policy_name: string
  description: string | null
  default_retention_days: number
  max_retention_days: number
  min_retention_days: number
  pdf_retention_days: number | null
  excel_retention_days: number | null
  csv_retention_days: number | null
  json_retention_days: number | null
  auto_soft_delete: boolean
  auto_purge_after_days: number
  corporate_admin_retention_days: number | null
  compliance_officer_retention_days: number | null
  is_active: boolean
  is_default: boolean
}

// =============================================================================
// SCHEDULED REPORT INTERFACES
// =============================================================================

export interface ScheduledComplianceReport {
  id: string
  report_name: string
  description: string | null
  report_type: ScheduledReportType
  schedule_cron: string
  schedule_timezone: string
  last_run_at: string | null
  next_run_at: string | null
  report_scope: ExportScope
  format: AuditExportFormat
  template_name: string | null
  delivery_config: DeliveryConfig
  created_by: string
  recipient_roles: string[]
  is_active: boolean
  run_count: number
  failure_count: number
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface DeliveryConfig {
  email_recipients?: string[]
  email_subject?: string
  include_attachment?: boolean
  upload_to_storage?: boolean
  storage_folder?: string
}

export interface ScheduledReportExecution {
  id: string
  report_id: string
  started_at: string
  completed_at: string | null
  status: 'running' | 'completed' | 'failed'
  export_id: string | null
  records_exported: number | null
  file_size_bytes: number | null
  emails_sent: number
  emails_delivered: number
  emails_failed: number
  error_message: string | null
  error_details: Record<string, unknown> | null
}

// =============================================================================
// SIEM INTEGRATION INTERFACES
// =============================================================================

export interface SIEMIntegration {
  id: string
  name: string
  description: string | null
  provider: SIEMProvider
  webhook_url: string
  auth_type: 'none' | 'bearer' | 'basic' | 'api_key' | 'hmac'
  auth_config: Record<string, string>
  event_filter: SIEMEventFilter
  rate_limit_per_minute: number
  is_active: boolean
  last_success_at: string | null
  last_error_at: string | null
  last_error_message: string | null
  total_events_sent: number
  total_events_failed: number
}

export interface SIEMEventFilter {
  entity_types?: string[]
  actions?: string[]
  min_severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface SIEMEventQueue {
  id: string
  integration_id: string
  event_data: Record<string, unknown>
  status: 'pending' | 'processing' | 'sent' | 'failed'
  retry_count: number
  max_retries: number
  created_at: string
  processed_at: string | null
  next_retry_at: string | null
  error_message: string | null
}

// =============================================================================
// API RESPONSE INTERFACES
// =============================================================================

export interface CreateExportResponse {
  export_id: string | null
  status: 'pending' | 'error'
  message: string
  estimated_records: number
}

export interface IntegrityVerificationResult {
  is_valid: boolean
  message: string
  verified_at: string
  stored_hash: string | null
  computed_hash: string | null
}

export interface CleanupResult {
  deleted_count: number
  deleted_ids: string[]
  total_size_freed: number
}

// =============================================================================
// DASHBOARD INTERFACES
// =============================================================================

export interface ComplianceDashboardData {
  metrics: ComplianceDashboardMetric[]
  recentExports: AuditExport[]
  piiSummary: PIIAccessSummary[]
  anomalies: AnomalyDetection[]
  alerts: ComplianceAlert[]
}

export interface ComplianceAlert {
  alert_type: string
  severity: 'warning' | 'critical' | 'error'
  user_id: string
  user_name: string | null
  alert_data: Record<string, unknown>
  triggered_at: string
}
