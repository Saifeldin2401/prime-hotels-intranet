/**
 * SECURE FILE ACCESS MODULE
 * 
 * This module provides secure access to files with explicit permission checks
 * to prevent IDOR (Insecure Direct Object Reference) vulnerabilities.
 */

import { supabase } from '@/lib/supabase'
import { sanitizeUUID } from '@/lib/utils'

type RpcErrorDetails = {
  code?: string
  message?: string
  details?: string
  hint?: string
  status?: number
}

/**
 * Validate document access permissions before generating URL
 * This provides defense-in-depth against IDOR attacks
 */
async function validateDocumentAccess(documentId: string): Promise<boolean> {
  const sanitizedId = sanitizeUUID(documentId)
  if (!sanitizedId) return false
  
  try {
    // Use the database function to validate access
    const { data, error } = await supabase.rpc('validate_document_access', {
      p_document_id: sanitizedId
    })
    
    if (error) {
      console.error('validateDocumentAccess error:', error)
      return false
    }
    
    return data === true
  } catch (e) {
    console.error('validateDocumentAccess exception:', e)
    return false
  }
}

/**
 * Log file access for audit purposes
 */
async function logFileAccess(
  fileType: string,
  fileId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.rpc('log_security_event', {
      p_event_type: 'file_access',
      p_metadata: {
        file_type: fileType,
        file_id: fileId,
        success,
        error_message: errorMessage
      },
      p_severity: success ? 'info' : 'warning'
    })
  } catch (e) {
    // Silent fail - don't break file access for logging
    console.error('Failed to log file access:', e)
  }
}

export async function resolveDocumentUrl(documentId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (!documentId) return fallbackUrl || null
  
  // SECURITY: Validate UUID format
  const sanitizedId = sanitizeUUID(documentId)
  if (!sanitizedId) {
    console.error('resolveDocumentUrl: Invalid document ID format')
    await logFileAccess('document', documentId, false, 'Invalid document ID format')
    return fallbackUrl || null
  }

  // SECURITY: Explicit permission check before generating URL
  const hasAccess = await validateDocumentAccess(sanitizedId)
  if (!hasAccess) {
    console.error('resolveDocumentUrl: Access denied for document:', sanitizedId)
    await logFileAccess('document', sanitizedId, false, 'Access denied')
    return fallbackUrl || null
  }

  const { data, error } = await supabase.rpc('get_secure_document_url', {
    document_id: sanitizedId,
  })

  if (error || !data) {
    if (error) {
      const e = error as RpcErrorDetails
      console.error('resolveDocumentUrl: get_secure_document_url RPC failed', {
        documentId: sanitizedId,
        code: e?.code,
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
        status: e?.status,
      })
      await logFileAccess('document', sanitizedId, false, e?.message)
    }
    return fallbackUrl || null
  }

  const value = data as string

  // The 'documents' storage bucket is private -- a bare object path (no scheme) means
  // the RPC resolved it to our own bucket, so mint a short-lived signed URL for it.
  if (!/^https?:\/\//i.test(value)) {
    const { data: signed, error: signError } = await supabase.storage
      .from('documents')
      .createSignedUrl(value, 300)

    if (signError || !signed?.signedUrl) {
      console.error('resolveDocumentUrl: failed to sign storage path', signError)
      await logFileAccess('document', sanitizedId, false, signError?.message)
      return fallbackUrl || null
    }

    await logFileAccess('document', sanitizedId, true)
    return signed.signedUrl
  }

  await logFileAccess('document', sanitizedId, true)
  return value
}

export async function resolveDocumentVersionUrl(versionId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (!versionId) return fallbackUrl || null
  
  // SECURITY: Validate UUID format
  const sanitizedId = sanitizeUUID(versionId)
  if (!sanitizedId) {
    console.error('resolveDocumentVersionUrl: Invalid version ID format')
    return fallbackUrl || null
  }

  const { data, error } = await supabase.rpc('get_secure_document_version_url', {
    p_version_id: sanitizedId,
  })

  if (error || !data) {
    if (error) {
      const e = error as RpcErrorDetails
      console.error('resolveDocumentVersionUrl: get_secure_document_version_url RPC failed', {
        versionId: sanitizedId,
        code: e?.code,
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
        status: e?.status,
      })
    }
    return fallbackUrl || null
  }
  return data as string
}

export async function resolveMaintenanceAttachmentUrl(attachmentId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (!attachmentId) return fallbackUrl || null
  
  // SECURITY: Validate UUID format
  const sanitizedId = sanitizeUUID(attachmentId)
  if (!sanitizedId) {
    console.error('resolveMaintenanceAttachmentUrl: Invalid attachment ID format')
    return fallbackUrl || null
  }

  const { data, error } = await supabase.rpc('get_secure_maintenance_attachment_url', {
    p_attachment_id: sanitizedId,
  })

  if (error || !data) {
    return fallbackUrl || null
  }
  return data as string
}

export async function resolveExpenseReceiptUrl(claimId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (!claimId) return fallbackUrl || null
  
  // SECURITY: Validate UUID format
  const sanitizedId = sanitizeUUID(claimId)
  if (!sanitizedId) {
    console.error('resolveExpenseReceiptUrl: Invalid claim ID format')
    return fallbackUrl || null
  }

  const { data, error } = await supabase.rpc('get_secure_expense_receipt_url', {
    p_claim_id: sanitizedId,
  })

  if (error || !data) {
    return fallbackUrl || null
  }
  return data as string
}

export async function resolveReportRunUrl(runId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (!runId) return fallbackUrl || null
  
  // SECURITY: Validate UUID format
  const sanitizedId = sanitizeUUID(runId)
  if (!sanitizedId) {
    console.error('resolveReportRunUrl: Invalid run ID format')
    return fallbackUrl || null
  }

  const { data, error } = await supabase.rpc('get_secure_report_run_url', {
    p_run_id: sanitizedId,
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

/**
 * SECURITY: Safe file download with access logging
 */
export async function downloadDocument(documentId: string, filename?: string): Promise<boolean> {
  if (!documentId) return false
  
  // Validate and get URL
  const url = await resolveDocumentUrl(documentId)
  if (!url) return false
  
  try {
    // Create temporary link for download
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'document'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Log download
    await logFileAccess('document_download', documentId, true)
    return true
  } catch (e) {
    console.error('downloadDocument error:', e)
    await logFileAccess('document_download', documentId, false, String(e))
    return false
  }
}
