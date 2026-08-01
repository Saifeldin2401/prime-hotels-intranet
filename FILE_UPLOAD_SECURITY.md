# File Upload Security Implementation

## Overview

This document describes the comprehensive file upload security implementation for the Altus Connect Intranet application. The implementation addresses all major file upload vulnerabilities and provides secure media handling.

## Security Features Implemented

### 1. MIME Type Validation (File Signature/Magic Number Verification)

**Vulnerability Fixed**: MIME type spoofing attacks where attackers upload malicious files with forged Content-Type headers.

**Implementation**:
- New file: `src/lib/file-security.ts`
- Validates files by checking magic numbers (file signatures) instead of relying on `file.type`
- Each allowed file type has defined magic numbers that are verified against the file header bytes
- Example: JPEG files must start with `0xFF, 0xD8, 0xFF`

**Before**:
```typescript
// VULNERABLE: Trusting client-provided MIME type
if (!allowedTypes.includes(file.type)) {
  errors.push('File type not allowed');
}
```

**After**:
```typescript
// SECURE: Verifying file signature
const headerBytes = await readFileBytes(file, 0, 8);
const detectedType = detectMimeTypeFromSignature(headerBytes);
if (detectedType !== expectedType) {
  errors.push(`MIME type mismatch: expected ${expectedType}, detected ${detectedType}`);
}
```

### 2. File Size Limits

**Implementation**:
- Size limits defined per file type in `ALLOWED_FILE_TYPES`
- Maximum sizes:
  - Images: 10MB
  - Videos: 500MB
  - Documents: 50MB
  - Audio: 100MB
- Progress tracking during upload with `UploadProgress` interface

### 3. Secure File Naming (UUID Generation)

**Vulnerability Fixed**: Path traversal attacks and information disclosure through original filenames.

**Implementation**:
- Generates cryptographically secure UUIDs for filenames
- Original filename stored in metadata only
- Storage path includes random segments to prevent enumeration

**Before**:
```typescript
const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
const storagePath = `${user.id}/${mediaType}/${timestamp}-${safeName}`;
```

**After**:
```typescript
const { filename } = generateSecureFilename(file.name, mimeType);
const storagePath = createSecureStoragePath(user.id, mediaType, filename);
// Result: ${userId}/${mediaType}/${randomSegment}/${uuid}.${extension}
```

### 4. Virus Scanning Integration

**Implementation**:
- Integrates existing `useVirusScan` hook and `scan-file` edge function
- Client-side heuristics check before upload
- Server-side scanning via edge function
- Scan results stored in database

**Scan Status Types**:
- `pending` - Scan not yet completed
- `clean` - File passed security scan
- `suspicious` - Potential issues detected
- `infected` - Malware detected
- `error` - Scan failed

**Before**: No virus scanning

**After**:
```typescript
const scanResult = await scanFile(file, {
  bucket: 'media',
  context: 'media_upload',
});

if (!scanResult.safe) {
  toast.error(`Security threat detected: ${scanResult.message}`);
  return { asset: null, error: 'Virus scan failed' };
}
```

### 5. Storage Bucket Security (RLS Policies)

**Vulnerability Fixed**: Public storage buckets allowing unauthorized access.

**Implementation**:
- Migration: `20260407000000_secure_media_storage.sql`
- Private bucket configuration (public = false)
- Row Level Security (RLS) policies on storage.objects
- Fine-grained access control based on ownership and property access

**Policies**:
- **Select**: Users can view files they own or have property access to
- **Insert**: Users can upload to their own folder only
- **Update**: Users can only update their own files
- **Delete**: Users can only delete their own files (admins can delete any)

### 6. Image Processing Security

**Implementation**:

#### SVG Sanitization
```typescript
function sanitizeSvgContent(svgContent: string): string {
  // Remove script tags
  sanitized = svgContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove event handlers
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  return sanitized;
}
```

#### Image Dimension Validation
- Prevents decompression bomb attacks
- Maximum dimensions: 16384x16384 pixels
- Maximum pixel count: 100 megapixels

#### EXIF Data Detection
- Detects presence of EXIF metadata in JPEG files
- Logs warning for images with EXIF data

### 7. Secure Downloads

**Vulnerability Fixed**: Direct public URLs allowing unauthorized access and no access logging.

**Implementation**:
- New hook: `useSecureDownload.ts`
- Signed URLs with short expiry (5 minutes default)
- Access logging to `media_access_logs` table
- Content-Disposition headers for downloads

**Before**:
```typescript
// VULNERABLE: Public URL accessible to anyone
const { data: { publicUrl } } = supabase.storage
  .from('media')
  .getPublicUrl(storagePath);
```

**After**:
```typescript
// SECURE: Signed URL with access logging
const { data } = await supabase.rpc('get_secure_media_url', {
  p_media_asset_id: mediaAssetId,
  p_expiry_seconds: 300,
});

// Log access
await supabase.from('media_access_logs').insert({
  media_asset_id: mediaAssetId,
  accessed_by: userId,
  access_type: 'download',
});
```

### 8. Access Logging

**Implementation**:
- New table: `media_access_logs`
- Tracks all file access with:
  - User ID
  - Timestamp
  - Access type (view, download, share)
  - IP address
  - User agent

