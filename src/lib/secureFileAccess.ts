import { supabase } from '@/lib/supabase'

export async function resolveDocumentUrl(documentId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (!documentId) return fallbackUrl || null

  const { data, error } = await supabase.rpc('get_secure_document_url', {
    document_id: documentId,
  })

  if (error || !data) {
    return fallbackUrl || null
  }
  return data as string
}

export async function resolveDocumentVersionUrl(versionId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (!versionId) return fallbackUrl || null

  const { data, error } = await supabase.rpc('get_secure_document_version_url', {
    p_version_id: versionId,
  })

  if (error || !data) {
    return fallbackUrl || null
  }
  return data as string
}

export async function resolveMaintenanceAttachmentUrl(attachmentId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (!attachmentId) return fallbackUrl || null

  const { data, error } = await supabase.rpc('get_secure_maintenance_attachment_url', {
    p_attachment_id: attachmentId,
  })

  if (error || !data) {
    return fallbackUrl || null
  }
  return data as string
}

export async function resolveExpenseReceiptUrl(claimId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (!claimId) return fallbackUrl || null

  const { data, error } = await supabase.rpc('get_secure_expense_receipt_url', {
    p_claim_id: claimId,
  })

  if (error || !data) {
    return fallbackUrl || null
  }
  return data as string
}

export async function resolveReportRunUrl(runId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (!runId) return fallbackUrl || null

  const { data, error } = await supabase.rpc('get_secure_report_run_url', {
    p_run_id: runId,
  })

  if (error || !data) {
    return fallbackUrl || null
  }
  return data as string
}

export function openUrlInNewTab(url: string | null) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}
