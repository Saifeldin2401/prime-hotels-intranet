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

/**
 * Private-bucket helper: if `value` looks like a bare storage object path (no
 * scheme), mint a short-lived signed URL for it in the given bucket. Otherwise
 * (already a full URL) return it unchanged.
 */
async function signStoragePath(bucket: string, value: string, ttlSeconds = 300): Promise<string | null> {
  if (!/^https?:\/\//i.test(value)) {
    const { data: signed, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(value, ttlSeconds)

    if (signError || !signed?.signedUrl) {
      console.error(`signStoragePath: failed to sign storage path for bucket "${bucket}"`, signError)
      return null
    }

    return signed.signedUrl
  }

  return value
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

  const signedUrl = await signStoragePath('documents', data as string)
  return signedUrl || fallbackUrl || null
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

  const signedUrl = await signStoragePath('maintenance-attachments', data as string)
  return signedUrl || fallbackUrl || null
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

  const signedUrl = await signStoragePath('expense-receipts', data as string)
  return signedUrl || fallbackUrl || null
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

  const signedUrl = await signStoragePath('reports-exports', data as string)
  return signedUrl || fallbackUrl || null
}

export async function resolveMediaUrl(mediaAssetId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (!mediaAssetId) return fallbackUrl || null

  // SECURITY: Validate UUID format
  const sanitizedId = sanitizeUUID(mediaAssetId)
  if (!sanitizedId) {
    console.error('resolveMediaUrl: Invalid media asset ID format')
    return fallbackUrl || null
  }

  const { data, error } = await supabase.rpc('get_secure_media_url', {
    p_media_asset_id: sanitizedId,
  })

  if (error || !data) {
    if (error) {
      const e = error as RpcErrorDetails
      console.error('resolveMediaUrl: get_secure_media_url RPC failed', {
        mediaAssetId: sanitizedId,
        code: e?.code,
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
        status: e?.status,
      })
    }
    return fallbackUrl || null
  }

  const signedUrl = await signStoragePath('media', data as string)
  return signedUrl || fallbackUrl || null
}

/**
 * Training content blocks (image/audio/video/document_link) store a raw content_url
 * string directly - there's no dedicated entity ID/RPC to resolve like the other
 * helpers above. The Training Builder's upload flow (handleFileUpload) uploads every
 * file type into the private 'documents' bucket and calls getPublicUrl() on it, which
 * produces a URL that 404s for anyone, since the bucket isn't actually public. This
 * generalizes VideoPlayer's own inline bucket/path-extraction-and-resign logic (which
 * only runs reactively, after a load error) into a proactive, reusable resolver for the
 * block types that have no error-triggered recovery at all (image, audio, document
 * links) so they don't silently render/link to a URL that was never going to work.
 * External URLs (YouTube links, a document link an author pasted directly, etc.) are
 * left untouched - they never match the Supabase storage URL shape below.
 */
/**
 * Resolves a storage URL or path (bare storage path, Supabase storage URL, expired signed URL)
 * into a fresh, valid signed URL.
 */
export async function resolveStorageUrl(
  rawUrl: string | null | undefined,
  ttlSeconds = 3600,
  fallbackBucket?: string,
): Promise<string | null> {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  // 1. Check if it's a Supabase storage URL (public, sign, signed, authenticated, or s3)
  const supabaseMatch = trimmed.match(/\/storage\/v1\/object\/(?:public|sign|signed|authenticated)\/([^/]+)\/([^?#]+)/i)
    || trimmed.match(/\/storage\/v1\/s3\/([^/]+)\/([^?#]+)/i)
    || trimmed.match(/\/storage\/v1\/render\/image\/(?:public|sign|signed|authenticated)\/([^/]+)\/([^?#]+)/i)

  if (supabaseMatch) {
    const [, bucket, encodedPath] = supabaseMatch
    const path = decodeURIComponent(encodedPath)

    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds)
      if (!error && data?.signedUrl) {
        return data.signedUrl
      }
    } catch {
      // Ignore and try fallback buckets
    }

    // Try other known buckets in case the bucket name in the URL differed
    for (const altBucket of ['documents', 'media', 'content-media', 'avatars']) {
      if (altBucket === bucket) continue
      try {
        const { data: altData, error: altError } = await supabase.storage.from(altBucket).createSignedUrl(path, ttlSeconds)
        if (!altError && altData?.signedUrl) {
          return altData.signedUrl
        }
      } catch {
        // Continue
      }
    }

    return trimmed
  }

  // 2. Check if it's a bare storage path (no http/https protocol)
  if (!/^https?:\/\//i.test(trimmed)) {
    const candidateBuckets = [
      fallbackBucket,
      'documents',
      'media',
      'content-media',
      'avatars'
    ].filter((b, idx, arr): b is string => !!b && arr.indexOf(b) === idx)

    for (const b of candidateBuckets) {
      try {
        const { data, error } = await supabase.storage.from(b).createSignedUrl(trimmed, ttlSeconds)
        if (!error && data?.signedUrl) {
          return data.signedUrl
        }
      } catch {
        // Continue to next bucket
      }
    }

    // Direct authenticated download fallback to mint a local blob URL
    for (const b of candidateBuckets) {
      try {
        const { data: blob, error: downloadError } = await supabase.storage.from(b).download(trimmed)
        if (!downloadError && blob) {
          return URL.createObjectURL(blob)
        }
      } catch {
        // Continue to next bucket
      }
    }

    return null
  }

  // 3. Any other external URL (YouTube, Vimeo, external HTTPS) -- return as-is
  return trimmed
}

/**
 * Resolves all Supabase storage image/video/audio src attributes inside an HTML string
 * to valid signed URLs.
 */
export async function resolveHtmlStorageUrls(html: string | null | undefined, ttlSeconds = 3600): Promise<string> {
  if (!html || typeof html !== 'string') return ''

  // Match src="..." attributes on img, video, audio, source tags
  const srcRegex = /(<(?:img|video|audio|source)\b[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi
  const matches = Array.from(html.matchAll(srcRegex))
  if (matches.length === 0) return html

  let processed = html
  for (const match of matches) {
    const originalSrc = match[2]
    if (
      originalSrc.includes('/storage/v1/') ||
      !/^https?:\/\//i.test(originalSrc) ||
      originalSrc.includes('.supabase.co')
    ) {
      const resolved = await resolveStorageUrl(originalSrc, ttlSeconds)
      if (resolved && resolved !== originalSrc) {
        processed = processed.replace(match[0], `${match[1]}${resolved}${match[3]}`)
      }
    }
  }

  return processed
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