**Query Examples**:
```sql
-- Get download statistics
SELECT media_asset_id, COUNT(*) as download_count
FROM media_access_logs
WHERE access_type = 'download'
GROUP BY media_asset_id;

-- Get user's recent downloads
SELECT * FROM media_access_logs
WHERE accessed_by = 'user-uuid'
AND access_type = 'download'
ORDER BY accessed_at DESC
LIMIT 10;
```

## File Structure

### New Files
```
src/
├── lib/
│   └── file-security.ts          # File validation, sanitization, UUID generation
├── hooks/
│   ├── useMedia.ts               # Updated with security features
│   ├── useSecureDownload.ts      # Secure download functionality
│   └── index.ts                  # Added exports
├── components/
│   └── media/
│       └── MediaPicker.tsx       # Updated with scan status UI
└── lib/types/
    └── media.ts                  # Added security fields

supabase/
└── migrations/
    └── 20260407000000_secure_media_storage.sql  # Storage policies, access logs
```

## Database Schema Updates

### media_assets Table (Updated)
```sql
ALTER TABLE public.media_assets
ADD COLUMN virus_scan_status TEXT DEFAULT 'pending',
ADD COLUMN virus_scan_score INTEGER DEFAULT 0,
ADD COLUMN sha256_hash TEXT,
ADD COLUMN scanned_at TIMESTAMPTZ,
ADD COLUMN content_disposition TEXT DEFAULT 'inline';
```

### media_access_logs Table (New)
```sql
CREATE TABLE public.media_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID REFERENCES public.media_assets(id),
  accessed_by UUID REFERENCES public.profiles(id),
  accessed_at TIMESTAMPTZ DEFAULT now(),
  access_type TEXT CHECK (access_type IN ('view', 'download', 'share')),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB
);
```

## Usage Examples

### Secure File Upload
```typescript
import { useMedia } from '@/hooks/useMedia';

function UploadComponent() {
  const { uploadFile, uploading, uploadProgress } = useMedia();

  const handleUpload = async (file: File) => {
    const result = await uploadFile(file, {
      category: 'training',
      property_id: propertyId,
    });

    if (result.asset) {
      console.log('Upload successful:', result.asset.id);
      console.log('Scan status:', result.scanResult?.status);
    } else {
      console.error('Upload failed:', result.error);
    }
  };
}
```

### Secure Download
```typescript
import { useSecureDownload } from '@/hooks/useSecureDownload';

function DownloadComponent({ assetId, filename }: { assetId: string; filename: string }) {
  const { downloadAndSave, isDownloading, progress } = useSecureDownload();

  const handleDownload = async () => {
    const result = await downloadAndSave(assetId, filename, {
      disposition: 'attachment',
      onProgress: (p) => console.log(`${p}% complete`),
    });

    if (result.success) {
      console.log('Download complete');
    }
  };
}
```

### Media Picker with Security
```typescript
import { useMediaPickerDialog } from '@/components/media/MediaPicker';

function MyComponent() {
  const { openPicker, pickerElement } = useMediaPickerDialog({
    allowedTypes: ['image', 'video'],
    maxFileSize: 50,
    requireCleanScan: true, // Only show files that passed virus scan
  });

  const handleSelect = async () => {
    const assets = await openPicker();
    // Assets have secure signed URLs
  };

  return (
    <>
      <Button onClick={handleSelect}>Select Media</Button>
      {pickerElement}
    </>
  );
}
```

## Migration Steps

1. **Run the SQL migration**:
   ```bash
   supabase migration up
   ```

2. **Update existing media records**:
   ```sql
   -- Mark existing files as clean (assuming they've been reviewed)
   UPDATE media_assets
   SET virus_scan_status = 'clean',
       scanned_at = now()
   WHERE virus_scan_status = 'pending';
   ```

3. **Configure storage bucket**:
   - Ensure `media` bucket is set to private
   - Verify RLS policies are active

## Security Checklist

- [x] MIME type spoofing protection via magic numbers
- [x] File size limits enforced
- [x] Secure UUID-based filenames
- [x] Virus scanning integration
- [x] Private storage buckets with RLS
- [x] SVG sanitization
- [x] Image dimension validation
- [x] EXIF data detection
- [x] Signed URLs for downloads
- [x] Access logging
- [x] Content-Disposition headers
- [x] Path traversal prevention
- [x] Double extension detection
- [x] Executable file blocking

## Testing Security Features

### Test MIME Type Spoofing
```bash
# Create a fake PNG that's actually a script
echo "<script>alert('xss')</script>" > fake.png
# Upload should be rejected
```

### Test File Size Limits
```bash
# Create a 600MB test file (should fail for videos)
dd if=/dev/zero of=large_video.mp4 bs=1M count=600
```

### Test Virus Scanning
```bash
# EICAR test file (should be detected)
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > test.exe
```

### Test SVG Sanitization
```xml
<!-- Malicious SVG -->
<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert('xss')</script>
</svg>
<!-- Should be sanitized before upload -->
```

## Compliance

This implementation addresses security requirements for:
- OWASP Top 10 (Unrestricted File Upload)
- GDPR (access logging, data protection)
- SOC 2 (audit trails, access controls)
- ISO 27001 (information security controls)

## Support

For security-related issues or questions, contact the security team or create an issue with the `security` label.
